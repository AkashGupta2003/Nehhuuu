// Floating-hearts hero animation — replaces the static photo with a small
// generative CSS/JS scene. Pure DOM, no external assets.
(function () {
  const HEART_CHARS = ["♥", "💗", "💕", "✨"];
  let heartsEnabled = true;
  let intervalId = null;

  function spawnHeart(container) {
    if (!heartsEnabled) return;
    const el = document.createElement("span");
    el.className = "floating-heart";
    el.textContent = HEART_CHARS[Math.floor(Math.random() * HEART_CHARS.length)];
    const left = Math.random() * 90 + 2;
    const duration = 4 + Math.random() * 3;
    const drift = (Math.random() * 60 - 30).toFixed(0) + "px";
    el.style.left = left + "%";
    el.style.setProperty("--drift", drift);
    el.style.animationDuration = duration + "s";
    el.style.fontSize = 0.8 + Math.random() * 0.9 + "rem";
    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000 + 200);
  }

  function start() {
    const container = document.getElementById("hero-animation");
    if (!container) return;
    if (intervalId) clearInterval(intervalId);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => spawnHeart(container), i * 300);
    }
    intervalId = setInterval(() => spawnHeart(container), 700);
  }

  function setHeartsEnabled(value) {
    heartsEnabled = value;
  }

  window.CuteAnimations = { start, setHeartsEnabled };

  document.addEventListener("DOMContentLoaded", start);
})();
