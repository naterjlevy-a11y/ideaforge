# IdeaForge

Drop an idea. Come back to a plan.

You type one line — "an app that tracks your Invisalign" — set how long it should
run, and close the tab. A background engine keeps expanding the idea while you're
gone: questioning it, sanity-checking it, filling in architecture. When you come
back there's a technical requirements document you can paste straight into Claude
Code and start building from.

---

## Why it looks like this

Every other tool for this keeps you in the conversation. You ask, it answers, you
ask again, and the whole thing dies when the session does. The thinking only
happens while you're sitting there doing it.

So the unit here is not a message, it's a **run**. You set a duration, the server
works without you, and the output gets richer the longer it goes. Several ideas
can incubate at once, because none of them need your attention while they do.

The other reason it looks like this: the output is a document, not a chat log.
A TRD is a thing you can hand to a build tool. A transcript is not.

---

## How it works

```
 idea ──▶ Postgres ──▶ cron route ──▶ Gemini ──▶ Postgres ──▶ TRD + flowcharts
                            │
                            └── runs on a schedule, not on your attention
```

| | |
|---|---|
| `src/app/api/cron/expand/route.ts` | The scheduled tick. Picks up running ideas and advances them. |
| `src/lib/ai/expand.ts` | One expansion pass: what to ask, what to sanity-check, what to write. |
| `src/lib/ai/prompts.ts` | The prompts. Most of the behaviour lives here rather than in code. |
| `src/app/api/ideas/[id]/answer/route.ts` | When the engine asks you something, this is where the answer goes back in. |
| `src/app/api/ideas/[id]/export/route.ts` | TRD out, as a document. |
| `src/components/FlowchartViewer.tsx` | Mermaid rendering for the architecture the engine produced. |
| `supabase/migrations/001_initial_schema.sql` | The schema. |

**Stack.** Next.js 15 with the app router, React 19, Supabase for Postgres and
auth, Google Gemini for expansion, Mermaid for flowcharts, Tailwind.

---

## Status

**Phase 1 scaffold, built June 2026.** The routes, the schema, the expansion
loop, auth and the viewer are in. It is not a finished product and it is not
deployed anywhere. `TRD.md` in this repo is the full specification, including the
parts that are not built yet, plus a cost analysis and the open questions.

The TRD is also the thing this project is meant to produce, which is either
appropriate or too cute, depending on how you feel about that sort of thing.

---

## Running it

You need a [Supabase](https://supabase.com) project and a Google Gemini API key.

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Gemini keys
# run supabase/migrations/001_initial_schema.sql in the SQL editor
npm run dev
```

The expansion tick is a route, so in development you hit
`/api/cron/expand` yourself; in production it wants a scheduler pointed at it.
