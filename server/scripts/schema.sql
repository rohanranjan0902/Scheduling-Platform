-- Database schema for CalScheduler

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent double booking of the exact same slot for confirmed bookings
CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_slot
ON bookings (event_type_id, start_time)
WHERE status = 'confirmed';
