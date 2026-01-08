import express from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { pool } from '../pgClient.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const bookingsRouter = express.Router();
const publicRouter = express.Router();

// Helper: get default user timezone
async function getUserTimezone(client, userId = 1) {
  const result = await client.query('SELECT timezone FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.timezone || 'UTC';
}

// --- Admin bookings routes (/api/bookings) ---

// List bookings: upcoming or past
bookingsRouter.get('/', async (req, res) => {
  const scope = req.query.scope || 'upcoming';
  try {
    let query = 'SELECT b.*, e.title AS event_title, e.slug AS event_slug FROM bookings b JOIN event_types e ON b.event_type_id = e.id WHERE b.status = \'confirmed\'';
    if (scope === 'past') {
      query += ' AND b.end_time < NOW() ORDER BY b.start_time DESC';
    } else {
      query += ' AND b.end_time >= NOW() ORDER BY b.start_time ASC';
    }
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Cancel a booking
bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE bookings SET status = \'cancelled\' WHERE id = $1 AND status = \'confirmed\' RETURNING *',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// --- Public booking routes (/api/public) ---

// Get public event type details
publicRouter.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM event_types WHERE slug = $1', [slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event type not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event type' });
  }
});

// Get available time slots for a given date
publicRouter.get('/:slug/availability', async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query; // YYYY-MM-DD in user's local timezone

  if (!date) {
    return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  }

  const client = await pool.connect();
  try {
    const etResult = await client.query('SELECT * FROM event_types WHERE slug = $1', [slug]);
    if (!etResult.rows.length) return res.status(404).json({ error: 'Event type not found' });
    const eventType = etResult.rows[0];

    const userId = eventType.user_id;
    const userTz = await getUserTimezone(client, userId);

    const weekday = dayjs.tz(date, userTz).day();

    // Weekly rules for that weekday
    const { rows: rules } = await client.query(
      'SELECT * FROM availability_rules WHERE user_id = $1 AND day_of_week = $2 ORDER BY start_time',
      [userId, weekday]
    );

    if (!rules.length) {
      return res.json({ slots: [] });
    }

    // Overrides for the specific date
    const { rows: overrides } = await client.query(
      'SELECT * FROM availability_overrides WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (overrides.length && overrides[0].is_blocked) {
      return res.json({ slots: [] });
    }

    const duration = eventType.duration_minutes;
    const slots = [];

    for (const rule of rules) {
      const start = dayjs.tz(`${date}T${rule.start_time}`, userTz);
      const end = dayjs.tz(`${date}T${rule.end_time}`, userTz);

      let cursor = start;
      while (cursor.add(duration, 'minute').isSameOrBefore(end)) {
        const slotStart = cursor;
        const slotEnd = cursor.add(duration, 'minute');

        // Check for conflicts in UTC
        const { rows: conflicts } = await client.query(
          `SELECT 1 FROM bookings
           WHERE event_type_id = $1
             AND status = 'confirmed'
             AND NOT ($3 <= start_time OR $2 >= end_time)`,
          [eventType.id, slotStart.toDate(), slotEnd.toDate()]
        );

        if (!conflicts.length) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }

        cursor = cursor.add(duration, 'minute');
      }
    }

    res.json({ slots, timezone: userTz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute availability' });
  } finally {
    client.release();
  }
});

// Create booking for a given event type and slot
publicRouter.post('/:slug/book', async (req, res) => {
  const { slug } = req.params;
  const { start, name, email } = req.body; // start is ISO string

  if (!start || !name || !email) {
    return res.status(400).json({ error: 'start, name and email are required' });
  }

  const client = await pool.connect();
  try {
    const etResult = await client.query('SELECT * FROM event_types WHERE slug = $1', [slug]);
    if (!etResult.rows.length) return res.status(404).json({ error: 'Event type not found' });
    const eventType = etResult.rows[0];

    const userId = eventType.user_id;
    const userTz = await getUserTimezone(client, userId);

    const startTime = dayjs(start).tz(userTz).toDate();
    const endTime = dayjs(start).tz(userTz).add(eventType.duration_minutes, 'minute').toDate();

    await client.query('BEGIN');

    // Check for conflicts
    const { rows: conflicts } = await client.query(
      `SELECT 1 FROM bookings
       WHERE event_type_id = $1
         AND status = 'confirmed'
         AND NOT ($3 <= start_time OR $2 >= end_time)
       LIMIT 1`,
      [eventType.id, startTime, endTime]
    );

    if (conflicts.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    const insertResult = await client.query(
      `INSERT INTO bookings (event_type_id, user_id, booker_name, booker_email, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       RETURNING *`,
      [eventType.id, userId, name, email, startTime, endTime]
    );

    await client.query('COMMIT');

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

export { bookingsRouter, publicRouter };
