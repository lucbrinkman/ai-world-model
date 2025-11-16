# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js application called "Map of AI Futures" - an interactive probability flowchart visualizing potential AI future scenarios. Users adjust probability sliders to explore how different decisions affect outcome likelihoods.

**Key Features:**
- Interactive probability sliders with real-time DAG-based calculations
- Zoom and pan canvas navigation
- Supabase authentication (passwordless magic link)
- Save/load/share scenarios via URL

## Development

**Commands:**
- `npm run dev` - Start dev server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**Database:** Supabase with `saved_scenarios` table storing user scenarios.

## Architecture

### Core System

**Probability Engine:**
- **DAG Structure** (`lib/graphData.ts`, `graphData.json`): Nodes (question/start/outcome types) and edges with conditional probabilities
- **Calculation** (`lib/probability.ts`): Recursive probability propagation with memoization. Question nodes (21 total) use slider values to control YES/NO branch probabilities
- **URL State** (`lib/urlState.ts`): Slider values encoded as `?p=50i70i25i...` (integers separated by 'i')

**Authentication:**
- Supabase passwordless magic link (`lib/supabase/`)
- Server actions in `lib/actions/scenarios.ts`
- Custom `useAuth` hook (`hooks/useAuth.ts`)

### Key Components

- `app/page.tsx` - Main state orchestrator (slider values, selected node, settings)
- `components/Flowchart.tsx` - DAG visualization with zoom/pan
- `components/Sidebar.tsx` - 21 probability sliders + controls
- `components/Node.tsx` - Individual nodes (click to set probability root)
- `components/Edge.tsx` - SVG arrows with adaptive styling
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
- URL params sync bidirectionally with slider values
- `useMemo` for probability calculations to prevent unnecessary recomputation
- Undo stack tracks slider history
