Purpose
This file gives AI coding agents the minimal, high-value knowledge to be immediately productive in this repository.

Big picture
- **Framework:** Next.js (app router) project; UI pages live in `app/*` and API endpoints are server files named `route.ts` under `app/api/*`.
- **DB layer:** MongoDB via `mongoose`; connection helper is `app/db/mongoose.ts` (`connectToDb`). Models live in `app/db/*` (e.g. `ChatSessions.ts`, `Topics.ts`, `Users.ts`).
- **Auth:** Cookie-based JWT helpers in `app/lib/auth.ts`. Cookie name is `auth_token`; use `getUserIdFromRequest()` or `getAuthFromRequest()` inside API routes.
- **AI integrations:** Core tutor logic lives in `app/lib/ai/tutor.ts` and uses `@google/generative-ai` (Gemini) — env var `GEMINI_API_KEY` is expected. The code also includes `openai` in dependencies.

Essential workflows & commands
- Run dev server: `npm run dev` (Next dev on port 3000).
- Build for production: `npm run build` then `npm start`.
- Lint: `npm run lint` (ESLint configured via `eslint-config-next`).
- DB: `connectToDb()` expects `process.env.DATABASE_CONNECTION_STRING`.
- JWT: `process.env.JWT_SECRET` used by `app/lib/auth.ts` (fallback present but change in production).

Project-specific conventions & patterns
- API routes always call `await connectToDb()` early in the request handler before DB operations.
- Authentication: API routes call `getUserIdFromRequest()` (no request arg) to read cookie-based JWT from `next/headers`.
- Chat sessions:
  - Model: `app/db/ChatSessions.ts` stores `messages: ChatMessage[]`, `learningPatterns` (single evolving string), and numeric indices used for incremental analysis: `currentProblemStartIndex`, `lastProblemSummarizedIndex`, `lastPatternsAnalyzedIndex`.
  - Pattern updates use `updateOne({ _id: session._id }, { $set: {...}, $inc: {...} })` rather than replacing the document. See `app/api/topics/[tid]/chat/route.ts` for an example.
- Tutor AI prompts:
  - `app/lib/ai/tutor.ts` exports `ChatMessage` type and functions: `buildSystemPrompt`, `generateProblemProgressSummary`, `refineLearningPatternSummary`, and `generateTutorReply`.
  - The code composes system, learning-pattern, and recent-conversation sections and then calls the Gemini model.

Integration points & environment
- Required/used env variables (search before running):
  - `DATABASE_CONNECTION_STRING` — mongoose connection string (used in `app/db/mongoose.ts`).
  - `GEMINI_API_KEY` — Google generative API key (used in `app/lib/ai/tutor.ts`).
  - `JWT_SECRET` — used to sign/verify auth tokens in `app/lib/auth.ts`.
- External deps to be aware of: `@google/generative-ai`, `openai`, `mongoose`, `jose` (JWT), `bcryptjs` (password hashing).

Where to look for examples
- Chat flow and problem-detection + pattern refinement: `app/api/topics/[tid]/chat/route.ts` — shows how messages are sliced, when summaries are generated, and how learning patterns are refined and persisted.
- Mongoose model conventions: `app/db/ChatSessions.ts`, `app/db/Topics.ts`, `app/db/Users.ts`.
- Auth helpers and cookie handling: `app/lib/auth.ts`.
- Tutor prompt engineering & AI calls: `app/lib/ai/tutor.ts`.

Quick tips for making changes safely
- Follow existing incremental/upsert patterns when changing chat/session code (prefer `$set` + `$inc` updates to avoid race conditions).
- Keep AI prompt changes local to `app/lib/ai/tutor.ts`; tests are manual — run the dev server and exercise the chat UI.
- When adding new API routes, follow the established `route.ts` pattern: connect to DB, verify `userId`, validate params, then run logic.
- Use console logs in API routes (existing code does) for quick debugging in dev mode.

If anything here is unclear or you want more detail (examples or TODOs), tell me which area to expand.
