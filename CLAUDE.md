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

**Port Management:**

- **IMPORTANT:** Each worktree MUST use its designated port:
  - **WorkTree1** (`ai-world-model-worktree-1`): Port **3000**
  - **WorkTree2** (`ai-world-model-worktree-2`): Port **3001**
- **NEVER** start a dev server on a different port without explicit user permission
- **Before starting a dev server:**
  1. Check which worktree you're in (from working directory)
  2. Determine the correct port (3000 for WorkTree1, 3001 for WorkTree2)
  3. Kill any process on that port: `fuser -k <port>/tcp`
  4. Start dev server with: `npm run dev -- -p <port>` (e.g., `npm run dev -- -p 3001`)

**Process Management:**

- **To stop a dev server cleanly:** `fuser -k <port>/tcp` (e.g., `fuser -k 3000/tcp` or `fuser -k 3001/tcp`)
  - This kills all processes using that port, including orphaned child processes
  - More reliable than KillShell which can leave next-server processes running
  - Prevents accumulation of zombie processes that consume CPU/memory

**Environment Variables:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**Database:** Supabase with `documents` table storing unified user maps (graph structure + slider values + node positions).

## Git Workflow

**Important:** This repository uses **multiple worktrees** - the user may be working in different directories on different branches simultaneously.

**Worktree Safety Rule:**

- **NEVER** make edits to files in any worktree other than the one Claude Code was started in
- Only read from, write to, and execute commands within the current working directory
- If the user needs changes in a different worktree, they will navigate there and start a new session

**Development Model:**

- Solo developer project using GitHub Pull Request workflow
- All changes go through PRs with automated CI checks
- Work on feature branches → push to GitHub → create PR → merge via GitHub UI
- **NEVER merge to main locally**
- **NEVER push main branch directly**

**Pull Request Workflow:**

1. **Create and push feature branch:**

   ```bash
   git checkout -b feature-branch
   # Make your changes and commit
   git push origin feature-branch
   ```

2. **Create Pull Request:**
   - Use GitHub UI or `gh pr create --repo lucbrinkman/ai-world-model` command
   - **IMPORTANT:** Always create PRs to `lucbrinkman/ai-world-model` (NOT the upstream fork `swantescholz/aifutures`)
   - CI automatically runs type-check, lint, and build
   - PR cannot be merged until all CI checks pass

3. **Merge via GitHub:**
   - Once CI passes and changes are ready, merge via GitHub PR interface
   - Delete feature branch after merging (can be done automatically)
   - Pull latest main locally: `git checkout main && git pull origin main`

**CI/CD Pipeline:**

- GitHub Actions workflow runs on all pushes and PRs (`.github/workflows/ci.yml`)
- Checks: TypeScript type-check, ESLint, Next.js build
- PRs blocked from merging if CI fails
- Local pre-commit hooks run same checks (via Husky) to catch issues early

**Branch Protection (configure in GitHub settings):**

- Require PR reviews before merging (optional for solo dev)
- Require status checks to pass (CI workflow)
- Require branches to be up to date before merging

**Key Rules:**

- NEVER merge to main locally - always use GitHub PRs
- NEVER push main branch directly - only push feature branches
- Let CI validate all changes before merging
- If CI fails, fix issues and push updates to the PR branch

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
