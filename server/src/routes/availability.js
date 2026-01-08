import express from 'express';
import { pool } from '../pgClient.js';

const router = express.Router();

// Get availability for default user (id = 1)
router.get('/', async (req, res) => {
  try {
    const userId = 1;
    const [rules, overrides, user] = await Promise.all([
      pool.query('SELECT * FROM availability_rules WHERE user_id = $1 ORDER BY day_of_week', [userId]),
      pool.query('SELECT * FROM availability_overrides WHERE user_id = $1 ORDER BY date', [userId]),
      pool.query('SELECT timezone FROM users WHERE id = $1', [userId])
    ]);
    res.json({
      timezone: user.rows[0]?.timezone || 'UTC',
      rules: rules.rows,
      overrides: overrides.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Replace weekly rules (simple admin UX)
router.post('/rules', async (req, res) => {
  const { rules, timezone } = req.body;
  const client = await pool.connect();
  try {
    const userId = 1;
    await client.query('BEGIN');

    if (timezone) {
      await client.query('UPDATE users SET timezone = $1 WHERE id = $2', [timezone, userId]);
    }

    await client.query('DELETE FROM availability_rules WHERE user_id = $1', [userId]);

    for (const rule of rules || []) {
      await client.query(
        'INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [userId, rule.day_of_week, rule.start_time, rule.end_time]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save availability rules' });
  } finally {
    client.release();
  }
});

export default router;
