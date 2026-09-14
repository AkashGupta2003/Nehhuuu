(function () {
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-msg");
  const resetForm = document.getElementById("reset-form");
  const resetMsg = document.getElementById("reset-msg");
  const showResetBtn = document.getElementById("show-reset-btn");
  const hideResetBtn = document.getElementById("hide-reset-btn");
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const resendOtpBtn = document.getElementById("resend-otp-btn");
  const otpBlock = document.getElementById("otp-block");
  const resetUsernameInput = document.getElementById("reset-username");

  function showMsg(el, text, kind) {
    el.textContent = text;
    el.className = "auth-msg " + kind;
    el.hidden = false;
  }

  function resetToStep1() {
    otpBlock.hidden = true;
    resetForm.reset();
    resetMsg.hidden = true;
  }

  showResetBtn.addEventListener("click", () => {
    loginForm.hidden = true;
    showResetBtn.hidden = true;
    resetForm.hidden = false;
  });

  hideResetBtn.addEventListener("click", () => {
    resetForm.hidden = true;
    resetToStep1();
    loginForm.hidden = false;
    showResetBtn.hidden = false;
  });

  async function requestOtp() {
    resetMsg.hidden = true;
    const username = resetUsernameInput.value.trim();
    if (!username) {
      showMsg(resetMsg, "Pehle username daalo", "error");
      return;
    }
    try {
      const res = await fetch("/api/auth/request-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(resetMsg, data.error || "OTP nahi bhej paye", "error");
        return;
      }
      otpBlock.hidden = false;
      showMsg(resetMsg, "OTP bhej diya hai ✉️ — check karo", "success");
    } catch (err) {
      showMsg(resetMsg, "Kuch gadbad ho gayi — dubara try karo", "error");
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.hidden = true;
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(loginMsg, data.error || "Login nahi ho paya", "error");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      showMsg(loginMsg, "Kuch gadbad ho gayi — dubara try karo", "error");
    }
  });

  sendOtpBtn.addEventListener("click", requestOtp);
  resendOtpBtn.addEventListener("click", requestOtp);

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (otpBlock.hidden) return; // OTP not requested yet — ignore stray Enter-key submits

    resetMsg.hidden = true;
    const username = resetUsernameInput.value.trim();
    const otp = document.getElementById("reset-otp").value.trim();
    const newPassword = document.getElementById("reset-new").value;
    const confirmPassword = document.getElementById("reset-confirm").value;

    if (newPassword !== confirmPassword) {
      showMsg(resetMsg, "Naya password match nahi kar raha", "error");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(resetMsg, data.error || "Password update nahi ho paya", "error");
        return;
      }
      showMsg(resetMsg, "Password update ho gaya! Ab login karo ♥", "success");
      setTimeout(() => {
        resetForm.hidden = true;
        resetToStep1();
        loginForm.hidden = false;
        showResetBtn.hidden = false;
      }, 1500);
    } catch (err) {
      showMsg(resetMsg, "Kuch gadbad ho gayi — dubara try karo", "error");
    }
  });
})();
