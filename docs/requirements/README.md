# Requirements Documentation

> **Note**: This documentation was reverse-engineered from the codebase on October 3, 2025 by Cascade AI. It represents the *actual* implementation, not necessarily the original design intent.

## Overview

This document captures the functional and non-functional requirements of the Shared Canvas application, a mobile-first collaborative whiteboard accessed via NFC tags. The requirements have been derived from analyzing the implementation.

## Document Structure

- **[User Stories](./user-stories.md)** - Functional requirements organized by user capability
- **[Business Rules](./business-rules.md)** - Business logic and constraints enforced by the system
- **[API Contracts](./api-contracts.md)** - REST API endpoints and their specifications
- **[Data Model](./data-model.md)** - Database entities, relationships, and validation rules

## Key Features Implemented

1. **Real-time Collaborative Drawing** - Multiple users can draw simultaneously on a shared canvas
2. **User Identification** - Browser fingerprinting to identify returning users
3. **Session Management** - Track user sessions with automatic cleanup
4. **Content Expiration** - Automatic removal of content after 7 days
5. **Offline Detection** - Graceful handling of network connectivity issues
6. **Touch-Optimized UI** - Mobile-first design with pan/zoom gestures
7. **Live Cursor Tracking** - See other users' cursor positions in real-time

## Technology Context

- **Framework**: Next.js 14+ with App Router
- **Database**: Supabase (PostgreSQL with Realtime)
- **Hosting**: Netlify
- **Language**: TypeScript
- **Testing**: Jest with React Testing Library

## How to Use This Documentation

1. Start with [User Stories](./user-stories.md) to understand WHAT the system does
2. Review [Business Rules](./business-rules.md) to understand WHY certain behaviors exist
3. Check [API Contracts](./api-contracts.md) for HOW to interact with the backend
4. Reference [Data Model](./data-model.md) to understand the data structure
