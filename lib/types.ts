// Database types
export interface User {
  id: string;
  display_name: string;
  fingerprint_hash: string;
  selected_color: string;
  last_session_end: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  expiry_date: string;
  created_at: string;
}

export interface Stroke {
  id: string;
  user_id: string;
  session_id: string;
  type: 'draw' | 'text';
  points?: Point[];
  color: string;
  text?: string;
  position?: Point;
  created_at: string;
}

export interface Point {
  x: number;
  y: number;
}

// UI types
export interface CursorPosition {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface DrawingStroke {
  points: Point[];
  color: string;
  userId: string;
}

export interface TextElement {
  text: string;
  position: Point;
  color: string;
  userId: string;
}
