# User Stories (Functional Requirements)

## 1. User Stories (Functional Requirements)

### **US-001: User Registration and Identification**
As a new visitor,
I want to register with a display name and choose a color,
So that my contributions are identified and I can be recognized when I return.

**Acceptance Criteria:**
- [x] User can enter a display name (max 20 characters)
- [x] User can select from 12 predefined colors
- [x] User's identity is persisted using browser fingerprinting (display name + IP + user agent)
- [x] Returning users are automatically recognized without re-registering
- [x] User's color preference is saved and can be updated

**Implementation Evidence:**
- File: `app/page.tsx`, lines 91-93
- File: `components/NameEntryModal.tsx` (full component)
- File: `app/api/user/register/route.ts`, lines 11-96
- File: `lib/fingerprint.ts`, lines 5-17 - SHA-256 hash of name+IP+userAgent
- File: `lib/constants.ts`, lines 4-17 - Color palette definition
- **Behavior**: Modal blocks access until name/color selected; fingerprint hash checked against database for existing users

---

### **US-002: Drawing on Shared Canvas**
As a registered user,
I want to draw freehand strokes on an infinite canvas,
So that I can express ideas visually and collaborate with others.

**Acceptance Criteria:**
- [x] User can draw with their selected color
- [x] Drawing strokes are rendered in real-time as user drags
- [x] Completed strokes are immediately visible to all online users
- [x] Drawing uses smooth lines with rounded caps and joins
- [x] Canvas size is larger than viewport (infinite canvas concept)

**Implementation Evidence:**
- File: `components/Canvas.tsx`, lines 269-272, 294-312 - Drawing pointer events
- File: `components/Canvas.tsx`, lines 126-140 - Stroke rendering with lineWidth=3, lineCap='round'
- File: `app/api/stroke/route.ts`, lines 9-67 - POST endpoint saves strokes to database
- File: `hooks/useRealtime.ts`, lines 92-104 - Realtime subscription broadcasts new strokes
- **Behavior**: Pointer down starts stroke, pointer move adds points, pointer up saves to database and broadcasts

---

### **US-003: Adding Text Annotations**
As a user,
I want to add text annotations to the canvas,
So that I can label drawings or add written explanations.

**Acceptance Criteria:**
- [x] User can switch to "text" tool
- [x] Clicking canvas opens text input prompt
- [x] Text is rendered at clicked position with user's color
- [x] Text annotations are persisted and synchronized

**Implementation Evidence:**
- File: `components/Toolbar.tsx`, lines 33-42 - Text tool button
- File: `components/Canvas.tsx`, lines 274-291 - Text tool click handler with prompt()
- File: `components/Canvas.tsx`, lines 141-145 - Text rendering with 16px sans-serif font
- File: `app/api/stroke/route.ts`, lines 32-36 - Validation for text type strokes
- **Behavior**: Text tool triggers browser prompt, saves text with position to database

---

### **US-004: Pan and Zoom Navigation**
As a user,
I want to pan and zoom the canvas,
So that I can navigate a large collaborative workspace and focus on specific areas.

**Acceptance Criteria:**
- [x] User can switch to "pan" tool to drag the canvas
- [x] User can zoom in (max 3x) and zoom out (min 0.5x)
- [x] User can reset view to default zoom (1x) and center position
- [x] Zoom affects rendering but not coordinate storage

**Implementation Evidence:**
- File: `components/Toolbar.tsx`, lines 44-52 - Pan tool button
- File: `components/Toolbar.tsx`, lines 55-93 - Zoom controls (in, out, reset)
- File: `app/page.tsx`, lines 72-83 - Zoom state management with min/max constraints
- File: `components/Canvas.tsx`, lines 31-32 - offset and scale state
- File: `components/Canvas.tsx`, lines 263-267, 294-300 - Pan drag implementation
- File: `components/Canvas.tsx`, lines 104-106 - Canvas transform with scale and offset
- **Behavior**: Pan tool enables drag to move canvas; zoom buttons adjust scale factor

---

### **US-005: Real-time Collaboration**
As a user,
I want to see other users drawing in real-time,
So that I can collaborate synchronously and avoid conflicts.

**Acceptance Criteria:**
- [x] User sees strokes from other users appear immediately
- [x] User sees in-progress drawing strokes from others (before completed)
- [x] User sees other users' cursor positions with name labels
- [x] User sees count of online users
- [x] Strokes have fade-in animation for new additions

**Implementation Evidence:**
- File: `hooks/useRealtime.ts`, lines 92-104 - Postgres changes subscription for new strokes
- File: `hooks/useRealtime.ts`, lines 129-158 - Broadcast events for drawing progress and completion
- File: `hooks/useRealtime.ts`, lines 105-128 - Cursor position broadcast and cleanup
- File: `hooks/useRealtime.ts`, lines 74-89 - Presence tracking for online user count
- File: `components/Canvas.tsx`, lines 108-148 - Fade-in animation (300ms) for new strokes
- File: `app/page.tsx`, lines 162-180 - Cursor rendering with color and name label
- **Behavior**: Supabase realtime channels broadcast drawing events and cursor positions; presence tracking counts connected users

---

### **US-006: Session Management**
As a user,
I want my session to be tracked and automatically managed,
So that my contributions are associated with me and cleaned up appropriately.

**Acceptance Criteria:**
- [x] New session starts when user registers/logs in
- [x] Session is persisted in sessionStorage across page refreshes
- [x] Session ends automatically when user closes browser/tab
- [x] Ended sessions extend content expiry by 7 days
- [x] User can have multiple sequential sessions

**Implementation Evidence:**
- File: `hooks/useSession.ts`, lines 58-79 - Session start API call after registration
- File: `hooks/useSession.ts`, lines 77-81 - SessionStorage persistence
- File: `hooks/useSession.ts`, lines 125-151 - Restore session from sessionStorage on mount
- File: `hooks/useSession.ts`, lines 156-170 - beforeunload handler with sendBeacon for session end
- File: `app/api/session/start/route.ts`, lines 21-39 - Extends previous session expiry when starting new one
- File: `app/api/session/end/route.ts`, lines 10-55 - Updates session end time and expiry date
- **Behavior**: Session ID stored in sessionStorage; sendBeacon ensures cleanup on tab close

---

### **US-007: Content Expiration**
As a system administrator,
I want old content to be automatically removed after 7 days,
So that the canvas remains performant and storage costs are controlled.

**Acceptance Criteria:**
- [x] Content expiry date is set to 7 days from session end
- [x] Expiry date is extended when user starts a new session
- [x] Expired sessions and their strokes are deleted automatically
- [x] Cleanup process can run via scheduled job

**Implementation Evidence:**
- File: `lib/constants.ts`, line 22 - EXPIRY_DAYS = 7 constant
- File: `app/api/session/end/route.ts`, lines 21-23 - Sets expiry 7 days after session end
- File: `app/api/session/start/route.ts`, lines 30-39 - Extends previous session expiry on new session
- File: `supabase/functions/cleanup-expired-content/index.ts`, lines 14-54 - Edge function deletes expired sessions and strokes
- File: `supabase/migrations/001_initial_schema.sql`, line 26 - Index on expiry_date for efficient cleanup queries
- **Behavior**: Supabase Edge Function queries sessions with expiry_date < now() and cascades delete

---

### **US-008: Offline Detection**
As a user,
I want to be notified when I'm offline,
So that I know my actions won't be synchronized.

**Acceptance Criteria:**
- [x] System detects when browser goes offline
- [x] Offline screen is displayed to user
- [x] Canvas functionality is blocked when offline
- [x] System automatically resumes when connection restored

**Implementation Evidence:**
- File: `hooks/useOffline.ts`, lines 1-29 - Monitors navigator.onLine and online/offline events
- File: `components/OfflineScreen.tsx` (full component) - Displays offline message
- File: `app/page.tsx`, lines 86-88 - Renders OfflineScreen when isOffline is true
- **Behavior**: Browser online/offline events toggle state; OfflineScreen replaces entire UI when offline

---

### **US-009: Optimistic UI Updates**
As a user,
I want my actions to appear instantly,
So that the interface feels responsive even with network latency.

**Acceptance Criteria:**
- [x] User's strokes appear immediately on their own canvas
- [x] Local strokes are shown while waiting for database confirmation
- [x] Local strokes are cleaned up after database version appears
- [x] No duplicate strokes are shown to user

**Implementation Evidence:**
- File: `components/Canvas.tsx`, lines 30, 277-288, 321-333 - Local strokes array for optimistic rendering
- File: `components/Canvas.tsx`, lines 60-64 - Cleanup of local strokes older than 2 seconds
- File: `components/Canvas.tsx`, lines 150-172 - Renders local strokes before database confirmation
- File: `components/Canvas.tsx`, lines 40-67 - Tracks new stroke timestamps to prevent duplicate fade-in
- **Behavior**: Strokes added to localStrokes immediately; removed after 2 seconds or when database stroke appears

---

### **US-010: Visual Feedback for Drawing Progress**
As a user watching others draw,
I want to see their strokes appear as they draw (not just when finished),
So that I can follow their thought process in real-time.

**Acceptance Criteria:**
- [x] Other users' in-progress strokes are visible during drawing
- [x] In-progress strokes update smoothly as user draws
- [x] In-progress strokes are replaced by final stroke without visual gap
- [x] System prevents duplicate rendering of in-progress and completed strokes

**Implementation Evidence:**
- File: `hooks/useRealtime.ts`, lines 232-244 - Broadcasts drawing progress points and color
- File: `hooks/useRealtime.ts`, lines 129-145 - Receives drawing progress broadcasts and updates drawingStrokes map
- File: `hooks/useRealtime.ts`, lines 146-158 - Removes in-progress stroke on drawing-complete event (500ms delay)
- File: `components/Canvas.tsx`, lines 174-192 - Renders drawingStrokes from other users
- File: `components/Canvas.tsx`, lines 69-90 - Tracks recently completed drawings to prevent duplicate fade-in
- **Behavior**: Throttled broadcast of point arrays during drawing; delayed removal ensures smooth transition to database stroke

---

## Feature Gaps Identified

### Missing Features (Inferred from Architecture)

1. **Undo/Redo Functionality** - No mechanism to revert strokes
2. **Stroke Selection/Deletion** - Cannot select or delete individual strokes
3. **Layer Management** - All strokes on single layer, no z-index control
4. **Export/Import** - No way to save canvas as image or reload saved state
5. **Stroke Width Control** - Line width hardcoded to 3px (Canvas.tsx:128)
6. **Advanced Drawing Tools** - No shapes (circles, rectangles), eraser, or fill tools
7. **Collaboration Locks** - No mechanism to prevent multiple users editing same area
8. **User Authentication** - Relies on fingerprinting; no password/OAuth
9. **Permissions** - All users have equal permissions; no admin/viewer roles
10. **Canvas Bounds** - Canvas appears infinite but has no defined boundaries
11. **Performance Limits** - No pagination or virtualization for large stroke counts
12. **Audit Trail** - Cannot see who created each stroke or when
