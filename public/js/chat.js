// Chat panel: sends/receives messages from the Flask /api/chat endpoint.
(function () {
  const messagesEl = document.getElementById("chat-messages");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("chat-input");
  const typingEl = document.getElementById("typing-indicator");
  const sendBtn = formEl ? formEl.querySelector(".send-btn") : null;

  function nowLabel() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  function addMessage(role, text, time) {
    const row = document.createElement("div");
    row.className = "msg-row " + (role === "user" ? "user" : "ai");

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "🙂" : "🤖";

    const bubbleWrap = document.createElement("div");
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.textContent = text;

    const timeEl = document.createElement("span");
    timeEl.className = "msg-time";
    timeEl.textContent = time || nowLabel();

    bubbleWrap.appendChild(bubble);
    bubbleWrap.appendChild(timeEl);

    row.appendChild(avatar);
    row.appendChild(bubbleWrap);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  function setTyping(on) {
    if (!typingEl) return;
    typingEl.hidden = !on;
    if (on) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage("user", text);
    inputEl.value = "";
    if (sendBtn) sendBtn.disabled = true;
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setTyping(false);
      if (res.ok) {
        addMessage("ai", data.reply, data.time);
      } else {
        addMessage("ai", "Hmm, something went a little wrong there 🥺 try again?");
      }
    } catch (err) {
      setTyping(false);
      addMessage("ai", "I couldn't quite reach you just now — check your connection and try again? 💗");
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  if (formEl) {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(inputEl.value);
    });
  }

  // Quick-action chips (excluding the MCQ one, handled in mcq.js)
  document.querySelectorAll(".chip[data-prompt]").forEach((chip) => {
    chip.addEventListener("click", () => {
      showChatView();
      sendMessage(chip.dataset.prompt);
    });
  });

  function showChatView() {
    document.querySelectorAll(".side-nav-item").forEach((b) => b.classList.remove("active"));
    const chatNav = document.querySelector('.side-nav-item[data-nav="chat"]');
    if (chatNav) chatNav.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const chatView = document.getElementById("view-chat");
    if (chatView) chatView.classList.add("active");
  }

  window.CuteChat = { addMessage, sendMessage, showChatView };

  document.addEventListener("DOMContentLoaded", () => {
    const nickname = (window.SITE_CONFIG && window.SITE_CONFIG.partnerNickname) || "there";
    addMessage("ai", `Hii ${nickname}! 💕`, nowLabel());
    addMessage("ai", "How are you today? 🥰");
  });
})();
