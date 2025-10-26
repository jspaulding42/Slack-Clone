# Repository Guidelines

## Project Structure & Module Organization
- `src/main.tsx` mounts the React 19 app; route all new providers through this entrypoint.
- Feature logic lives in `src/components/` (UI), `src/lib/` (Firebase + chat services), and `src/hooks/` (state helpers); assets and global styles stay in `src/assets/`, `App.css`, and `index.css`.
- `public/` holds static files copied verbatim by Vite, while `index.html` defines the shell template.
- Keep Firebase credentials isolated to `src/firebaseConfig.ts`; never commit real keys—use the placeholder pattern from the README.

## Build, Test, and Development Commands
- `npm run dev` launches Vite with hot reload; ideal for manual Slack-style flows across channels and messages.
- `npm run build` runs the TypeScript project references (`tsc -b`) and emits a production bundle via Vite.
- `npm run preview` serves the most recent build to validate optimized assets before release.
- `npm run lint` executes the flat ESLint config (`eslint.config.js`); add `--fix` when making mechanical formatting updates.

## Coding Style & Naming Conventions
- TypeScript + JSX with 2-space indentation, single quotes, and no semicolons; match the existing formatting or run ESLint before pushing.
- Components and hooks are functional: use PascalCase for components (`ChannelSidebar`) and camelCase for hooks/utilities (`useLocalStorage`, `chatService`).
- Derive reusable logic under `src/lib/` or `src/hooks/` rather than embedding Firebase calls in components.
- Keep CSS class names kebab-case and colocate component-specific rules inside `App.css` until a dedicated module is justified.

## Testing Guidelines
- No automated suite ships yet; new features should introduce Vitest + React Testing Library tests stored in `src/__tests__/` or next to the component as `*.test.tsx`.
- Mirror critical behaviors (channel creation, message send, Firebase fallbacks) with lightweight unit tests plus manual smoke tests via `npm run dev`.
- Document any new test commands in `package.json` scripts and ensure they run headlessly in CI.

## Commit & Pull Request Guidelines
- Follow the existing concise, imperative commit style (`fix config export`, `add sidebar state`). Scope commits narrowly and reference issue IDs when relevant.
- Every PR should include: summary of changes, manual/automated test evidence, screenshots or screen recordings for UI tweaks, and notes about Firebase or config impacts.
- Do not include real Firebase secrets in commits; provide `.env.example` updates or setup steps instead.
