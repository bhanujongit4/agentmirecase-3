# Agent Mira Case 3 - Real Estate Intelligence Workspace

A full-stack Next.js application for property discovery using both structured filters and natural-language search, with per-user saved listings and side-by-side comparison.

## What This Project Solves

This app combines two search modes:

1. Structured search for deterministic filtering (`location`, `budget`, `beds`, `baths`, `size`, `amenities`)
2. LLM-assisted query understanding for natural language requests

The goal is not "AI for everything." The goal is to keep the core retrieval reliable while using the LLM where it creates real UX value: translating messy human intent into clean filter criteria.

## Core Features

- Natural language chat search
- Structured filter search with live updates (debounced)
- Property result cards with pricing and metadata
- Account register/login (lightweight credential flow)
- Save listings per account
- Compare up to 3 saved listings side-by-side (including images)
- MongoDB persistence with local JSON fallback when DB is unavailable

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Node.js runtime via Next API routes
- MongoDB Node driver
- Plain CSS (custom design system)

## Architecture Overview

### 1) Data Layer

Source datasets:

- `data/property_basics.json`
- `data/property_characteristics.json`
- `data/property_images.json`

`src/lib/propertyData.js` merges these datasets by `id` into a single in-memory property model and applies deterministic filtering.

Why this matters:

- The merge logic is explicit and auditable
- Filtering is stable and testable
- No LLM dependency for core retrieval correctness

### 2) Search Layer

#### Structured Path

User enters form fields -> `POST /api/chat` -> merged dataset filtered by known rules.

#### LLM Path

User enters free text -> LLM normalizes intent -> extracted filters are passed into the same deterministic filtering pipeline.

Design principle:

- LLM is used as an intent parser, not as the source of truth for final results.

### 3) Persistence Layer

`src/app/api/saved/route.js` supports:

- `GET /api/saved?email=...`
- `POST /api/saved`
- `DELETE /api/saved`

Primary store:

- MongoDB collection: `saved_properties`

Fallback store:

- `data/saved_properties.local.json`

Fallback is used when MongoDB is unreachable or not configured, so local development remains functional and transparent.

### 4) UI Layer

`src/app/page.js` provides:

- Hero + account access
- Full-width chat interface
- Structured filter panel
- Stacked listings and saved portfolio sections
- Compare dashboard for selected saved properties

## Project Structure

- `src/app/page.js` - Main UI and client-side state orchestration
- `src/app/globals.css` - Layout/theme system
- `src/app/api/chat/route.js` - Search endpoint and LLM interaction
- `src/app/api/saved/route.js` - Saved property CRUD
- `src/app/api/auth/register/route.js` - Account registration
- `src/app/api/auth/login/route.js` - Account login
- `src/lib/propertyData.js` - Data merge + deterministic filtering
- `src/lib/mongodb.js` - MongoDB connection utility
- `src/lib/auth/password.js` - Password helpers and email normalization

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=agent_mira
```

3. Run development server:

```bash
npm run dev
```

4. Open:

- `http://localhost:3000`

## Deployment

Deploy on Vercel or any Node-compatible host.

Required env vars:

- `MONGODB_URI`
- `MONGODB_DB_NAME`

## Approach and Technical Decisions

### Deterministic Core + LLM Assist

The strongest design choice in this project is separation of concerns:

- Deterministic code performs filtering and ranking of known structured data
- LLM helps interpret user language into that deterministic contract

This keeps behavior predictable even when LLM output quality varies.

### Why MongoDB + Local Fallback

MongoDB is ideal for user-scoped saved properties:

- Simple schema
- Fast lookup by `userEmail`
- Natural fit for document-style property payloads

But to keep development friction low, we implemented a local JSON fallback when MongoDB is unavailable. This avoids blocking the product flow on infrastructure readiness.

### Why We Are Not Using JWT (Yet)

This version intentionally keeps auth simple:

- Email + password over API routes
- Session state maintained client-side for this app scope

Reasons:

1. Product scope: The core challenge here is retrieval + UX + persistence, not distributed auth.
2. Complexity control: JWT introduces token issuance, refresh/invalidation strategy, secure storage concerns, and middleware enforcement paths.
3. Delivery velocity: For a focused implementation, lightweight auth keeps the architecture easier to reason about while still supporting per-user saved data.

When JWT should be added:

- Multi-device persistent sessions
- Role-based authorization
- Third-party integrations
- Stricter security/compliance needs

At that point, moving to signed access tokens + refresh flow (or a managed auth provider) is the right next step.

## Challenges and Tradeoffs

### 1) Balancing LLM Usage vs System Simplicity

The hardest architectural challenge was deciding how much authority to give the LLM.

If we rely on LLM too much:

- Behavior gets less predictable
- Debugging gets harder
- Cost/latency sensitivity increases

If we rely on LLM too little:

- Natural language UX feels weak
- Users are forced into rigid forms

Resolution used here:

- LLM for translation/normalization
- Deterministic code for actual filtering and output correctness

### 2) Adding MongoDB Without Overcomplicating the App

DB integration often expands quickly into:

- Connection lifecycle bugs
- Environment configuration pain
- Partial failure handling

To keep complexity controlled:

- Single-purpose collection (`saved_properties`)
- Simple CRUD surface
- Explicit fallback path when Mongo is down
- User-facing status messages about which storage path was used

This keeps the app robust under real-world setup variability.

## Current Limitations

- No JWT/session refresh pipeline yet
- No server-side authorization middleware
- No advanced ranking model beyond filter matches
- Limited pagination/sorting controls for large result sets

## Next Technical Steps

1. Add structured validation (e.g., Zod) on all API payloads
2. Introduce test coverage for filter logic and saved routes
3. Add JWT or managed auth with guarded API routes
4. Add query analytics and search telemetry for prompt/UX tuning
5. Add pagination + server-side sorting for scale
