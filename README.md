# Shared Canvas Whiteboard

A mobile-first, collaborative whiteboard application accessed via NFC tags. Users can draw and add text on a shared infinite canvas with their contributions persisting based on session activity.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Hosting**: Netlify
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd shared-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
     - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for server-side operations)

4. Set up Supabase:
   - Create a new Supabase project at https://supabase.com
   - Run the migration in `supabase/migrations/001_initial_schema.sql` using the Supabase SQL editor
   - Deploy the Edge Function in `supabase/functions/cleanup-expired-content/` (optional, for automatic content cleanup)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

### Running Migrations

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the SQL script

### Setting Up Edge Functions (Optional)

For automatic cleanup of expired content:

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Link your project: `supabase link --project-ref <your-project-ref>`
3. Deploy the function: `supabase functions deploy cleanup-expired-content`
4. Set up a cron job to run the function daily (via Supabase dashboard or external cron service)

## Deployment to Netlify

1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables in Netlify dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main canvas page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Canvas.tsx         # Main canvas component
│   ├── NameEntryModal.tsx # User onboarding modal
│   ├── Toolbar.tsx        # Drawing tools
│   └── OfflineScreen.tsx  # Offline indicator
├── lib/                   # Utilities and configuration
│   ├── supabase.ts       # Supabase client
│   ├── types.ts          # TypeScript types
│   ├── fingerprint.ts    # User fingerprinting
│   └── constants.ts      # App constants
├── hooks/                 # Custom React hooks (to be implemented)
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
└── public/               # Static assets
```

## Features

- ✅ Real-time collaborative drawing
- ✅ Text annotations
- ✅ User identification via fingerprinting
- ✅ Color selection
- ✅ Infinite canvas with pan/zoom
- ✅ Mobile-optimized touch gestures
- ✅ Automatic content expiration (7 days)
- ✅ Offline detection
- ✅ Session management

## Documentation

Comprehensive reverse-engineered documentation is available in the `docs/` directory:

### 📋 Requirements & Specifications
- **[Requirements Overview](docs/requirements/README.md)** - Complete requirements documentation
- **[User Stories](docs/requirements/user-stories.md)** - 10 functional user stories with acceptance criteria
- **[Business Rules](docs/requirements/business-rules.md)** - 14 business rules with implementation details
- **[API Contracts](docs/requirements/api-contracts.md)** - REST API and realtime event documentation
- **[Data Model](docs/requirements/data-model.md)** - Database schema, entities, and relationships

### 🏗️ Architecture
- **[Architecture Overview](docs/architecture/README.md)** - Complete system architecture with diagrams
- **[Diagrams](docs/architecture/diagrams/)** - Mermaid source files for all architectural diagrams
  - System Context & Container diagrams (C4 model)
  - Sequence diagrams for key workflows
  - Component interaction diagrams
  - Data model visualization

### 🚀 Developer Resources
- **[Developer Guide](docs/onboarding/developer-guide.md)** - Setup, workflows, common tasks, debugging
- **[Decision Records](docs/decisions/)** - Architecture Decision Records (ADRs)
- **[Documentation Summary](docs/DOCUMENTATION_SUMMARY.md)** - Overview of all documentation

### 🎯 Key Insights

**What is this?** Mobile-first collaborative whiteboard for casual brainstorming with real-time synchronization

**Authentication:** Browser fingerprinting (SHA-256 hash) - no passwords required

**Real-time:** Supabase Realtime (WebSocket) for instant collaboration

**Content Lifecycle:** 7-day automatic expiration after session ends

**Scale:** Optimized for 5-20 concurrent users, hundreds of strokes per canvas

---

## Next Steps

See [Architecture README](docs/architecture/README.md) for technical debt, missing features, and improvement roadmap.

## License

This project is licensed under the MIT License.
