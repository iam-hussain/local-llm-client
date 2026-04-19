# lmstation

A local-first Next.js client for [LM Studio](https://lmstudio.ai). Chats with your offline models through the LM Studio REST API, stores everything in MongoDB via Prisma, and surfaces the detailed performance stats LM Studio exposes — live tokens/sec, time-to-first-token, generation time, stop reason, per-model usage.

Everything runs on your machine. No cloud inference, no prompts leave your box.

<p align="center">
  <em>Streaming chat · live TPS/TTFT · semantic history search · per-conversation branching · markdown export · dark mode.</em>
</p>

---

## Features

- **Streaming chat** — NDJSON stream from a Next.js API route that proxies LM Studio's `POST /api/v0/chat/completions` and captures its `stats` + `usage` blocks.
- **Live performance readout** — tokens/sec counter updates during generation; final TTFT, generation time, and stop reason land on the saved message.
- **History** — every conversation and message persists in MongoDB. Pin, rename, delete, and filter from the sidebar.
- **Branching** — fork any conversation at a specific message into a new conversation (preserves stats up to the cut).
- **Per-message actions** — copy, star, regenerate, branch, delete. Regenerate drops the old assistant reply and streams a fresh one.
- **Semantic search** — embed past messages with a loaded `text-embedding-*` model and rank by cosine similarity.
- **Model browser** — live `GET /api/v0/models` view: loaded vs. JIT, quant, arch, context length.
- **Stats dashboard** — Recharts views for TPS trend, TTFT trend, tokens-per-day, and a per-model breakdown.
- **System prompt presets** — Coder / Writer / Tutor / Summarizer / Brainstorm / General, one click to seed.
- **Markdown export** — download any conversation as a `.md` file with stats inlined.
- **Dark mode** — full light/dark/system theme with FOUC-safe pre-hydration script.

## Tech

- Next.js 15 (App Router, React 19, RSC)
- TypeScript, Tailwind CSS v4
- shadcn/ui (new-york style, Radix primitives, `lucide-react`)
- Prisma 6 + MongoDB
- Recharts

## Prerequisites

1. **LM Studio** running locally with the REST API enabled. From the CLI:
   ```bash
   lms server start
   lms load <model-id>
   ```
   The default base URL used by this app is `http://127.0.0.1:1234`.
2. **MongoDB connection string** — Atlas free tier is fine.
3. Node.js 20+.

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   Then edit .env:
#     DATABASE_URL="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/localLLM?retryWrites=true&w=majority"
#     LM_STUDIO_BASE_URL="http://127.0.0.1:1234"
#     LM_API_TOKEN=""   # only if you put one in front of LM Studio

# 3. Sync schema
npx prisma db push

# 4. Run
npm run dev
```

Open http://localhost:3000.

> ⚠️ When copying the MongoDB URI from Atlas, **remove the angle brackets** around the password placeholder (`<password>` → `your-password`). Atlas shows them as placeholder syntax; they are not part of the password.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Next dev server                       |
| `npm run build`    | Prisma generate + Next production build |
| `npm run start`    | Serve the production build            |
| `npm run db:push`  | Push Prisma schema to MongoDB         |
| `npm run db:studio`| Open Prisma Studio                    |

## Architecture

```
src/
  app/
    api/
      chat/              — NDJSON streaming proxy with stats capture
      conversations/     — CRUD + [id]/branch fork
      messages/[id]/     — star / edit / delete
      models/            — GET /api/v0/models proxy
      stats/             — aggregate analytics (Mongo aggregateRaw)
      search/            — POST = semantic search, PUT = index
      export/[id]        — conversation → markdown
    c/[id]/              — conversation page
    models/              — model browser
    stats/               — stats dashboard
  components/
    chat-view.tsx        — main chat UI
    chat-composer.tsx    — textarea + send/stop
    message-bubble.tsx   — per-message bubble + actions
    live-stats.tsx       — live TPS/TTFT bar
    model-picker.tsx     — loaded/JIT model select
    sidebar.tsx          — conversation list, theme toggle, nav
    semantic-search.tsx  — embedding-based history search
    settings-sheet.tsx   — system prompt + temperature
    stats-dashboard.tsx  — Recharts analytics page
    theme-provider.tsx   — light/dark/system
    logo.tsx             — animated SVG mark
    ui/                  — shadcn primitives
  hooks/
    use-chat-stream.ts   — streaming hook with atomic bubble swap
  lib/
    lm-studio.ts         — REST client + SSE parser
    prisma.ts            — singleton PrismaClient
    presets.ts           — built-in system prompts
    utils.ts             — cn, formatNumber, formatTime, relativeTime
  prisma/schema.prisma   — Conversation, Message, Preset, Embedding
```

## How the streaming works

`POST /api/chat` reads the conversation from Mongo, optionally writes the new user message, then opens a server-sent-events stream to LM Studio. For each SSE chunk it forwards a small JSON event over NDJSON to the browser:

| Event          | Payload                                      |
| -------------- | -------------------------------------------- |
| `user-saved`   | real message id (replaces the client's temp) |
| `first-token`  | measured TTFT                                |
| `delta`        | the content chunk + live tokens-per-second   |
| `done`         | persisted assistant message + usage + stats  |
| `error`        | error string                                 |

The client hook (`useChatStream`) consumes the stream and swaps the streaming bubble for the persisted bubble **in a single React batch**, so there is no flash between the animated stream caret disappearing and the final message appearing.

## Creative bits

- **Semantic history search** — the PUT on `/api/search` walks unembedded messages, embeds them with whichever `text-embedding-*` model LM Studio currently exposes, and stores the vector as JSON on an `Embedding` collection. Query-time POST ranks by cosine on the stored vectors. No extra vector DB.
- **Branching** — every branch is its own `Conversation` with `parentId` pointing back to the source. Useful for "what if I'd phrased this differently" exploration without losing the original thread.
- **Live caret** — the streaming bubble pulses a caret after the partial markdown while the model is still typing.

## License

MIT.
