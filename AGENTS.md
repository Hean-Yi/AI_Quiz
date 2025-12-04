# Repository Guidelines

Concise contributor guide for the AI Quiz repo (Vue client + Express/LangChain server). Keep changes focused, reproducible, and aligned with the structure below.

## Project Structure & Module Organization
- `client/`: Vite + Vue 3 + Pinia + Tailwind. Key areas: `src/views/` (Home, Quiz, Settings), `src/router/` (routes), `src/stores/quizStore.js` (quiz state), `src/style.css` (global + Tailwind layers).
- `server/`: Express API entry `app.js`; uploads saved to `uploads/`; vector data in `data/vectors/`; prompt template in `data/prompt_template.txt`.
- `server/services/`: `pdfService.js` (PDF parsing), `aiService.js` (OpenAI-compatible quiz generation + response parsing), `ragService.js` (HNSWLib vector store + retrieval), `promptService.js` (read/write prompt template).
- Persistent data (`uploads/`, `data/vectors/`) should remain untracked; keep logic in services and views thin.

## Build, Test, and Development Commands
- Install deps: `cd client && npm install`; `cd server && npm install`.
- Client dev: `cd client && npm run dev` (Vite on 5173), `npm run build` (production bundle), `npm run preview` (serve built assets).
- Server dev: `cd server && npm run dev` (nodemon on PORT=3000 by default), `npm start` (production).
- Manual smoke test: run both servers, upload a sample PDF, call `/api/quiz/generate`, confirm quiz renders and vector reuse at `server/data/vectors/<pdfId>`.

## Coding Style & Naming Conventions
- JavaScript/Vue: 2-space indentation, single quotes, no semicolons. Prefer Composition API; component files PascalCase, stores lowerCamel (e.g., `quizStore.js`).
- Styling: Tailwind-first; reusable utility layers in `client/src/style.css`. Keep view logic slim and push API/file/vector work to `services/*`.
- Error handling: follow async/await patterns in `app.js`; avoid hard-coding API keys (accept via request body).

## Testing Guidelines
- No automated suite yet. If adding tests, start with service-level units (PDF parsing, prompt handling, RAG retrieval) and mock OpenAI-compatible calls.
- For now, rely on manual smoke test steps above; document what you exercised.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) with concise scope.
- PRs should summarize changes, list affected endpoints/routes, and note manual test commands/results. Include screenshots/GIFs for UI updates and call out new config/env needs (`PORT`, API keys).

## Security & Configuration Tips
- Never commit secrets or uploaded PDFs. Keep `node_modules/`, `server/uploads/`, and `server/data/vectors/` untracked.
- Clean up stale vector caches (`server/data/vectors/<pdfId>`) if documents are replaced to avoid outdated context.
- Use local `.env` for configuration; do not add it to version control.
