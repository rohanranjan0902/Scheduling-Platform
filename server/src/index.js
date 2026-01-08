import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import pool from './pgClient.js';

import eventTypesRouter from './routes/eventTypes.js';
import availabilityRouter from './routes/availability.js';
import { bookingsRouter, publicRouter } from './routes/bookings.js';

dotenv.config();
dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

app.use('/api/event-types', eventTypesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/public', publicRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
