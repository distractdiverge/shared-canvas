# Data Model Requirements

## 4. Data Model Requirements

Database: **PostgreSQL** (via Supabase)  
Schema Version: **001_initial_schema.sql**

---

## Entity: **Users**

**Business Purpose**: Represent individuals using the canvas, tracked via browser fingerprinting. Users persist across multiple sessions to maintain identity and content ownership.

**Table Name**: `users`

### Key Attributes

| Attribute | Type | Business Meaning | Constraints |
|-----------|------|------------------|-------------|
| `id` | UUID | Unique user identifier | Primary Key, auto-generated |
| `display_name` | VARCHAR(20) | User-chosen name visible to others | NOT NULL, max 20 chars |
| `fingerprint_hash` | VARCHAR(64) | SHA-256 hash for identity verification | UNIQUE, NOT NULL, indexed |
| `selected_color` | VARCHAR(7) | User's drawing color (hex format) | NOT NULL, format: #RRGGBB |
| `last_session_end` | TIMESTAMPTZ | When user last ended a session | Nullable |
| `created_at` | TIMESTAMPTZ | When user first registered | DEFAULT NOW() |

### Relationships

- **One-to-Many** with `sessions`: A user can have multiple sessions over time
- **One-to-Many** with `strokes`: A user can create many strokes across all their sessions

### Validation Rules

- Display name must be 1-20 characters (enforced at API level)
- Color must be hex format (enforced at API level, not database)
- Fingerprint hash must be unique (enforced by database)

### Indexes

- `idx_fingerprint` on `fingerprint_hash` - Fast lookup during login/registration
- Primary key index on `id`

### Business Logic

- **Soft Identity**: Users are identified by fingerprint, not passwords
- **Color Persistence**: Color preference stored and retrieved across sessions
- **Last Activity Tracking**: `last_session_end` tracks when user last active

**File Reference**: `supabase/migrations/001_initial_schema.sql`, lines 2-12  
**Type Definition**: `lib/types.ts`, lines 2-9

---

## Entity: **Sessions**

**Business Purpose**: Represent individual user visits/interactions with the canvas. Sessions track when users are active and manage content expiration lifecycle.

**Table Name**: `sessions`

### Key Attributes

| Attribute | Type | Business Meaning | Constraints |
|-----------|------|------------------|-------------|
| `id` | UUID | Unique session identifier | Primary Key, auto-generated |
| `user_id` | UUID | Which user owns this session | Foreign Key → users(id), ON DELETE CASCADE |
| `started_at` | TIMESTAMPTZ | When session began | DEFAULT NOW() |
| `ended_at` | TIMESTAMPTZ | When session ended (null if active) | Nullable |
| `expiry_date` | TIMESTAMPTZ | When session content expires | NOT NULL |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT NOW() |

### Relationships

- **Many-to-One** with `users`: Each session belongs to one user
- **One-to-Many** with `strokes`: A session contains many strokes

### Business Logic

- **Active Sessions**: `ended_at = NULL` indicates user is currently active
- **Expiry Lifecycle**: 
  - On creation: `expiry_date = started_at + 7 days`
  - On end: `expiry_date = ended_at + 7 days`
  - On user return: Previous session expiry extended to `NOW() + 7 days`
- **Cascade Deletion**: When session deleted, all its strokes are deleted
- **Content Retention**: Sessions with `expiry_date < NOW()` are candidates for cleanup

### Indexes

- `idx_user_sessions` on `(user_id, started_at DESC)` - Fast lookup of user's most recent session
- `idx_expiry` on `expiry_date` - Efficient cleanup queries
- Primary key index on `id`

### Validation Rules

- `user_id` must reference valid user (foreign key constraint)
- `expiry_date` must always be set (NOT NULL)
- `started_at` <= `ended_at` (not enforced by database, but business logic assumption)

**File Reference**: `supabase/migrations/001_initial_schema.sql`, lines 14-26  
**Type Definition**: `lib/types.ts`, lines 11-18

---

## Entity: **Strokes**

**Business Purpose**: Represent individual drawing or text elements on the canvas. Strokes are the core content of the application, persisting user contributions.

**Table Name**: `strokes`

### Key Attributes

| Attribute | Type | Business Meaning | Constraints |
|-----------|------|------------------|-------------|
| `id` | UUID | Unique stroke identifier | Primary Key, auto-generated |
| `user_id` | UUID | Who created this stroke | Foreign Key → users(id), ON DELETE CASCADE |
| `session_id` | UUID | Which session created this stroke | Foreign Key → sessions(id), ON DELETE CASCADE |
| `type` | VARCHAR(10) | Stroke kind: 'draw' or 'text' | NOT NULL, CHECK (type IN ('draw', 'text')) |
| `points` | JSONB | Array of {x, y} coordinates for drawings | Nullable (required if type='draw') |
| `color` | VARCHAR(7) | Rendering color (hex format) | NOT NULL |
| `text` | TEXT | Text content for text strokes | Nullable (required if type='text') |
| `position` | JSONB | {x, y} position for text strokes | Nullable (required if type='text') |
| `created_at` | TIMESTAMPTZ | When stroke was created | DEFAULT NOW() |

### Relationships

- **Many-to-One** with `users`: Each stroke created by one user
- **Many-to-One** with `sessions`: Each stroke belongs to one session

### Type-Specific Schemas

**Drawing Stroke** (`type='draw'`):
```json
{
  "type": "draw",
  "points": [
    {"x": 150.5, "y": 200.3},
    {"x": 151.2, "y": 201.8},
    {"x": 152.0, "y": 203.5}
  ],
  "color": "#FF6B6B",
  "text": null,
  "position": null
}
```

**Text Stroke** (`type='text'`):
```json
{
  "type": "text",
  "points": null,
  "color": "#4ECDC4",
  "text": "Hello World",
  "position": {"x": 300, "y": 150}
}
```

### Validation Rules

- `type` must be 'draw' or 'text' (CHECK constraint)
- If `type='draw'`: `points` must be non-empty array (enforced at API level)
- If `type='text'`: `text` must be non-empty string and `position` must be set (enforced at API level)
- `color` format not validated by database (enforced at API level)

### Indexes

- `idx_session_strokes` on `session_id` - Efficient queries for session's strokes
- `idx_created_at` on `created_at DESC` - Time-ordered retrieval
- Primary key index on `id`

### Business Logic

- **Immutable**: Once created, strokes cannot be modified (no UPDATE operations in app)
- **Cascade Deletion**: Deleted when parent session or user is deleted
- **Realtime Broadcast**: INSERT triggers Supabase Realtime event to all clients
- **Expiration**: Implicitly expires with parent session (no direct expiry field)

### Performance Considerations

- JSONB storage for points allows flexible array sizes but may be inefficient for very large strokes
- No spatial indexing (PostGIS) - point-based queries would be slow at scale
- Created_at index supports chronological rendering

**File Reference**: `supabase/migrations/001_initial_schema.sql`, lines 28-43  
**Type Definition**: `lib/types.ts`, lines 20-30

---

## Supporting Types (Non-Database Entities)

### **Point**

**Purpose**: Represent 2D coordinates on canvas

```typescript
{
  x: number,  // X coordinate in canvas space
  y: number   // Y coordinate in canvas space
}
```

**File Reference**: `lib/types.ts`, lines 32-35

---

### **CursorPosition** (Runtime Only)

**Purpose**: Track other users' cursor positions for real-time collaboration visualization

```typescript
{
  userId: string,     // User ID of cursor owner
  userName: string,   // Display name for label
  color: string,      // User's color for cursor
  x: number,          // Screen X coordinate
  y: number,          // Screen Y coordinate
  timestamp: number   // Unix timestamp in milliseconds
}
```

**Lifecycle**: Ephemeral - not stored in database, only broadcast via Realtime

**File Reference**: `lib/types.ts`, lines 38-45

---

### **DrawingStroke** (Runtime Only)

**Purpose**: Represent in-progress strokes being drawn by other users

```typescript
{
  points: Point[],   // Current point array
  color: string,     // Drawing color
  userId: string     // Who is drawing
}
```

**Lifecycle**: Ephemeral - cleared when drawing completes and database stroke appears

**File Reference**: `lib/types.ts`, lines 47-51

---

## Row Level Security (RLS)

**Security Model**: Public canvas - all data accessible to all users

### Users Table Policies

```sql
-- Anyone can view users
CREATE POLICY "Users are viewable by everyone" 
  ON users FOR SELECT USING (true);

-- Anyone can create users (self-registration)
CREATE POLICY "Users can be created by anyone" 
  ON users FOR INSERT WITH CHECK (true);

-- Anyone can update users (no ownership check)
CREATE POLICY "Users can update their own record" 
  ON users FOR UPDATE USING (true);
```

**Security Implication**: No true access control - anyone can modify any user record

### Sessions Table Policies

```sql
-- Public read/write access
CREATE POLICY "Sessions are viewable by everyone" 
  ON sessions FOR SELECT USING (true);

CREATE POLICY "Sessions can be created by anyone" 
  ON sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Sessions can be updated by anyone" 
  ON sessions FOR UPDATE USING (true);
```

### Strokes Table Policies

```sql
-- Read and create access for everyone
CREATE POLICY "Strokes are viewable by everyone" 
  ON strokes FOR SELECT USING (true);

CREATE POLICY "Strokes can be created by anyone" 
  ON strokes FOR INSERT WITH CHECK (true);

-- Note: No DELETE or UPDATE policies
```

**Security Implication**: No delete capability via RLS - only server-side cleanup can delete

**File Reference**: `supabase/migrations/001_initial_schema.sql`, lines 45-60

---

## Realtime Configuration

**Table**: `strokes`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE strokes;
```

**Purpose**: Enable real-time INSERT notifications to all connected clients

**Behavior**: When any stroke is inserted, all subscribed clients receive the new row

**File Reference**: `supabase/migrations/001_initial_schema.sql`, line 63

---

## Data Integrity Constraints

### Foreign Key Cascade Rules

1. **users → sessions**: `ON DELETE CASCADE`
   - Deleting a user deletes all their sessions
   
2. **users → strokes**: `ON DELETE CASCADE`
   - Deleting a user deletes all their strokes
   
3. **sessions → strokes**: `ON DELETE CASCADE`
   - Deleting a session deletes all its strokes

**Implication**: Cleanup jobs can delete at session level and strokes automatically removed

### Unique Constraints

- `users.fingerprint_hash` - UNIQUE
  - Prevents duplicate identities
  - Enables "log in" by fingerprint match

### Check Constraints

- `strokes.type` - CHECK (type IN ('draw', 'text'))
  - Database-level enforcement of valid stroke types
  - Prevents invalid data even if API validation bypassed

---

## Missing/Recommended Constraints

### Suggested Additions

1. **users.selected_color** - CHECK (selected_color ~ '^#[0-9A-F]{6}$')
   - Validate hex color format at database level
   
2. **strokes.points** - CHECK (type != 'draw' OR points IS NOT NULL)
   - Enforce points required for draw strokes
   
3. **strokes.text** - CHECK (type != 'text' OR (text IS NOT NULL AND position IS NOT NULL))
   - Enforce text requirements at database level
   
4. **sessions.ended_at** - CHECK (ended_at IS NULL OR ended_at >= started_at)
   - Prevent logical impossibilities
   
5. **Index on strokes(user_id)** 
   - Currently missing, would improve user-specific queries

---

## Data Model Concerns

### Scalability Issues

1. **No Pagination Support**: GET /api/stroke returns all strokes
   - Performance degrades with 1000+ strokes
   - No created_at filtering or limit/offset
   
2. **No Spatial Indexing**: Cannot efficiently query "strokes in viewport"
   - All strokes loaded regardless of visible area
   
3. **JSONB Points Array**: Flexible but potentially inefficient
   - Large drawings (1000+ points) store entire array
   - No point-level granularity for queries

### Data Consistency Gaps

1. **No Optimistic Lock**: Concurrent updates to same user could conflict
   - Multiple tabs could cause race conditions
   
2. **No Audit Trail**: Cannot track who modified what when
   - `updated_at` fields missing
   - No change history

3. **No Soft Deletes**: Data permanently removed on cleanup
   - No recovery possible
   - No "deleted but archived" state

### Missing Entities

1. **Canvases**: Single global canvas, no multi-canvas support
   - NFC tag use case suggests need for canvas routing
   
2. **Teams/Organizations**: No grouping mechanism
   
3. **Permissions**: No roles, access levels, or ownership
   
4. **Canvas History/Snapshots**: No point-in-time recovery
