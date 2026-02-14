# Contributing Guide

Thank you for your interest in contributing to ccgrid.

## Development Environment Setup

### Requirements

- Node.js 20.x or later
- npm (comes with Node.js)
- Git

### Setup Instructions

1. Fork the repository

2. Clone
```bash
git clone https://github.com/YOUR_USERNAME/ccgrid.git
cd ccgrid
```

3. Install dependencies
```bash
npm install
```

4. Start the development server
```bash
npm run dev
```

Open http://localhost:7820 in your browser to verify it's working.

### Project Structure

```
packages/
  shared/   # Shared type definitions (Session, Teammate, TeamTask, ServerMessage, etc.)
  server/   # Hono + WebSocket server (port 7819)
  web/      # Vite + React + Tailwind CSS frontend (port 7820)
```

## Pull Request Workflow

1. **Create an Issue (recommended)**
   - For major changes, we recommend discussing in an Issue first

2. **Create a branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make changes**
   - Commit your changes
   - Write commit messages in Japanese, concisely without prefixes
   - Example: `セッション詳細画面のパフォーマンス最適化`

4. **Push**
```bash
git push origin feature/your-feature-name
```

5. **Create a Pull Request**
   - Create a pull request on GitHub
   - Follow the template to describe your changes

## Coding Guidelines

### TypeScript

- Ensure type safety with `strict: true`
- Explicit type annotations are recommended (especially for function parameters and return values)
- Avoid using `any`

### React Components

- Use function components
- Utilize `memo` when performance is critical
- Use `use` prefix for custom hooks
- Component files should be in PascalCase (e.g., `SessionDetailView.tsx`)

### Styling

- Use Tailwind CSS
- Minimize inline styles
- Consider responsive design

### File and Folder Structure

- **packages/shared**: Type definitions only, no implementation
- **packages/server**: Backend logic, WebSocket, REST API
- **packages/web**: Frontend components, hooks, store

```
packages/web/src/
  components/
    dialogs/      # Dialog components
    layout/       # Layout-related components
    output/       # Output display components
    session/      # Session-related UI
    views/        # Main views
  hooks/          # Custom hooks
  store/          # Zustand store
  utils/          # Utility functions
```

### Naming Conventions

- Variables and functions: camelCase
- Components, types, and interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE (for global constants)
- File names:
  - Components: PascalCase (e.g., `SessionPanel.tsx`)
  - Utilities: camelCase (e.g., `timeAgo.ts`)

## Testing

Currently, no test framework is implemented, but we recommend the following manual checks:

- [ ] Development server starts successfully
- [ ] Existing functionality works correctly
- [ ] No errors in the browser console
- [ ] No TypeScript compilation errors

## SSH ControlMaster Configuration (recommended)

For parallel git operations, we recommend enabling SSH ControlMaster.

Add to `~/.ssh/config`:

```ssh-config
Host *
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

```bash
mkdir -p ~/.ssh/sockets
```

## Questions & Support

- Post questions as Issues
- Follow the Issue template for bug reports

## License

This project is released under the MIT License. Contributions will also be released under the same license.
