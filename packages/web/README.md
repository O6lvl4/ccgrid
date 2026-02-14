# @ccgrid/web

Frontend built with React + Zustand + Tailwind CSS. Provides GUI for session management, teammate monitoring, task tracking, and permission approval.

## Getting Started

```bash
npm run dev  # vite (port 7820)
```

## Structure

```
src/
  App.tsx              # Root component (ViewShell)
  main.tsx             # Entry point
  store/useStore.ts    # Zustand store (state management + WebSocket message handling)
  hooks/
    useApi.ts          # REST API client
    useWebSocket.ts    # WebSocket connection management
  components/
    layout/            # ViewShell, SessionSidebar, Breadcrumb
    views/             # SessionListView, SessionDetailView, OutputTab, etc.
    atoms/             # Basic components like Button, Badge, Input
    molecules/         # Composite components like Card, FormField, IconButton
    PermissionDialog   # Permission request approval/rejection/input editing UI
  utils/
    timeAgo.ts         # Relative time display
    twemoji.tsx        # Twemoji rendering
```

## Main Dependencies

- **React 19** + **Vite**
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **react-markdown** + **remark-gfm** — Markdown rendering
