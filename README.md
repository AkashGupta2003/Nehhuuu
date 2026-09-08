# For My Nehuuu — Cute AI Companion Site (Node.js backend)

Same app as the Flask version, rebuilt on **Node.js + Express**: a warm AI
chat companion (powered by Groq) and a live, model-generated cute MCQ game,
with an animated hero scene instead of a static photo. The frontend
(HTML/CSS/JS) is unchanged — only the backend and templating engine differ.

## Features

- **Chat with AI** — real conversation with a Groq LLM, given a warm, wholesome
  "cute companion" persona. Quick-action chips (Tell me something cute,
  Motivate me, I'm tired, Suggest a movie, Random question).
- **Cute MCQ** — every question is generated live by the Groq model as strict
  JSON (question + 4 options + correct answer + fun note). Answers are
  verified server-side (the correct answer is never sent to the browser
  before submission), and the reaction message is also model-generated.
- **Cute Questions** — a grid of conversation-starter prompts that feed
  straight into the chat.
- **Our Little World** — a simple memory board (add/delete cards).
- **Notes for You** — sticky notes board.
- **Settings** — accent color themes, toggle the floating-hearts animation,
  reset chat history / MCQ score.
- Animated hero scene (floating hearts, CSS/JS) in place of a static photo.
- Graceful offline fallbacks: if `GROQ_API_KEY` isn't set or a request fails,
  the app still works using built-in fallback replies/questions instead of
  crashing.

## Setup

1. **Install Node.js 18+** if you don't already have it.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   - `GROQ_API_KEY` — get a free key at https://console.groq.com/keys
   - `GROQ_MODEL` — defaults to `llama-3.3-70b-versatile` (any current Groq
     chat model works)
   - `SESSION_SECRET` — set this to any random string
   - `SITE_TITLE`, `SITE_TAGLINE`, `PARTNER_FULL_NAME`, `PARTNER_NICKNAME`,
     `YOUR_NAME` — personalize every name/label shown on the site without
     touching any code

4. **Run it**

   ```bash
   npm start
   # or, for auto-restart on file changes during development:
   npm run dev
   ```

   Then open http://localhost:5000

## How it's built

```
server.js            Express app: routes, Groq calls, persona prompts
views/index.ejs       Page markup (EJS for personalization)
public/css/style.css  Pink theme, layout, chat bubbles, MCQ card, animations
public/js/chat.js     Chat send/receive + quick-action chips
public/js/mcq.js      Fetches/renders/submits model-generated MCQs
public/js/animations.js  Floating-hearts hero animation (replaces static photo)
public/js/app.js      Sidebar nav, settings, memories board, notes board
```

The four files under `public/js/` and `public/css/style.css` are byte-for-byte
the same as the Flask version's frontend — they only talk to the `/api/*`
endpoints, which have an identical shape in both backends, so nothing needed
to change there.

### API endpoints

| Method | Path               | Purpose                                            |
|--------|---------------------|-----------------------------------------------------|
| POST   | `/api/chat`          | Send a message, get an AI reply                    |
| POST   | `/api/chat/reset`    | Clear chat history for the current session          |
| POST   | `/api/mcq/new`       | Ask the model for a new MCQ (answer kept server-side)|
| POST   | `/api/mcq/answer`    | Submit an answer, get correctness + model reaction   |
| POST   | `/api/mcq/reset`     | Reset the MCQ score                                  |

### Notes on persistence

Chat history and MCQ progress are **in-memory only** — they live in a plain
JS object on the server for the lifetime of the process and reset whenever
you restart it. Sessions are tracked with `express-session`'s default
in-memory store via a signed cookie, so multiple browser tabs/visits stay
independent. (The default `MemoryStore` will log a warning that it's not
for production — that's expected for this personal-project scope; swap in
`connect-redis` or similar if you ever need it to survive restarts or scale
across processes.)

### Personalizing further

- Replace the avatar blob in `views/index.ejs` / `style.css` with a real
  photo by dropping an image into `public/img/` and swapping the
  `.avatar-blob` div for an `<img>` tag.
- Add more quick-action chips in `views/index.ejs` (`#quick-actions`) — each
  just needs a `data-prompt="..."` attribute.
- Tweak the persona voice in `SYSTEM_PROMPT` / `MCQ_SYSTEM_PROMPT` inside
  `server.js`.

## Production notes

This is built for a single-process local/personal deployment (the in-memory
session store assumes one process). If you ever deploy this publicly,
consider: moving session state to Redis, running behind a process manager
like PM2, setting `NODE_ENV=production`, and never committing your real
`.env` / API key to source control.
