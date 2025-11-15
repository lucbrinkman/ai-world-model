# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application called "Map of AI Futures" - an interactive probability flowchart that visualizes different potential AI future scenarios. Users adjust probability sliders to explore how different decisions and outcomes affect the likelihood of various AI futures (from utopian to existential risk scenarios).

## Development Commands

- `npm run dev` - Start development server (default: http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### Core Probability System

The application is built around a directed acyclic graph (DAG) of nodes and edges representing different AI future scenarios and decision points. The probability calculation system is the heart of the application:

1. **Graph Data** (`lib/graphData.ts`): Contains raw node and edge data parsed from string format, originally ported from v4/graph.js. Nodes have types (question, start, good, ambivalent, existential, intermediate) and positions. Edges connect nodes with YES/NO branches or always-100% connections.

2. **Probability Calculation** (`lib/probability.ts`): The `calculateProbabilities()` function implements recursive probability propagation:
   - Starts from a probability root node (default: start node, or user-selected node)
   - Calculates node probabilities by summing incoming edge probabilities
   - Calculates edge probabilities as parent node probability × conditional probability
   - Uses memoization to avoid recalculation
   - Question nodes (type 'n') have associated slider values that control YES/NO branch probabilities

3. **URL State Management** (`lib/urlState.ts`): Slider values are encoded in URL query param 'p' as 'i'-separated integers (e.g., `?p=50i70i25i96i...`). This allows sharing specific probability configurations.

### Component Structure

- **Page Component** (`app/page.tsx`): Main orchestrator managing all state (slider values, selected node, hover state, settings). Uses `useMemo` for probability calculations to avoid unnecessary recomputation.

- **Flowchart Component** (`components/Flowchart.tsx`): Renders the DAG visualization. Uses refs to track actual DOM node bounds for accurate edge drawing. Positions nodes absolutely based on calculated x/y coordinates.

- **Node Component** (`components/Node.tsx`): Renders individual nodes with type-specific styling. Handles click (to set probability root) and hover interactions.

- **Edge Component** (`components/Edge.tsx`): Renders SVG arrows between nodes. Implements visual features like:
  - Bold paths: arrow width/head size scales with probability
  - Transparent paths: opacity scales with probability
  - Dynamic arrow routing to connect node edges

- **Sidebar Component** (`components/Sidebar.tsx`): Contains 21 probability sliders (one per question node), visualization settings, and action buttons (reset, load author's estimates, undo).

- **Slider Component** (`components/Slider.tsx`): Individual slider control with hover effects that highlight corresponding nodes in the flowchart.

### Important Constants

- `SLIDER_COUNT = 21` - Number of question nodes with associated sliders
- `SLIDER_DEFAULT_VALUE = 50` - Default probability (50%)
- `AUTHORS_ESTIMATES` - Pre-configured probability values from original author
- Node type constants in `lib/types.ts` define the taxonomy of outcomes

### State Synchronization

The app maintains bidirectional synchronization:
- Slider values ↔ URL query params (for sharing)
- Slider hover ↔ Node highlight (for visual feedback)
- Node selection ↔ Probability root (for exploring conditional probabilities)

### Styling

Uses Tailwind CSS with custom color scheme defined in `tailwind.config.ts`. Node colors are semantic:
- Purple: Question nodes
- Blue: Start/intermediate nodes
- Green: Good outcomes
- Yellow: Ambivalent outcomes
- Red: Existential risk outcomes
- Orange: Selected node

Font: Plus Jakarta Sans (loaded from Google Fonts)

## Key Behaviors

- Clicking a node sets it as the probability root, recalculating all probabilities from that node
- Clicking the same node again resets to the start node
- Hovering over a slider highlights the corresponding question node in the flowchart
- Undo functionality tracks slider state history using a stack
- The flowchart canvas is 900×1200px with padding for node positioning
