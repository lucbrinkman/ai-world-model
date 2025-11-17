# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js application called "Map of AI Futures" - an interactive probability flowchart visualizing potential AI future scenarios. Users adjust probability sliders to explore how different decisions affect outcome likelihoods.

**Key Features:**
- Interactive probability sliders with real-time DAG-based calculations
- Zoom and pan canvas navigation
- Supabase authentication (passwordless magic link)
- Google Docs-style auto-saving with unified document storage
- Document picker for switching between saved maps

## Development

**Commands:**
- `npm run dev` - Start dev server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**Database:** Supabase with `documents` table storing unified user maps (graph structure + slider values + node positions).

## Git Workflow

**Important:** This repository uses **multiple worktrees** - the user may be working in different directories on different branches simultaneously.

**Branch Merging Protocol:**
When merging a feature branch to main, ALWAYS follow this sequence:

1. **First, update the feature branch with main:**
   ```bash
   git checkout feature-branch
   git merge main
   # Resolve any conflicts HERE on the feature branch, never on main
   ```

2. **Test after merging:**
   - Clear the Next.js cache: `rm -rf .next`
   - Start dev server: `npm run dev`
   - Verify it runs without errors before proceeding

3. **Only then, merge to main using fast-forward only:**
   ```bash
   git checkout main
   git merge --ff-only feature-branch
   # If this fails, return to step 1 - there are unresolved issues
   git push origin main
   ```

**Key Rules:**
- NEVER resolve merge conflicts while on `main` branch
- ALWAYS use `--ff-only` when merging into main (ensures clean, conflict-free merge)
- ALWAYS test the dev server after merging but before pushing
- If user says "merge to main", first update feature branch with main, then merge to main

## Architecture

### Core System

**Probability Engine:**
- **DAG Structure** (`lib/graphData.ts`, `graphData.json`): Nodes (question/start/outcome types) and edges with conditional probabilities
- **Calculation** (`lib/probability.ts`): Recursive probability propagation with memoization. Question nodes (21 total) use slider values to control YES/NO branch probabilities
- **URL State** (`lib/urlState.ts`): Slider values encoded as `?p=50i70i25i...` (integers separated by 'i')

**Unified Document Storage:**
- Single `documents` table replaces old `saved_scenarios` and `user_graphs` tables
- Each document contains: graph nodes, slider values, metadata (all in one JSONB field)
- Auto-save with 2-second debounce for authenticated users
- localStorage fallback for anonymous users with auto-migration on signup

**Authentication:**
- Supabase passwordless magic link (`lib/supabase/`)
- Server actions in `lib/actions/documents.ts`
- Custom `useAuth` hook (`hooks/useAuth.ts`) with localStorage migration logic

### Key Components

- `app/page.tsx` - Main state orchestrator (document state, slider values, selected node, settings)
- `components/Flowchart.tsx` - DAG visualization with zoom/pan
- `components/Sidebar.tsx` - 21 probability sliders + controls + auth
- `components/Node.tsx` - Individual nodes (click to set probability root)
- `components/Edge.tsx` - SVG arrows with adaptive styling
- `components/DocumentPicker.tsx` - Dropdown for switching between saved documents
- `components/AutoSaveIndicator.tsx` - Shows save status (Saving.../Saved to cloud/Saved locally)
- `components/WelcomeModal.tsx` - New user onboarding

### Important Implementation Details

**Node Interaction:**
- Clicking a node sets it as probability root (recalculates all probabilities from that point)
- Clicking same node again resets to start node
- Slider hover highlights corresponding flowchart node

**Edge Rendering:**
- Uses refs to track actual DOM node bounds for accurate arrow positioning
- Adjusts for zoom scale when calculating edge paths
- Adaptive opacity/width based on probability values

**State Management:**
- Auto-save hook (`lib/autoSave.ts`) with 2-second debounce for cloud saves
- localStorage (`lib/documentState.ts`) for anonymous user drafts
- Document state unified: graph structure, slider values, node positions all in one
- `useMemo` for probability calculations to prevent unnecessary recomputation
- Undo stack tracks slider history

**Storage Flow:**
- **Anonymous users**: Changes save instantly to localStorage
- **Authenticated users**: Changes auto-save to cloud (debounced)
- **On signup**: localStorage draft automatically migrates to cloud as "My First Map"
- **Document switching**: Load from cloud, update last_opened_at timestamp
