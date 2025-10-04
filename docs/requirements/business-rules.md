# Business Rules

## 2. Business Rules

### **BR-001: User Identity via Fingerprinting**
- **Description**: Users are uniquely identified by a combination of display name, IP address, and user agent string, hashed using SHA-256. This creates a "soft" authentication system that doesn't require passwords.
- **Trigger**: When a user attempts to register (POST /api/user/register)
- **Business Logic**:
  - Fingerprint hash = SHA-256(displayName:ipAddress:userAgent)
  - If hash exists in database, retrieve existing user
  - If user exists but color changed, update color preference
  - If hash is new, create new user record
- **Implementation**:
  - File: `lib/fingerprint.ts`, lines 5-17 - generateFingerprint() function
  - File: `app/api/user/register/route.ts`, lines 30-42 - Fingerprint lookup and user retrieval
- **Implications**:
  - Users changing browsers/devices will be treated as new users
  - Users on different networks (different IP) might be treated as new users
  - No way to "log out" or switch identities without clearing browser data

---

### **BR-002: Display Name Length Constraint**
- **Description**: User display names must be 20 characters or fewer to ensure UI consistency and prevent abuse.
- **Trigger**: User registration (POST /api/user/register)
- **Business Logic**:
  - Validate displayName.length <= 20
  - Return 400 error if validation fails
  - Database enforces VARCHAR(20) constraint
- **Implementation**:
  - File: `lib/constants.ts`, line 27 - MAX_NAME_LENGTH = 20
  - File: `app/api/user/register/route.ts`, lines 23-28 - Validation check
  - File: `supabase/migrations/001_initial_schema.sql`, line 4 - Database column type
- **Rationale**: Prevents UI overflow in cursor labels and user info bar

---

### **BR-003: 7-Day Content Retention**
- **Description**: All canvas content expires 7 days after the session ends. This ensures storage costs remain manageable and the canvas doesn't become cluttered with old content.
- **Trigger**: Session end event and scheduled cleanup job
- **Business Logic**:
  - When session ends: expiry_date = session.ended_at + 7 days
  - When new session starts: extend previous session expiry by 7 days from now
  - Cleanup job: delete sessions where expiry_date < current_date
  - Strokes cascade delete when session is deleted
- **Implementation**:
  - File: `lib/constants.ts`, line 22 - EXPIRY_DAYS = 7
  - File: `app/api/session/end/route.ts`, lines 21-30 - Sets expiry date
  - File: `app/api/session/start/route.ts`, lines 30-39 - Extends previous session expiry
  - File: `supabase/functions/cleanup-expired-content/index.ts`, lines 14-45 - Cleanup logic
  - File: `supabase/migrations/001_initial_schema.sql`, line 32 - ON DELETE CASCADE for strokes
- **Rationale**: Balances user value (content persists for reasonable time) with operational costs

---

### **BR-004: Session Expiry Extension on Return**
- **Description**: When a user returns and starts a new session, their previous session's content expiry is extended by 7 days from the current date. This rewards active users by keeping their content alive longer.
- **Trigger**: New session start (POST /api/session/start)
- **Business Logic**:
  - Query for user's most recent session (ORDER BY started_at DESC LIMIT 1)
  - If found, update expiry_date = NOW() + 7 days
  - Then create new session with expiry_date = NOW() + 7 days
- **Implementation**:
  - File: `app/api/session/start/route.ts`, lines 21-39
- **Rationale**: Prevents active users from losing their work; incentivizes return visits

---

### **BR-005: Public Canvas Access**
- **Description**: The canvas is completely public - no authentication required, all users can view all content, and Row Level Security policies allow unrestricted access.
- **Trigger**: All database operations
- **Business Logic**:
  - All SELECT queries return data for all users
  - All INSERT queries succeed for any user
  - UPDATE allowed on any record (though app logic only updates own user record)
  - No DELETE policies defined (only server-side cleanup can delete)
- **Implementation**:
  - File: `supabase/migrations/001_initial_schema.sql`, lines 45-60 - RLS policies
  - Policies use `USING (true)` and `WITH CHECK (true)` for universal access
- **Rationale**: Designed as open collaboration space; no private workspaces or permissions

---

### **BR-006: Color Palette Restriction**
- **Description**: Users can only select from 12 predefined colors. This ensures visual consistency and prevents illegible colors (e.g., white on white).
- **Trigger**: User registration/color selection (frontend enforcement)
- **Business Logic**:
  - Frontend presents fixed palette of 12 colors
  - No validation on backend (accepts any color string)
  - Colors stored as hex codes (VARCHAR(7) format: #RRGGBB)
- **Implementation**:
  - File: `lib/constants.ts`, lines 4-17 - COLOR_PALETTE array
  - File: `components/NameEntryModal.tsx` - Likely presents these colors (not read in full)
  - File: `supabase/migrations/001_initial_schema.sql`, line 6 - VARCHAR(7) for hex storage
- **Gap**: Backend doesn't validate color is from allowed palette - frontend-only enforcement

---

### **BR-007: Stroke Type Validation**
- **Description**: Only two stroke types are allowed: 'draw' (freehand strokes with points) and 'text' (text annotations with position).
- **Trigger**: Stroke creation (POST /api/stroke)
- **Business Logic**:
  - type must be 'draw' or 'text'
  - If type='draw': points array is required
  - If type='text': text string and position object are required
  - Database CHECK constraint enforces type values
- **Implementation**:
  - File: `app/api/stroke/route.ts`, lines 24-37 - API validation
  - File: `supabase/migrations/001_initial_schema.sql`, line 33 - CHECK constraint
  - File: `lib/types.ts`, line 24 - TypeScript enum
- **Rationale**: Prevents invalid stroke data; extensible for future types (e.g., 'shape', 'image')

---

### **BR-008: Cursor Update Throttling**
- **Description**: Cursor position broadcasts are throttled to maximum 10 updates per second (100ms) to prevent network flooding.
- **Trigger**: Mouse/pointer movement on canvas
- **Business Logic**:
  - Track timestamp of last cursor update
  - If current_time - last_update < 100ms, skip broadcast
  - Otherwise, broadcast cursor position and update timestamp
- **Implementation**:
  - File: `lib/constants.ts`, line 32 - CURSOR_UPDATE_THROTTLE_MS = 100
  - File: `hooks/useRealtime.ts`, lines 203-227 - Throttling logic in sendCursorPosition
  - File: `lib/supabase.ts`, lines 12-17 - Supabase client configured with eventsPerSecond: 10
- **Rationale**: Balances real-time feeling with network efficiency and Supabase rate limits

---

### **BR-009: Cursor Expiry After Inactivity**
- **Description**: Other users' cursors disappear after 3 seconds of inactivity to avoid cluttering the UI with stale cursor positions.
- **Trigger**: Cursor position broadcast received
- **Business Logic**:
  - When cursor update received, set 3-second timeout
  - After timeout, check if timestamp is older than 3 seconds
  - If older, remove cursor from display
- **Implementation**:
  - File: `hooks/useRealtime.ts`, lines 117-127 - setTimeout cleanup after 3000ms
- **Rationale**: Handles users who move cursor away, minimize window, or lose connection without explicit "leave" event

---

### **BR-010: Session Persistence Across Refreshes**
- **Description**: User sessions persist across page refreshes using sessionStorage, avoiding re-registration on every page load.
- **Trigger**: Page load/refresh
- **Business Logic**:
  - On session start, store sessionId, userId, userName, userColor in sessionStorage
  - On page load, check sessionStorage for existing session data
  - If found, restore user and session state without API call
  - Session data cleared only on explicit session end or tab close
- **Implementation**:
  - File: `hooks/useSession.ts`, lines 77-81 - Store to sessionStorage
  - File: `hooks/useSession.ts`, lines 125-151 - Restore from sessionStorage on mount
  - File: `hooks/useSession.ts`, lines 109-113 - Clear sessionStorage on end
- **Rationale**: Improves UX by not requiring re-entry of name/color; sessionStorage (not localStorage) ensures session ends when browser closes

---

### **BR-011: Cascade Deletion for Data Cleanup**
- **Description**: When users or sessions are deleted, their dependent records are automatically removed via database cascade constraints.
- **Trigger**: DELETE operations on users or sessions tables
- **Business Logic**:
  - Deleting a user cascades to delete all their sessions
  - Deleting a user cascades to delete all their strokes
  - Deleting a session cascades to delete all its strokes
- **Implementation**:
  - File: `supabase/migrations/001_initial_schema.sql`, lines 17, 31-32 - ON DELETE CASCADE foreign keys
- **Rationale**: Maintains referential integrity; ensures cleanup doesn't leave orphaned records

---

### **BR-012: Optimistic UI with 2-Second Timeout**
- **Description**: User's own strokes are rendered immediately (optimistic UI) and kept visible for 2 seconds before being cleaned up, ensuring smooth transition to database-confirmed stroke.
- **Trigger**: Stroke completion (pointer up after drawing)
- **Business Logic**:
  - Add stroke to local state immediately on completion
  - Send stroke to API (async operation)
  - Keep local stroke visible for 2 seconds
  - Remove local strokes older than 2 seconds (database version should appear by then)
- **Implementation**:
  - File: `components/Canvas.tsx`, lines 321-333 - Add to localStrokes on pointer up
  - File: `components/Canvas.tsx`, lines 60-64 - Cleanup logic with 2000ms threshold
  - File: `components/Canvas.tsx`, lines 150-172 - Render localStrokes alongside database strokes
- **Rationale**: 2-second window accounts for network latency and database write time; prevents visual gap

---

### **BR-013: Drawing Progress Broadcast Without Throttling**
- **Description**: Unlike cursor updates, drawing progress (stroke-in-progress) is broadcast without explicit throttling to ensure smooth real-time collaboration.
- **Trigger**: Pointer move while drawing (isDrawing = true)
- **Business Logic**:
  - Every pointer move event during drawing triggers broadcast
  - Full point array broadcast each time (not incremental)
  - No throttling applied (relies on pointer event frequency)
- **Implementation**:
  - File: `components/Canvas.tsx`, lines 307-311 - Calls onDrawingProgress on every pointer move
  - File: `hooks/useRealtime.ts`, lines 232-244 - sendDrawingProgress without throttle check
- **Rationale**: Drawing smoothness prioritized over bandwidth; pointer events naturally throttled by browser

---

### **BR-014: Fade-In Animation for New Strokes**
- **Description**: New strokes from other users fade in over 300ms to provide visual feedback and reduce jarring appearance of sudden changes.
- **Trigger**: New stroke received from database (realtime subscription)
- **Business Logic**:
  - When new stroke detected, record timestamp
  - For 300ms after appearance, calculate opacity = age / 300
  - After 300ms, set full opacity and stop tracking
  - Skip fade-in for strokes from users who just completed in-progress drawing (within 1 second)
- **Implementation**:
  - File: `components/Canvas.tsx`, lines 40-67 - Track new stroke timestamps and recent completions
  - File: `components/Canvas.tsx`, lines 108-148 - Fade-in rendering with opacity calculation
  - File: `components/Canvas.tsx`, lines 227-247 - Animation frame loop for smooth fade-in
- **Rationale**: Improves perceived responsiveness; prevents confusion about who drew what; skips for recently-in-progress drawings to avoid double-animation

---

## Business Assumptions & Inferences

### **Assumption 1: Low-Stakes Collaboration Context**
The absence of authentication, edit history, and undo functionality suggests this is designed for casual, low-stakes collaboration (e.g., brainstorming, doodling) rather than professional work that requires accountability.

### **Assumption 2: NFC Tag Access Pattern**
README mentions "accessed via NFC tags" but no NFC-specific code exists. Inference: NFC tags likely contain URLs with session/canvas identifiers, and the app is designed to support multiple isolated canvases (though current implementation is single-canvas).

### **Assumption 3: Mobile-First Use Case**
- Viewport userScalable=false (layout.tsx:13)
- Touch-optimized gestures
- Simple toolbar with large touch targets
- Suggests primary use case is mobile devices (phones/tablets)

### **Assumption 4: Limited Concurrent User Scale**
- No pagination of strokes
- All strokes loaded on initial page load
- No virtualization or spatial indexing
- Suggests expected usage: 5-20 concurrent users, hundreds (not thousands) of strokes per canvas

### **Assumption 5: Same-Session Network Assumption**
IP address is part of fingerprint, which breaks if user switches networks (WiFi to cellular). This suggests expected usage pattern: users complete their session on same network where they started.

### **Assumption 6: Content is Ephemeral**
7-day expiration with no export functionality suggests content is meant to be temporary - a scratchpad rather than a permanent artifact repository.
