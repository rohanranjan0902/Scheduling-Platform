import express from 'express';
import { pool } from '../pgClient.js';

const router = express.Router();

// List all event types
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM event_types ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// Get single event type by slug (for public booking page)
router.get('/slug/:slug', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM event_types WHERE slug = $1', [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event type not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event type' });
  }
});

// Create event type
router.post('/', async (req, res) => {
  const { title, description, duration_minutes, slug } = req.body;
  if (!title || !duration_minutes || !slug) {
    return res.status(400).json({ error: 'title, duration_minutes and slug are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO event_types (title, description, duration_minutes, slug) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || '', duration_minutes, slug]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Slug must be unique' });
    }
    res.status(500).json({ error: 'Failed to create event type' });
  }
});

// Update event type
router.put('/:id', async (req, res) => {
  const { title, description, duration_minutes, slug } = req.body;
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE event_types SET title = $1, description = $2, duration_minutes = $3, slug = $4 WHERE id = $5 RETURNING *',
      [title, description || '', duration_minutes, slug, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event type not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Slug must be unique' });
    }
    res.status(500).json({ error: 'Failed to update event type' });
  }
});

// Delete event type
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM bookings WHERE event_type_id = $1', [id]);
    const result = await pool.query('DELETE FROM event_types WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event type not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
});

export default router;
