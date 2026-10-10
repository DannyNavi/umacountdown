CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  place TEXT NOT NULL,
  note TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS pins_created_at ON pins (created_at DESC);
