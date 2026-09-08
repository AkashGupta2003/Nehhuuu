// Glue code: sidebar/topbar navigation, settings panel, memories board,
// notes board, and the "Cute Questions" starter grid. Everything here is
// client-side / in-memory by design (resets on page reload).
(function () {
  const STARTER_QUESTIONS = [
    "What made you smile today?",
    "If we could teleport anywhere right now, where would we go?",
    "What's your favorite memory of us so far?",
    "Describe your perfect lazy Sunday.",
    "What's something small that always cheers you up?",
    "If you could have any superpower for a day, what would it be?",
    "What song is stuck in your head right now?",
    "Tell me your comfort food order.",
  ];

  // ---------------- Navigation (desktop sidebar) ----------------
  function switchView(name) {
    document.querySelectorAll(".side-nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === name)
    );
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("active", v.id === "view-" + name)
    );
  }

  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.nav));
  });

  // ---------------- Mobile screen navigation ----------------
  // On phones the 3-column desktop layout collapses into one full screen at
  // a time (home / chat / mcq / world / notes / settings / menu), tracked by
  // body[data-screen] and driven entirely by CSS media queries in style.css.
  const MOBILE_BREAKPOINT = 860;
  const MOBILE_SCREEN_TITLES = {
    chat: "My Cute AI",
    questions: "Cute Questions",
    mcq: "Cute MCQs",
    world: "Our Little World",
    notes: "Notes for You",
    settings: "Settings",
    menu: (window.SITE_CONFIG && window.SITE_CONFIG.partnerFullName) || "Menu",
  };
  const VIEW_SCREENS = ["chat", "questions", "world", "notes", "settings"];

  function isMobileView() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function setScreen(name) {
    document.body.dataset.screen = name;
    const titleEl = document.getElementById("mobile-topbar-title");
    if (titleEl) titleEl.textContent = MOBILE_SCREEN_TITLES[name] || "";
    if (VIEW_SCREENS.includes(name)) {
      switchView(name);
    }
    if (name === "mcq" && window.CuteMCQ) {
      window.CuteMCQ.ensureLoaded();
    }
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-mobile-nav]").forEach((btn) => {
    btn.addEventListener("click", () => setScreen(btn.dataset.mobileNav));
  });

  const mobileBackBtn = document.getElementById("mobile-back-btn");
  if (mobileBackBtn) mobileBackBtn.addEventListener("click", () => setScreen("home"));

  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => setScreen("menu"));

  const mobileMenuFab = document.getElementById("mobile-menu-fab");
  if (mobileMenuFab) mobileMenuFab.addEventListener("click", () => setScreen("menu"));

  window.CuteMobile = { isMobileView, setScreen };

  // ---------------- Cute Questions starter grid ----------------
  function renderStarters() {
    const grid = document.getElementById("starter-grid");
    if (!grid) return;
    grid.innerHTML = STARTER_QUESTIONS.map(
      (q) => `<button class="starter-chip">${q}</button>`
    ).join("");
    grid.querySelectorAll(".starter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        switchView("chat");
        window.CuteChat.sendMessage(chip.textContent);
      });
    });
  }

  // ---------------- Our Little World (memories) ----------------
  const memories = [];
  function renderMemories() {
    const grid = document.getElementById("memory-grid");
    if (!grid) return;
    if (memories.length === 0) {
      grid.innerHTML = '<p class="mcq-loading">No memories added yet — add your first one above ♥</p>';
      return;
    }
    grid.innerHTML = memories
      .map(
        (m, i) => `
        <div class="memory-item">
          <button class="del-btn" data-idx="${i}" aria-label="Delete">✕</button>
          <h4>${escapeHtml(m.title)}</h4>
          <p>${escapeHtml(m.note)}</p>
        </div>`
      )
      .join("");
    grid.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        memories.splice(Number(btn.dataset.idx), 1);
        renderMemories();
      });
    });
  }

  const memoryForm = document.getElementById("memory-form");
  if (memoryForm) {
    memoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const titleEl = document.getElementById("memory-title");
      const noteEl = document.getElementById("memory-note");
      if (!titleEl.value.trim() || !noteEl.value.trim()) return;
      memories.unshift({ title: titleEl.value.trim(), note: noteEl.value.trim() });
      titleEl.value = "";
      noteEl.value = "";
      renderMemories();
    });
  }

  // ---------------- Notes for You ----------------
  const notes = [];
  function renderNotes() {
    const board = document.getElementById("notes-board");
    if (!board) return;
    if (notes.length === 0) {
      board.innerHTML = '<p class="mcq-loading">No notes yet — pin one above ♥</p>';
      return;
    }
    board.innerHTML = notes
      .map(
        (n, i) => `
        <div class="note-item">
          <button class="del-btn" data-idx="${i}" aria-label="Delete">✕</button>
          <p>${escapeHtml(n)}</p>
        </div>`
      )
      .join("");
    board.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        notes.splice(Number(btn.dataset.idx), 1);
        renderNotes();
      });
    });
  }

  const noteForm = document.getElementById("note-form");
  if (noteForm) {
    noteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("note-input");
      if (!input.value.trim()) return;
      notes.unshift(input.value.trim());
      input.value = "";
      renderNotes();
    });
  }

  // ---------------- Settings ----------------
  const THEMES = {
    rose: "#e75480",
    lilac: "#c084fc",
    coral: "#fb7185",
    pink: "#f472b6",
  };

  document.querySelectorAll(".swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      const color = THEMES[sw.dataset.theme];
      if (color) document.documentElement.style.setProperty("--accent", color);
    });
  });

  const heartsToggle = document.getElementById("toggle-hearts");
  if (heartsToggle) {
    heartsToggle.addEventListener("change", () => {
      window.CuteAnimations.setHeartsEnabled(heartsToggle.checked);
    });
  }

  const resetChatBtn = document.getElementById("reset-chat-btn");
  if (resetChatBtn) {
    resetChatBtn.addEventListener("click", async () => {
      await fetch("/api/chat/reset", { method: "POST" });
      document.getElementById("chat-messages").innerHTML = "";
      const nickname = (window.SITE_CONFIG && window.SITE_CONFIG.partnerNickname) || "there";
      window.CuteChat.addMessage("ai", `Fresh start, ${nickname}! 💗 What's on your mind?`);
    });
  }

  const resetMcqBtn = document.getElementById("reset-mcq-btn");
  if (resetMcqBtn) {
    resetMcqBtn.addEventListener("click", () => window.CuteMCQ.resetScore());
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStarters();
    renderMemories();
    renderNotes();
    if (isMobileView() && !document.body.dataset.screen) {
      setScreen("home");
    }
  });

  // If the viewport crosses the mobile breakpoint after load (e.g. rotating
  // a tablet, or resizing a browser window), make sure a screen is set so
  // the mobile layout isn't stuck blank.
  let wasMobile = null;
  window.addEventListener("resize", () => {
    const nowMobile = isMobileView();
    if (nowMobile && !wasMobile && !document.body.dataset.screen) {
      setScreen("home");
    }
    wasMobile = nowMobile;
  });
})();
