# Developer Guide

Welcome to the Shared Canvas development team! This guide will help you get up and running quickly.

---

## Quick Start

### Prerequisites

- **Node.js**: 20.x or higher ([Download](https://nodejs.org/))
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: Latest version
- **Supabase Account**: [Sign up free](https://supabase.com)
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Initial Setup (15 minutes)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd shared-canvas
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings → API
   - Copy your Project URL and anon (public) key

4. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Run database migrations**:
   - Go to Supabase dashboard → SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and execute

6. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

7. **Verify setup**:
   - You should see the name entry modal
   - Enter a name and select a color
   - Try drawing on the canvas
   - Open in another browser tab to test real-time sync

✅ **Setup complete!** You're ready to start developing.

---

## Project Structure

```
shared-canvas/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers (serverless functions)
│   │   ├── session/             # Session start/end endpoints
│   │   ├── stroke/              # Stroke CRUD operations
│   │   └── user/                # User registration
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with metadata
│   └── page.tsx                 # Main canvas page (orchestrator)
│
├── components/                   # React components
│   ├── Canvas.tsx               # HTML5 canvas rendering + input handling
│   ├── Toolbar.tsx              # Tool selection and zoom controls
│   ├── NameEntryModal.tsx       # User onboarding modal
│   ├── OfflineScreen.tsx        # Network status indicator
│   └── __tests__/               # Component tests
│
├── hooks/                        # Custom React hooks
│   ├── useSession.ts            # User authentication and session lifecycle
│   ├── useRealtime.ts           # Supabase realtime subscriptions
│   └── useOffline.ts            # Online/offline detection
│
├── lib/                          # Shared utilities
│   ├── supabase.ts              # Supabase client configuration
│   ├── types.ts                 # TypeScript type definitions
│   ├── constants.ts             # App-wide constants
│   ├── fingerprint.ts           # User identification logic
│   └── __tests__/               # Utility tests
│
├── supabase/                     # Supabase configuration
│   ├── migrations/              # Database schema changes
│   └── functions/               # Edge functions (cleanup job)
│
├── docs/                         # Project documentation
│   ├── architecture/            # System design docs
│   ├── requirements/            # User stories, API specs
│   ├── decisions/               # Architecture Decision Records
│   └── onboarding/              # This guide!
│
├── public/                       # Static assets
├── .env.example                  # Environment variable template
├── .gitignore                   # Git ignore rules
├── jest.config.js               # Test configuration
├── netlify.toml                 # Netlify deployment config
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── tailwind.config.ts           # Tailwind CSS config
└── tsconfig.json                # TypeScript configuration
```

---

## Development Workflow

### Daily Development

1. **Pull latest changes**:
   ```bash
   git pull origin main
   npm install  # In case dependencies changed
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   - Server runs on [http://localhost:3000](http://localhost:3000)
   - Hot reload enabled (changes reflect immediately)

4. **Make changes**:
   - Edit files in your code editor
   - Browser auto-refreshes on save
   - Check browser console for errors

5. **Write/update tests**:
   ```bash
   npm test                # Run all tests
   npm run test:watch      # Run tests in watch mode
   npm run test:coverage   # Check coverage
   ```

6. **Lint and type-check**:
   ```bash
   npm run lint            # Check code style
   npx tsc --noEmit        # Type check without building
   ```

7. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   # Follow conventional commit format
   ```

8. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

---

## Key Concepts

### 1. Optimistic UI Pattern

**What**: Users see their actions immediately, before server confirmation.

**Why**: Provides instant feedback, masks network latency.

**How**:
```typescript
// In Canvas.tsx
const handlePointerUp = () => {
  // 1. Add to local state immediately (optimistic)
  const localStroke = { ...stroke, id: `local-${Date.now()}` };
  setLocalStrokes(prev => [...prev, localStroke]);
  
  // 2. Send to server (async)
  onStrokeComplete(points, color);
  
  // 3. Local stroke cleaned up after 2 seconds
  // 4. Database stroke appears via realtime subscription
};
```

**File**: `components/Canvas.tsx`, lines 321-337

---

### 2. Custom Hooks for Business Logic

**What**: React hooks that encapsulate reusable logic.

**Why**: Separates concerns, makes components testable, promotes reusability.

**Example**:
```typescript
// hooks/useSession.ts
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  const registerUser = async (name: string, color: string) => {
    // Registration logic here
  };
  
  return { user, session, registerUser };
}

// Usage in component
function MyComponent() {
  const { user, session, registerUser } = useSession();
  // Component logic
}
```

**Files**: `hooks/useSession.ts`, `hooks/useRealtime.ts`, `hooks/useOffline.ts`

---

### 3. Real-time Collaboration

**What**: Changes from one user instantly appear for all other users.

**How**: Supabase Realtime provides:
- **Postgres Changes**: Database INSERT triggers WebSocket event
- **Broadcast**: Custom events (cursors, drawing progress)
- **Presence**: Track who's online

**Example**:
```typescript
// Subscribe to database changes
supabase
  .channel('canvas-room')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'strokes' 
  }, (payload) => {
    // New stroke from any user
    setStrokes(prev => [...prev, payload.new]);
  })
  .subscribe();

// Broadcast cursor position
channel.send({
  type: 'broadcast',
  event: 'cursor',
  payload: { x, y, userId, userName }
});
```

**File**: `hooks/useRealtime.ts`

---

### 4. Browser Fingerprinting Authentication

**What**: Users identified by hash of `displayName:IP:userAgent`.

**Why**: No passwords needed, frictionless onboarding.

**Trade-offs**:
- ✅ Simple user experience
- ❌ Not secure for sensitive data
- ❌ Breaks on network/browser change

**Example**:
```typescript
// Generate fingerprint
const fingerprint = await generateFingerprint(
  'Alice',
  '192.168.1.1',
  'Mozilla/5.0...'
);
// Result: SHA-256 hash

// Look up user
const existingUser = await supabase
  .from('users')
  .select('*')
  .eq('fingerprint_hash', fingerprint)
  .single();
```

**File**: `lib/fingerprint.ts`, `app/api/user/register/route.ts`

---

## Common Tasks

### Adding a New Feature

1. **Review requirements** in `docs/requirements/user-stories.md`
2. **Check if hooks needed** for reusable logic
3. **Create component** or modify existing
4. **Add API endpoint** if backend changes required
5. **Update types** in `lib/types.ts`
6. **Write tests** before or alongside code (TDD)
7. **Update documentation** in relevant docs file

**Example: Add Color Picker to Toolbar**

```typescript
// 1. Add to Toolbar.tsx
interface ToolbarProps {
  // ... existing props
  selectedColor: string;
  onColorChange: (color: string) => void;
}

// 2. Render color picker
<div className="flex gap-1">
  {COLOR_PALETTE.map(color => (
    <button
      key={color}
      onClick={() => onColorChange(color)}
      style={{ backgroundColor: color }}
      className="w-8 h-8 rounded-full"
    />
  ))}
</div>

// 3. Update parent component (page.tsx)
const [selectedColor, setSelectedColor] = useState('#FF6B6B');

// 4. Pass to Canvas
<Canvas userColor={selectedColor} ... />
```

---

### Modifying the Database Schema

1. **Create new migration file**:
   ```sql
   -- supabase/migrations/002_add_canvas_table.sql
   CREATE TABLE canvases (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Apply in Supabase dashboard**:
   - Go to SQL Editor
   - Paste and execute

3. **Update types**:
   ```typescript
   // lib/types.ts
   export interface Canvas {
     id: string;
     name: string;
     created_at: string;
   }
   ```

4. **Create API endpoints** if needed

5. **Update documentation** in `docs/requirements/data-model.md`

---

### Adding a New API Endpoint

```typescript
// app/api/canvas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    // Validation
    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid name' },
        { status: 400 }
      );
    }
    
    // Database operation
    const { data, error } = await supabase
      .from('canvases')
      .insert({ name })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      canvas: data
    });
  } catch (error) {
    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create canvas' },
      { status: 500 }
    );
  }
}
```

**Pattern**: Always return `{ success: boolean, ... }` for consistency.

---

### Writing Tests

**Component Test Example**:
```typescript
// components/__tests__/Toolbar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '../Toolbar';

describe('Toolbar', () => {
  it('calls onToolChange when draw button clicked', () => {
    const mockOnToolChange = jest.fn();
    
    render(
      <Toolbar
        selectedTool="pan"
        onToolChange={mockOnToolChange}
        onZoomIn={jest.fn()}
        onZoomOut={jest.fn()}
        onResetView={jest.fn()}
      />
    );
    
    fireEvent.click(screen.getByText('Draw'));
    
    expect(mockOnToolChange).toHaveBeenCalledWith('draw');
  });
});
```

**API Route Test Example**:
```typescript
// app/api/stroke/__tests__/route.test.ts
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('POST /api/stroke', () => {
  it('returns 400 if required fields missing', async () => {
    const request = new NextRequest('http://localhost/api/stroke', {
      method: 'POST',
      body: JSON.stringify({}) // Missing fields
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
```

**Run tests**:
```bash
npm test                    # Run all tests once
npm run test:watch          # Watch mode (re-run on changes)
npm run test:coverage       # Generate coverage report
```

---

## Debugging

### Browser DevTools

1. **Console**: View logs and errors
   ```typescript
   console.log('User:', user);
   console.error('API Error:', error);
   ```

2. **Network Tab**: Inspect API calls
   - Check request/response payloads
   - Verify status codes
   - Monitor WebSocket connections

3. **React DevTools**: Inspect component state
   - Install React DevTools extension
   - View props, state, hooks

4. **Supabase Logs**: Check database queries
   - Go to Supabase dashboard → Logs
   - Filter by table or function

---

### Common Issues

**Issue**: Canvas not rendering strokes
```typescript
// Check 1: Are strokes loaded?
console.log('Strokes:', strokes);

// Check 2: Is canvas context available?
const ctx = canvasRef.current?.getContext('2d');
console.log('Context:', ctx);

// Check 3: Are coordinates correct?
console.log('Points:', stroke.points);
```

**Issue**: Realtime not working
```typescript
// Check subscription status
channel.subscribe((status) => {
  console.log('Realtime status:', status);
  // Should be 'SUBSCRIBED'
});

// Verify Realtime enabled in Supabase
// Dashboard → Database → Replication → Check strokes table
```

**Issue**: API returning 500 errors
```typescript
// Check server logs
// In Next.js, errors logged to terminal where npm run dev is running

// Check Supabase logs
// Dashboard → Logs → Filter by time range

// Add detailed error logging
catch (error) {
  console.error('Detailed error:', {
    message: error.message,
    stack: error.stack,
    context: { userId, sessionId }
  });
}
```

---

## Code Style Guide

### TypeScript

- **Use TypeScript for all new code** (no `.js` files)
- **Define interfaces** for all data structures
- **Avoid `any`** - use `unknown` and type guards instead
- **Use const assertions** for literal types

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

const colors = ['red', 'blue'] as const;
type Color = typeof colors[number];

// ❌ Avoid
let user: any;
const colors = ['red', 'blue'];
```

### React

- **Functional components only** (no class components)
- **Custom hooks** for reusable logic
- **Controlled components** preferred
- **TypeScript props** always

```typescript
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  label: string;
}

export default function Button({ onClick, label }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ❌ Avoid
export default function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Naming Conventions

- **Components**: PascalCase (`Canvas.tsx`, `ToolBar.tsx`)
- **Hooks**: camelCase starting with `use` (`useSession.ts`)
- **Utilities**: camelCase (`fingerprint.ts`, `constants.ts`)
- **Types/Interfaces**: PascalCase (`User`, `Stroke`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_NAME_LENGTH`, `EXPIRY_DAYS`)

### File Organization

- **One component per file**
- **Co-locate tests** (`__tests__` folder next to code)
- **Group related files** (e.g., all session routes in `api/session/`)
- **Index files** for cleaner imports (when needed)

---

## Testing Guide

### Test Philosophy

- **Test behavior, not implementation**
- **Write tests before or alongside code** (TDD encouraged)
- **Focus on user interactions**
- **Mock external dependencies** (Supabase, fetch)

### What to Test

✅ **Do test**:
- User interactions (clicks, typing)
- API request/response handling
- Component rendering based on props/state
- Business logic in hooks
- Error handling

❌ **Don't test**:
- Third-party libraries (React, Supabase)
- Implementation details (internal state)
- Trivial code (getters/setters)

### Coverage Goals

- **Target**: 80% overall coverage
- **Critical paths**: 100% (auth, stroke creation, realtime)
- **UI components**: 70%+ (focus on interactions)
- **Utilities**: 90%+ (pure functions easy to test)

**Check coverage**:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## Deployment

### Netlify Deployment (Automatic)

1. **Push to main branch**:
   ```bash
   git push origin main
   ```

2. **Netlify auto-builds**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Environment variables from dashboard

3. **Check deploy**:
   - Go to Netlify dashboard
   - View build logs
   - Test deployed site

### Environment Variables

Set in Netlify dashboard (Site Settings → Environment Variables):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Manual Deployment (Testing)

```bash
npm run build           # Build for production
npm start               # Run production server locally
```

Open [http://localhost:3000](http://localhost:3000) to test.

---

## Resources

### Documentation
- [Architecture Overview](../architecture/README.md)
- [API Contracts](../requirements/api-contracts.md)
- [Data Model](../requirements/data-model.md)
- [User Stories](../requirements/user-stories.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)

---

## Getting Help

1. **Check documentation** in `docs/` folder
2. **Search existing issues** on GitHub
3. **Ask in team chat** (Slack/Discord/Teams)
4. **Create GitHub issue** with reproduction steps
5. **Schedule pair programming** for complex problems

---

## Contributing

### Before Submitting PR

- [ ] Code follows style guide
- [ ] Tests written and passing
- [ ] TypeScript compiles without errors
- [ ] Documentation updated (if needed)
- [ ] PR description explains what and why

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed

## Related Issues
Closes #123
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add color picker to toolbar
fix: resolve realtime reconnection issue
docs: update API contracts
test: add tests for useSession hook
refactor: extract canvas rendering logic
```

---

## Tips & Tricks

1. **Hot Reload Sometimes Breaks**: Restart dev server with `npm run dev`

2. **Type Errors in Tests**: Import types from `@testing-library/react`

3. **Supabase Connection Issues**: Check if project is paused (free tier auto-pauses)

4. **Canvas Not Rendering**: Check canvas ref and dimensions

5. **Realtime Lag**: Check network tab for WebSocket connection

6. **Build Fails**: Clear Next.js cache with `rm -rf .next`

---

Welcome aboard! Happy coding! 🚀
