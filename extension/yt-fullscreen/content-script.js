// ── Suite v2 YT Fullscreen — Content Script (youtube.com only) ──
(function () {
  "use strict";

  const BUTTON_ID = "__suite_v2_yt_fs_button__";
  const FULLSCREEN_CLASS = "__suite_v2_yt_fullscreen__";
  const VIDEO_STORE_KEY = "ytFullscreen.videos";
  let isActive = false;

  const YT_DEFAULTS = { enabled: true, rememberPerVideo: false, keyboardShortcutEnabled: true };

  async function getStorage(key, fallback) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function setStorage(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch { /* ignore */ }
  }

  function videoId() {
    try {
      return new URL(location.href).searchParams.get("v");
    } catch {
      return null;
    }
  }

  const PRIMARY = {
    theaterButton: ".ytp-size-button",
    playerControlsRight: ".ytp-right-controls",
  };
  const FALLBACK = {
    playerControlsRight: ".ytp-chrome-controls .ytp-right-controls, .html5-video-player .ytp-right-controls",
  };

  function queryWithFallback(primary, fallback) {
    return document.querySelector(primary) ?? document.querySelector(fallback);
  }

  function clickTheaterModeIfNotActive() {
    const theaterBtn = document.querySelector(PRIMARY.theaterButton);
    const isTheaterActive = document.querySelector("ytd-watch-flexy[theater]");
    if (theaterBtn && !isTheaterActive && theaterBtn.click) theaterBtn.click();
  }

  async function applyFullscreenLayout(settings) {
    clickTheaterModeIfNotActive();
    document.documentElement.classList.add(FULLSCREEN_CLASS);
    isActive = true;
    // Remember-per-video: persist this video id
    if (settings?.rememberPerVideo) {
      const id = videoId();
      if (id) {
        const known = await getStorage(VIDEO_STORE_KEY, []);
        if (!known.includes(id)) {
          known.push(id);
          await setStorage(VIDEO_STORE_KEY, known.slice(-200));
        }
      }
    }
  }

  function removeFullscreenLayout() {
    document.documentElement.classList.remove(FULLSCREEN_CLASS);
    isActive = false;
    // Exit theater so second click returns to normal, not theater (user wants windowed ↔ normal only)
    // YouTube's theater state is ytd-watch-flexy[theater]; click the size button, with fallbacks.
    try {
      const tryExitTheater = () => {
        const flexy = document.querySelector("ytd-watch-flexy");
        const isTheaterActive = document.querySelector("ytd-watch-flexy[theater]") || (flexy && flexy.hasAttribute("theater"));
        if (!isTheaterActive) return false;
        // Try every known theater button selector
        const candidates = [
          document.querySelector(PRIMARY.theaterButton),
          document.querySelector("button.ytp-size-button"),
          document.querySelector(".ytp-size-button"),
        ].filter(Boolean);
        for (const btn of candidates) {
          try { btn.click(); } catch {}
          // Dispatch synthetic click as backup (YouTube sometimes listens to mouse events)
          try {
            btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          } catch {}
          // If attribute fell off after click, we're done
          if (!document.querySelector("ytd-watch-flexy[theater]")) return true;
        }
        // Fallback: force attribute removal + resize dispatch (YouTube will reflow)
        try {
          if (flexy && flexy.hasAttribute("theater")) flexy.removeAttribute("theater");
          window.dispatchEvent(new Event("resize"));
        } catch {}
        return true;
      };
      tryExitTheater();
      // YouTube applies theater async — retry once after 120ms if still active
      setTimeout(() => {
        if (document.querySelector("ytd-watch-flexy[theater]")) tryExitTheater();
      }, 120);
    } catch { /* ignore */ }
  }

  function toggle(settings) {
    // Use DOM as source of truth — isActive can desync after SPA navigations/re-injects
    const active = isActive || document.documentElement.classList.contains(FULLSCREEN_CLASS);
    if (active) removeFullscreenLayout();
    else applyFullscreenLayout(settings);
  }

  function injectToggleButton(settings) {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
      if (existing.isConnected) return;
      existing.remove();
    }
    const controls = queryWithFallback(PRIMARY.playerControlsRight, FALLBACK.playerControlsRight);
    if (!controls) return;

    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.className = "ytp-button";
    btn.title = "Toggle Suite Windowed Fullscreen (`)";
    btn.setAttribute("aria-label", "Toggle Suite Windowed Fullscreen (`)");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 4h6v2H6v4H4V4zm14 0h-6v2h4v4h2V4zM4 20h6v-2H6v-4H4v6zm14 0h-6v-2h4v-4h2v6z"/></svg>`;
    btn.style.cssText = "min-width: auto; padding: 6px; margin-left: 8px;";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(settings);
    });
    controls.prepend(btn);
  }

  const navigationHandler = (settings) => () => {
    setTimeout(async () => {
      injectToggleButton(settings);
      if (settings.rememberPerVideo) {
        const id = videoId();
        const known = await getStorage(VIDEO_STORE_KEY, []);
        if (id && known.includes(id)) {
          applyFullscreenLayout(settings);
          return;
        }
      }
      if (isActive) applyFullscreenLayout(settings);
    }, 300);
  };

  function keyHandler(settings) {
    return (e) => {
      const target = e.target;
      const tag = ((target && target.tagName) || "").toUpperCase();
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || !!(target && target.isContentEditable);
      // Esc always exits windowed fullscreen (even while typing, to mimic YouTube)
      if (e.key === "Escape" && (isActive || document.documentElement.classList.contains(FULLSCREEN_CLASS))) {
        e.preventDefault();
        removeFullscreenLayout();
        return;
      }
      if (isTyping) return;
      const isBacktick = e.key === "`" || e.key === "´" || e.key === "~" || e.code === "Backquote";
      if (isBacktick) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        toggle(settings);
        return;
      }
      // keep legacy Alt+Shift+Y as fallback
      if (e.key.toLowerCase() === "y" && e.altKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggle(settings);
      }
    };
  }

  function messageHandler(settings) {
    return (message) => {
      if (message && message.type === "TOGGLE_YT_FULLSCREEN") toggle(settings);
    };
  }

  (async function init() {
    let settings = YT_DEFAULTS;
    let nav = null;
    let onKey = null;
    let onMsg = null;
    try {
      settings = await getStorage("ytFullscreen.settings", YT_DEFAULTS);
      if (!settings.enabled) return;

      try {
        await Promise.race([
          new Promise((resolve) => {
            let done = false;
            const check = () => {
              if (document.querySelector("#movie_player")) {
                done = true;
                resolve();
              } else if (!done) {
                setTimeout(check, 100);
              }
            };
            check();
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Player not found")), 10000)),
        ]);
      } catch { /* try anyway */ }

      injectToggleButton(settings);

      const handler = navigationHandler(settings);
      document.addEventListener("yt-navigate-finish", handler);
      let lastUrl = location.href;
      const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          handler();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      nav = { observer, handler };

      if (settings.keyboardShortcutEnabled) {
        onKey = keyHandler(settings);
        document.addEventListener("keydown", onKey, true);
      }

      onMsg = messageHandler(settings);
      chrome.runtime.onMessage.addListener(onMsg);

      const cleanup = () => {
        if (nav) {
          document.removeEventListener("yt-navigate-finish", nav.handler);
          nav.observer?.disconnect();
        }
        if (onKey) document.removeEventListener("keydown", onKey, true);
        if (onMsg) chrome.runtime.onMessage.removeListener(onMsg);
        removeFullscreenLayout();
        document.getElementById(BUTTON_ID)?.remove();
      };
      window.addEventListener("pagehide", cleanup);
      window.addEventListener("beforeunload", cleanup);
    } catch (err) {
      console.error("[Suite v2 YT Fullscreen] Init error:", err);
    }
  })();
})();
