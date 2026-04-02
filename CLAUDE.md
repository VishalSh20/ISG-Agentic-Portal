# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (Vite HMR)
npm run build      # Type-check + production build (tsc -b && vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

No test framework is configured.

## Architecture Overview

**ISG Portal** is a React 19 + TypeScript SPA for managing AI agents, MCP servers, and workflows, and conducting streaming AI chat conversations.

**Key libraries**: Redux Toolkit (state), React Router v7 (routing), Axios (HTTP), Supabase (auth/DB persistence), shadcn/ui + Tailwind CSS 4 (UI), Framer Motion (animations), dnd-kit (drag-and-drop).

## Directory Structure

```
src/
├── api/          # Axios API calls — agents, chat, mcpServers, workflows, chatPersistence
├── components/
│   ├── layout/   # AppShell, navigation
│   └── ui/       # shadcn-based reusable components
├── pages/
│   └── config/   # AgentConfig, MCPServerConfig, WorkflowEditor
├── services/     # healthPoller — checks agent/server liveness
├── store/
│   └── slices/   # authSlice, themeSlice, agentsSlice, mcpServersSlice, workflowsSlice, chatSlice
├── types/        # index.ts (domain types), forms.ts (form types)
└── utils/        # helpers.ts (ID generation), validation.ts (URL validation)
```

## State Management

Redux Toolkit with `redux-persist`. Auth, theme, and chat state are persisted to localStorage.

- `authSlice` — user/token state; token is injected by Axios interceptors into all requests as `Authorization: Bearer {token}`
- `chatSlice` — manages threads and messages including real-time streaming state
- Other slices (`agentsSlice`, `mcpServersSlice`, `workflowsSlice`) use async thunks for CRUD; they fall back to seed data from `src/data/seed.ts` when the backend is unavailable

## Chat / Streaming

The `Assistant` page streams responses using the Fetch API (SSE pattern) against the orchestrator's `/ask-query-stream` endpoint. Tokens are appended to Redux state as they arrive, then the final message is persisted to Supabase. The non-streaming fallback uses `/ask-query`.

## Backend Services (configured via `.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Orchestrator API (primary chat) |
| `VITE_MASTER_API_BASE_URL` | Master agent API (alternative) |
| `VITE_DATA_SERVER_URL` | CRUD for agents, MCP servers, workflows |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Chat persistence + auth |
| `VITE_KEYCLOAK_*` | Keycloak SSO (configured but not yet active) |

## Authentication

Currently in demo/dev mode — `App.tsx` dispatches a hardcoded "Lukas" demo user on startup. Keycloak integration is configured in `.env` but not yet wired up.

## Path Aliases

`@/*` maps to `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`).

## UI Components

Uses shadcn/ui with the **Radix Nova** preset (`components.json`). Add new shadcn components via `npx shadcn@latest add <component>`.

## Git Workflow

After any significant change or any amount of change that warrants persisting, commit and push to the remote repository immediately. Do not wait for the user to ask — proactively commit and push once the change is complete and verified.
