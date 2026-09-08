// Floating-hearts hero animation — replaces the static photo with a small
// generative CSS/JS scene. Pure DOM, no external assets. Spawns into every
// element with class "hero-animation" (the desktop hero card AND the mobile
// Home screen's avatar frame both use this class).
(function () {
  const HEART_CHARS = ["♥", "💗", "💕", "✨"];
  let heartsEnabled = true;
  let intervalId = null;

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function spawnHeart(container) {
    if (!heartsEnabled || !isVisible(container)) return;
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

  function getContainers() {
    return Array.from(document.querySelectorAll(".hero-animation"));
  }

  function start() {
    const containers = getContainers();
    if (!containers.length) return;
    if (intervalId) clearInterval(intervalId);
    containers.forEach((container) => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnHeart(container), i * 300);
      }
    });
    intervalId = setInterval(() => {
      getContainers().forEach(spawnHeart);
    }, 700);
  }

  function setHeartsEnabled(value) {
    heartsEnabled = value;
  }

  window.CuteAnimations = { start, setHeartsEnabled };

  document.addEventListener("DOMContentLoaded", start);
})();
