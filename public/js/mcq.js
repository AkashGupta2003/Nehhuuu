// MCQ widget: fetches a fresh, model-generated multiple-choice question from
// the Flask backend, lets the user answer, and shows a model-generated reaction.
(function () {
  const bodyEl = document.getElementById("mcq-body");
  const progressFill = document.getElementById("mcq-progress-fill");
  const progressLabel = document.getElementById("mcq-progress-label");

  let current = null; // { question_id, question, options }
  let answered = false;

  function updateProgress(stats) {
    if (!stats) return;
    const pct = stats.asked ? Math.round((stats.correct / stats.asked) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = `${stats.correct}/${stats.asked} correct`;
  }

  function renderLoading() {
    bodyEl.innerHTML = '<p class="mcq-loading">Thinking of a cute question...</p>';
  }

  function renderQuestion(data) {
    current = data;
    answered = false;
    const optionsHtml = Object.entries(data.options)
      .map(
        ([letter, text]) => `
        <button class="mcq-option" data-letter="${letter}">
          <span class="mcq-option-letter">${letter}</span>
          <span>${escapeHtml(text)}</span>
        </button>`
      )
      .join("");

    bodyEl.innerHTML = `
      <div class="mcq-question">${escapeHtml(data.question)}</div>
      <div id="mcq-options">${optionsHtml}</div>
      <button class="mcq-submit-btn" id="mcq-submit" disabled>Submit Answer</button>
    `;

    let selectedLetter = null;
    bodyEl.querySelectorAll(".mcq-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (answered) return;
        bodyEl.querySelectorAll(".mcq-option").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedLetter = btn.dataset.letter;
        document.getElementById("mcq-submit").disabled = false;
      });
    });

    document.getElementById("mcq-submit").addEventListener("click", () => {
      if (!selectedLetter || answered) return;
      submitAnswer(selectedLetter);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadNewQuestion() {
    renderLoading();
    try {
      const res = await fetch("/api/mcq/new", { method: "POST" });
      const data = await res.json();
      updateProgress(data.stats);
      renderQuestion(data);
    } catch (err) {
      bodyEl.innerHTML = '<p class="mcq-loading">Couldn\'t load a question — try again in a moment.</p>';
    }
  }

  async function submitAnswer(letter) {
    if (!current || answered) return;
    answered = true;
    const submitBtn = document.getElementById("mcq-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Checking...";
    }
    try {
      const res = await fetch("/api/mcq/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: current.question_id, selected: letter }),
      });
      const data = await res.json();
      if (!res.ok) {
        bodyEl.insertAdjacentHTML(
          "beforeend",
          `<div class="mcq-reaction">${escapeHtml(data.error || "Something went wrong.")}</div>`
        );
        return;
      }

      document.querySelectorAll(".mcq-option").forEach((btn) => {
        if (btn.dataset.letter === data.correct_option) {
          btn.classList.add("correct");
        } else if (btn.dataset.letter === letter && !data.correct) {
          btn.classList.add("incorrect");
        }
      });

      bodyEl.insertAdjacentHTML(
        "beforeend",
        `<div class="mcq-reaction">${data.correct ? "✅ " : "💗 "}${escapeHtml(data.reaction)}</div>
         <button class="mcq-next-btn" id="mcq-next">Next question ♥</button>`
      );
      document.getElementById("mcq-next").addEventListener("click", loadNewQuestion);
      updateProgress(data.stats);
    } catch (err) {
      bodyEl.insertAdjacentHTML(
        "beforeend",
        '<div class="mcq-reaction">Couldn\'t check that just now — tap Next to try a new one.</div>' +
          '<button class="mcq-next-btn" id="mcq-next">Next question ♥</button>'
      );
      document.getElementById("mcq-next").addEventListener("click", loadNewQuestion);
    }
  }

  async function resetScore() {
    await fetch("/api/mcq/reset", { method: "POST" });
    updateProgress({ asked: 0, correct: 0 });
    loadNewQuestion();
  }

  function ensureLoaded() {
    // Called when the mobile MCQ screen is opened — only fetches if nothing
    // has loaded yet (e.g. the initial page-load fetch failed), since a
    // question is normally already fetched on DOMContentLoaded.
    if (!current) loadNewQuestion();
  }

  window.CuteMCQ = { loadNewQuestion, resetScore, ensureLoaded };

  document.addEventListener("DOMContentLoaded", loadNewQuestion);

  const chipMcq = document.getElementById("chip-mcq");
  if (chipMcq) {
    chipMcq.addEventListener("click", () => {
      if (window.CuteMobile && window.CuteMobile.isMobileView()) {
        window.CuteMobile.setScreen("mcq");
      } else {
        const mcqCard = document.querySelector(".mcq-card");
        if (mcqCard) mcqCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
})();
