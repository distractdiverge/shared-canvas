-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(20) NOT NULL,
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL,
  selected_color VARCHAR(7) NOT NULL,
  last_session_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on fingerprint for fast lookups
CREATE INDEX idx_fingerprint ON users(fingerprint_hash);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on sessions
CREATE INDEX idx_user_sessions ON sessions(user_id, started_at DESC);
CREATE INDEX idx_expiry ON sessions(expiry_date);

-- Create strokes table
CREATE TABLE strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('draw', 'text')),
  points JSONB,
  color VARCHAR(7) NOT NULL,
  text TEXT,
  position JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on strokes
CREATE INDEX idx_session_strokes ON strokes(session_id);
CREATE INDEX idx_created_at ON strokes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strokes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is an open whiteboard)
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can be created by anyone" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own record" ON users FOR UPDATE USING (true);

CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
CREATE POLICY "Sessions can be created by anyone" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions can be updated by anyone" ON sessions FOR UPDATE USING (true);

CREATE POLICY "Strokes are viewable by everyone" ON strokes FOR SELECT USING (true);
CREATE POLICY "Strokes can be created by anyone" ON strokes FOR INSERT WITH CHECK (true);

-- Enable realtime for strokes table
ALTER PUBLICATION supabase_realtime ADD TABLE strokes;
