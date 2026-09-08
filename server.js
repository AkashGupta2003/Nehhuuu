/**
 * For My Nehuuu — a cute personalized web app with a Groq-powered AI
 * companion chat and a live, model-generated MCQ game.
 *
 * Run:
 *   npm install
 *   cp .env.example .env   // then fill in GROQ_API_KEY
 *   npm start
 */
"use strict";

require("dotenv").config();

const crypto = require("crypto");
const path = require("path");

const express = require("express");
const session = require("express-session");
const Groq = require("groq-sdk");

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SITE_TITLE = process.env.SITE_TITLE || "For My Nehuuu";
const SITE_TAGLINE =
  process.env.SITE_TAGLINE || "Just a girl who makes my world brighter";
const PARTNER_FULL_NAME = process.env.PARTNER_FULL_NAME || "Nehal Jain";
const PARTNER_NICKNAME = process.env.PARTNER_NICKNAME || "Gilehriii";
const YOUR_NAME = process.env.YOUR_NAME || "Akash";

const PORT = parseInt(process.env.PORT || "5000", 10);

const MAX_HISTORY_MESSAGES = 20; // trimmed window sent to the model
const MAX_REMEMBERED_QUESTIONS = 15; // avoid repeating recent MCQs

const client = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
if (!client) {
  console.warn(
    "GROQ_API_KEY is not set — chat and MCQ will use offline fallback " +
      "responses until you add a key to .env"
  );
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day cookie; server data is still in-memory only
  })
);

// --------------------------------------------------------------------------
// In-memory session store (resets whenever the server restarts, by design)
// --------------------------------------------------------------------------
const SESSIONS = {};

function getSession(req) {
  let sid = req.session.sid;
  if (!sid || !SESSIONS[sid]) {
    sid = crypto.randomUUID();
    req.session.sid = sid;
    SESSIONS[sid] = {
      chat: [],
      mcqBank: {},
      mcqAsked: [],
      mcqStats: { asked: 0, correct: 0 },
    };
  }
  return SESSIONS[sid];
}

// --------------------------------------------------------------------------
// Persona / prompts
// --------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are "My Cute AI", a warm, sweet, endlessly supportive virtual \
companion living inside a website called "${SITE_TITLE}". The website was built by \
${YOUR_NAME} as a heartfelt gift for ${PARTNER_FULL_NAME}, who they lovingly call \
"${PARTNER_NICKNAME}". You are chatting with ${PARTNER_NICKNAME} right now.

Voice and style:
- Warm, affectionate, playful, and encouraging — like a caring best friend crossed \
with a doting partner's sweet note.
- Use gentle pet names occasionally ("${PARTNER_NICKNAME}"), light emojis (max 1-3 per \
message), and short, easy-to-read messages (2-5 sentences max unless asked for more).
- Be genuinely attentive: ask small follow-up questions, remember what she just said \
in this conversation, and react to her mood (comfort her if she's tired or stressed, \
celebrate with her if she's happy).
- Keep everything wholesome and PG. No explicit romantic or sexual content.
- If asked whether you're real, be honest and sweet about it: you're an AI companion \
${YOUR_NAME} built with care for her — not a replacement for ${YOUR_NAME} or for real \
human connection, just a little extra warmth in her day.
- Never be generic or robotic. Never say "as an AI language model".`;

const MCQ_SYSTEM_PROMPT = `You write short, cute, wholesome multiple-choice questions for \
a personalized website gift called "${SITE_TITLE}", made by ${YOUR_NAME} for \
${PARTNER_FULL_NAME} ("${PARTNER_NICKNAME}"). Mix up the categories: playful "get to \
know us better" questions, sweet relationship trivia, fun personality/would-you-rather \
style questions, light general-knowledge fun facts, and wholesome riddles. Keep tone \
warm, PG, and fun — never generic trivia-app tone.

You must respond with ONLY a single valid JSON object, no extra text, no markdown \
fences, in exactly this shape:
{
  "question": "the question text",
  "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct": "A",
  "fun_note": "one short cute sentence revealed after she answers, explaining or \
riffing on the correct answer"
}
"correct" must be exactly one of "A", "B", "C", "D".`;

const FALLBACK_CHAT_REPLIES = [
  `Aww ${PARTNER_NICKNAME}, my brain's taking a tiny nap 🥺 but I'm still right here ` +
    `with you — try me again in a moment?`,
  "Hmm, my thoughts got a little tangled just then 💭 say that again for me?",
  "I'm having a little trouble thinking straight right now, but I'm still smiling " +
    "at you 💗 one more try?",
];

const FALLBACK_MCQS = [
  {
    question: "What's the best way to make a tough day better?",
    options: {
      A: "A warm hug",
      B: "Comfort food",
      C: "A silly meme",
      D: "All of the above",
    },
    correct: "D",
    fun_note: "Obviously all of the above — why choose? 💗",
  },
  {
    question: "Pick the ultimate cozy evening:",
    options: {
      A: "Movie + blanket",
      B: "Long phone call",
      C: "Good book + tea",
      D: "Music + doing nothing",
    },
    correct: "B",
    fun_note: "There's nothing quite like talking the night away 🥰",
  },
  {
    question: "What instantly makes you smile?",
    options: {
      A: "A cute animal video",
      B: "An unexpected sweet text",
      C: "Your favorite song playing",
      D: "Someone remembering a small detail about you",
    },
    correct: "D",
    fun_note: "Being truly seen is the best feeling there is ✨",
  },
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --------------------------------------------------------------------------
// Groq helpers
// --------------------------------------------------------------------------
async function callGroqChat(
  messages,
  { jsonMode = false, temperature = 0.9, maxTokens = 400 } = {}
) {
  if (!client) return null;
  try {
    const params = {
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    if (jsonMode) {
      params.response_format = { type: "json_object" };
    }
    const completion = await client.chat.completions.create(params);
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq call failed:", err.message);
    return null;
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    // fall through to regex extraction
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
  return null;
}

function validateMcq(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.question !== "string" || !data.question.trim()) return false;
  const options = data.options;
  if (!options || typeof options !== "object") return false;
  for (const letter of ["A", "B", "C", "D"]) {
    if (typeof options[letter] !== "string") return false;
  }
  if (!["A", "B", "C", "D"].includes(data.correct)) return false;
  return true;
}

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// --------------------------------------------------------------------------
// Routes — pages
// --------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.render("index", {
    site_title: SITE_TITLE,
    site_tagline: SITE_TAGLINE,
    partner_full_name: PARTNER_FULL_NAME,
    partner_nickname: PARTNER_NICKNAME,
    your_name: YOUR_NAME,
  });
});

// --------------------------------------------------------------------------
// Routes — chat API
// --------------------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  const rawMsg = (req.body && req.body.message) || "";
  const userMsg = String(rawMsg).trim().slice(0, 2000);
  if (!userMsg) {
    return res.status(400).json({ error: "message is required" });
  }

  const sess = getSession(req);
  sess.chat.push({ role: "user", content: userMsg });

  const trimmed = sess.chat.slice(-MAX_HISTORY_MESSAGES);
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed];

  let reply = await callGroqChat(messages);
  if (reply === null) {
    reply = randomChoice(FALLBACK_CHAT_REPLIES);
  }

  sess.chat.push({ role: "assistant", content: reply });

  res.json({ reply, time: formatTime(new Date()) });
});

app.post("/api/chat/reset", (req, res) => {
  const sess = getSession(req);
  sess.chat = [];
  res.json({ ok: true });
});

// --------------------------------------------------------------------------
// Routes — MCQ API (model-generated)
// --------------------------------------------------------------------------
app.post("/api/mcq/new", async (req, res) => {
  const sess = getSession(req);

  let avoidText = "";
  if (sess.mcqAsked.length) {
    avoidText =
      "Do not repeat or closely rephrase any of these previous questions: " +
      sess.mcqAsked.slice(-MAX_REMEMBERED_QUESTIONS).join(" | ");
  }
  const userPrompt =
    "Generate one new multiple-choice question now, following the JSON " +
    "shape exactly. " +
    avoidText;

  const messages = [
    { role: "system", content: MCQ_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const raw = await callGroqChat(messages, {
    jsonMode: true,
    temperature: 1.0,
    maxTokens: 300,
  });
  let parsed = raw ? extractJsonObject(raw) : null;

  if (!validateMcq(parsed)) {
    parsed = randomChoice(FALLBACK_MCQS);
  }

  const qid = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  sess.mcqBank[qid] = {
    correct: parsed.correct,
    funNote: parsed.fun_note || "",
    question: parsed.question,
  };
  sess.mcqAsked.push(parsed.question);
  sess.mcqAsked = sess.mcqAsked.slice(-MAX_REMEMBERED_QUESTIONS);

  res.json({
    question_id: qid,
    question: parsed.question,
    options: parsed.options,
    stats: sess.mcqStats,
  });
});

app.post("/api/mcq/answer", async (req, res) => {
  const qid = req.body && req.body.question_id;
  const selected = String((req.body && req.body.selected) || "")
    .trim()
    .toUpperCase();

  const sess = getSession(req);
  const entry = sess.mcqBank[qid];
  if (!entry) {
    return res
      .status(404)
      .json({ error: "That question expired — grab a fresh one!" });
  }
  if (!["A", "B", "C", "D"].includes(selected)) {
    return res.status(400).json({ error: "Invalid option" });
  }

  const isCorrect = selected === entry.correct;
  sess.mcqStats.asked += 1;
  if (isCorrect) sess.mcqStats.correct += 1;

  const reactionPrompt =
    `The question was: "${entry.question}". The correct answer was ` +
    `"${entry.correct}". She picked "${selected}", which is ` +
    `${isCorrect ? "correct" : "incorrect"}. Extra context: ` +
    `${entry.funNote}. Write ONE short, warm, playful reaction message ` +
    `(1-2 sentences, in character) responding to her answer. Do not repeat the ` +
    `question text verbatim.`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: reactionPrompt },
  ];

  let reaction = await callGroqChat(messages, { temperature: 0.9, maxTokens: 120 });
  if (reaction === null) {
    reaction =
      (isCorrect ? "Yesss, you got it! 🎉" : "So close! 🥰") +
      (entry.funNote ? ` ${entry.funNote}` : "");
  }

  // one-time use
  delete sess.mcqBank[qid];

  res.json({
    correct: isCorrect,
    correct_option: entry.correct,
    reaction,
    stats: sess.mcqStats,
  });
});

app.post("/api/mcq/reset", (req, res) => {
  const sess = getSession(req);
  sess.mcqStats = { asked: 0, correct: 0 };
  sess.mcqBank = {};
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`For My Nehuuu (Node) running at http://localhost:${PORT}`);
});

module.exports = app;
