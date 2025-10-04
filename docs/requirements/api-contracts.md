# API Contracts

## 3. API Contracts

All endpoints are Next.js API Routes using the App Router pattern. Base URL: `/api`

---

### **POST /api/user/register**

**Purpose**: Register a new user or retrieve an existing user based on browser fingerprint. Enables user identification without passwords.

**Request Schema**:
```json
{
  "displayName": "string (required, max 20 chars)",
  "userAgent": "string (required)",
  "selectedColor": "string (required, hex format #RRGGBB)"
}
```

**Validation Rules**:
- `displayName` must not be empty
- `displayName` must be <= 20 characters
- All fields required
- Server extracts IP address from request headers

**Response Schema** (Success - 200):
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "display_name": "string",
    "fingerprint_hash": "string (sha256)",
    "selected_color": "string",
    "last_session_end": "timestamp | null",
    "created_at": "timestamp"
  },
  "isNewUser": true | false
}
```

**Response Schema** (Error - 400/500):
```json
{
  "success": false,
  "error": "string (error message)"
}
```

**Business Logic**:
1. Extract IP from `x-forwarded-for` or `x-real-ip` headers (fallback: 127.0.0.1)
2. Generate SHA-256 hash: `displayName:ipAddress:userAgent`
3. Query database for user with matching fingerprint_hash
4. If exists and color unchanged: return existing user
5. If exists and color changed: update color, return updated user
6. If not exists: create new user record, return new user

**Error Cases**:
- 400: Missing required fields
- 400: Display name exceeds 20 characters
- 500: Database error

**File Reference**: `app/api/user/register/route.ts`

---

### **POST /api/session/start**

**Purpose**: Start a new session for a user and extend the expiry date of their previous session content.

**Request Schema**:
```json
{
  "userId": "uuid (required)"
}
```

**Response Schema** (Success - 200):
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "timestamp",
    "ended_at": null,
    "expiry_date": "timestamp (now + 7 days)",
    "created_at": "timestamp"
  }
}
```

**Response Schema** (Error - 400/500):
```json
{
  "success": false,
  "error": "string"
}
```

**Business Logic**:
1. Validate userId is provided
2. Query for user's most recent session (ORDER BY started_at DESC LIMIT 1)
3. If previous session exists: update its expiry_date to NOW() + 7 days
4. Create new session record with:
   - started_at = NOW()
   - expiry_date = NOW() + 7 days
   - ended_at = null
5. Return new session

**Side Effects**:
- Extends content lifetime of user's previous session

**Error Cases**:
- 400: Missing userId
- 500: Database error

**File Reference**: `app/api/session/start/route.ts`

---

### **POST /api/session/end**

**Purpose**: End a user's session and set the content expiry date. Called on page unload.

**Request Schema**:
```json
{
  "sessionId": "uuid (required)"
}
```

**Response Schema** (Success - 200):
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "timestamp",
    "ended_at": "timestamp",
    "expiry_date": "timestamp (ended_at + 7 days)",
    "created_at": "timestamp"
  }
}
```

**Response Schema** (Error - 400/500):
```json
{
  "success": false,
  "error": "string"
}
```

**Business Logic**:
1. Validate sessionId is provided
2. Set ended_at = NOW()
3. Set expiry_date = NOW() + 7 days
4. Update session record
5. Update user's last_session_end timestamp
6. Return updated session

**Special Handling**:
- Often called via `navigator.sendBeacon()` on page unload
- Must handle beacon requests (no response body expected)

**Error Cases**:
- 400: Missing sessionId
- 500: Database error

**File Reference**: `app/api/session/end/route.ts`

---

### **POST /api/stroke**

**Purpose**: Save a new stroke (drawing or text) to the database. Triggers real-time broadcast to all connected users.

**Request Schema** (Drawing):
```json
{
  "user_id": "uuid (required)",
  "session_id": "uuid (required)",
  "type": "draw",
  "points": [
    { "x": number, "y": number },
    { "x": number, "y": number }
  ],
  "color": "string (required, hex format)"
}
```

**Request Schema** (Text):
```json
{
  "user_id": "uuid (required)",
  "session_id": "uuid (required)",
  "type": "text",
  "text": "string (required)",
  "position": { "x": number, "y": number },
  "color": "string (required, hex format)"
}
```

**Validation Rules**:
- `user_id`, `session_id`, `type`, `color` always required
- If `type='draw'`: `points` array required
- If `type='text'`: `text` string and `position` object required
- Accepts both snake_case and camelCase field names for compatibility

**Response Schema** (Success - 200):
```json
{
  "success": true,
  "stroke": {
    "id": "uuid",
    "user_id": "uuid",
    "session_id": "uuid",
    "type": "draw" | "text",
    "points": [{ "x": number, "y": number }] | null,
    "color": "string",
    "text": "string | null",
    "position": { "x": number, "y": number } | null,
    "created_at": "timestamp"
  }
}
```

**Response Schema** (Error - 400/500):
```json
{
  "success": false,
  "error": "string"
}
```

**Business Logic**:
1. Normalize field names (handle both snake_case and camelCase)
2. Validate required fields based on type
3. Insert stroke into database
4. Supabase Realtime automatically broadcasts INSERT to subscribed clients
5. Return created stroke

**Side Effects**:
- Triggers postgres_changes event on strokes table
- All connected clients receive new stroke via Supabase Realtime

**Error Cases**:
- 400: Missing required fields
- 400: Points missing for draw type
- 400: Text or position missing for text type
- 500: Database error

**File Reference**: `app/api/stroke/route.ts` (lines 9-67)

---

### **GET /api/stroke**

**Purpose**: Retrieve all strokes for the canvas, with user information joined.

**Request Schema**: None (no query parameters)

**Response Schema** (Success - 200):
```json
{
  "success": true,
  "strokes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "session_id": "uuid",
      "type": "draw" | "text",
      "points": [{ "x": number, "y": number }] | null,
      "color": "string",
      "text": "string | null",
      "position": { "x": number, "y": number } | null,
      "created_at": "timestamp",
      "users": {
        "display_name": "string",
        "selected_color": "string"
      }
    }
  ]
}
```

**Response Schema** (Error - 500):
```json
{
  "success": false,
  "error": "string"
}
```

**Business Logic**:
1. Query all strokes from database
2. Join with users table to get display_name and selected_color
3. Order by created_at ASC (oldest first)
4. Return all strokes (no pagination)

**Performance Considerations**:
- No pagination implemented
- Loads all strokes in single query
- Performance degrades with large stroke counts (1000+)
- Suitable for expected usage: hundreds of strokes per canvas

**Error Cases**:
- 500: Database query failure

**File Reference**: `app/api/stroke/route.ts` (lines 73-99)

---

## Realtime Events (Supabase Broadcast)

These are not HTTP endpoints but real-time events broadcast via Supabase Realtime channels.

### **Channel**: `canvas-room`

**Event: `cursor`**

**Purpose**: Broadcast cursor position to other users for real-time cursor tracking.

**Payload**:
```json
{
  "userId": "string",
  "userName": "string",
  "color": "string",
  "x": number,
  "y": number,
  "timestamp": number (milliseconds)
}
```

**Throttling**: Max 10 updates/second (100ms between updates)

**Client Behavior**:
- Receiving client filters out own userId
- Cursors expire after 3 seconds of inactivity

**File Reference**: `hooks/useRealtime.ts`, lines 203-227 (send), lines 105-128 (receive)

---

**Event: `drawing`**

**Purpose**: Broadcast in-progress drawing stroke to show real-time drawing as it happens.

**Payload**:
```json
{
  "userId": "string",
  "points": [{ "x": number, "y": number }],
  "color": "string"
}
```

**Throttling**: None (relies on pointer event frequency)

**Client Behavior**:
- Receiving client filters out own userId
- Updates temporary drawing strokes map
- Strokes shown immediately, removed on `drawing-complete` event

**File Reference**: `hooks/useRealtime.ts`, lines 232-244 (send), lines 129-145 (receive)

---

**Event: `drawing-complete`**

**Purpose**: Signal that a drawing is finished and will be saved to database.

**Payload**:
```json
{
  "userId": "string"
}
```

**Client Behavior**:
- Remove in-progress stroke for this userId after 500ms delay
- Delay prevents visual gap while waiting for database INSERT to broadcast

**File Reference**: `hooks/useRealtime.ts`, lines 249-259 (send), lines 146-158 (receive)

---

**Event: `presence` (sync/join/leave)**

**Purpose**: Track online users count via Supabase Presence feature.

**Presence State**:
```json
{
  "user_id": "string",
  "user_name": "string",
  "user_color": "string",
  "online_at": "timestamp"
}
```

**Client Behavior**:
- Count presence state keys to get online users
- Update count on sync, join, leave events

**File Reference**: `hooks/useRealtime.ts`, lines 74-89

---

## Database Realtime Subscription

**Event: `postgres_changes` on `strokes` table**

**Purpose**: Receive new strokes from database in real-time when any user saves a stroke.

**Trigger**: INSERT on strokes table

**Payload**: Full stroke record (same schema as GET /api/stroke response item)

**Client Behavior**:
- Add stroke to local strokes array
- Render with fade-in animation (300ms)
- Skip fade-in if user recently completed in-progress drawing

**File Reference**: `hooks/useRealtime.ts`, lines 92-104

---

## Missing/Future Endpoints

Based on feature gaps identified:

1. **DELETE /api/stroke/:id** - Delete individual strokes
2. **GET /api/canvas/:id** - Support multiple canvases (NFC tag routing)
3. **POST /api/canvas** - Create new canvas
4. **GET /api/canvas/:id/export** - Export canvas as PNG/SVG
5. **POST /api/stroke/undo** - Undo last stroke
6. **GET /api/session/:id/history** - View session history
7. **PUT /api/user/:id** - Update user profile beyond color
8. **POST /api/auth/login** - Proper authentication endpoint
9. **WebSocket /api/realtime** - Alternative to Supabase for self-hosted deployments
