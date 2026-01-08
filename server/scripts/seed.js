import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import pool from '../src/pgClient.js';

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);


const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql')).toString();
    await client.query(schemaSql);

    // Ensure default user exists
    const userTz = process.env.DEFAULT_TIMEZONE || 'UTC';
    const userResult = await client.query(
      `INSERT INTO users (id, name, timezone)
       VALUES (1, 'Default User', $1)
       ON CONFLICT (id) DO UPDATE SET timezone = EXCLUDED.timezone
       RETURNING id`,
      [userTz]
    );
    const userId = userResult.rows[0].id;

    // Seed event types
    const eventTypes = [
      {
        title: '30 min Meeting',
        description: 'Quick intro or catch-up call.',
        duration_minutes: 30,
        slug: '30min'
      },
      {
        title: '60 min Deep Dive',
        description: 'Longer session for detailed discussions.',
        duration_minutes: 60,
        slug: '60min'
      }
    ];

    for (const et of eventTypes) {
      await client.query(
        `INSERT INTO event_types (user_id, title, description, duration_minutes, slug)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [userId, et.title, et.description, et.duration_minutes, et.slug]
      );
    }

    // Clear and add default weekly availability: Mon-Fri 09:00-17:00
    await client.query('DELETE FROM availability_rules WHERE user_id = $1', [userId]);
    const days = [1, 2, 3, 4, 5]; // Mon-Fri
    for (const d of days) {
      await client.query(
        `INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [userId, d, '09:00', '17:00']
      );
    }

    // Sample bookings: one in future and one in past for first event type
    const { rows: etRows } = await client.query(
      'SELECT id, duration_minutes FROM event_types ORDER BY id LIMIT 1'
    );
    if (etRows.length) {
      const et = etRows[0];
      const baseDate = dayjs().add(1, 'day').hour(10).minute(0).second(0).millisecond(0);
      const startFuture = baseDate.toDate();
      const endFuture = baseDate.add(et.duration_minutes, 'minute').toDate();

      await client.query(
        `INSERT INTO bookings (event_type_id, user_id, booker_name, booker_email, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
         ON CONFLICT DO NOTHING`,
        [et.id, userId, 'Future Booker', 'future@example.com', startFuture, endFuture]
      );

      const pastDate = dayjs().subtract(2, 'day').hour(15).minute(0).second(0).millisecond(0);
      const startPast = pastDate.toDate();
      const endPast = pastDate.add(et.duration_minutes, 'minute').toDate();
      await client.query(
        `INSERT INTO bookings (event_type_id, user_id, booker_name, booker_email, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
         ON CONFLICT DO NOTHING`,
        [et.id, userId, 'Past Booker', 'past@example.com', startPast, endPast]
      );
    }

    await client.query('COMMIT');
    console.log('Database schema created and sample data seeded.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
