// ── Suite v2 Dimmer — Content Script (all URLs) ──
const OVERLAY_ID = "__suite_v2_dimmer_overlay__";
const MEDIA_STYLE_ID = "__suite_v2_dimmer_media_style__";
const DARK_MODE_ID = "__suite_v2_dimmer_dark_mode__";

const COLOR_PRESETS = {
  black: { r: 0, g: 0, b: 0 },
  brown: { r: 92, g: 60, b: 40 },
  green: { r: 20, g: 60, b: 30 },
  red: { r: 90, g: 20, b: 20 },
  blue: { r: 20, g: 40, b: 90 },
};

const DEFAULTS = { enabled: false, mode: "overlay", intensity: 40, color: "black", blur: false, whitescreenProtection: true, darkMode: false };

async function getStorage(key, fallback) {
  try {
    const r = await chrome.storage.local.get(key);
    return r[key] ?? fallback;
  } catch {
    return fallback;
  }
}

function onStorageChange(key, cb) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[key]) cb(changes[key].newValue, changes[key].oldValue);
  });
}

function resolveColorToRgb(color) {
  if (COLOR_PRESETS[color]) return COLOR_PRESETS[color];
  let hex = String(color || "").replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 6) {
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }
  return COLOR_PRESETS.black;
}

function isNearWhite(colorString) {
  try {
    const m = String(colorString).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [, r, g, b] = m.map(Number);
    return r > 230 && g > 230 && b > 230;
  } catch {
    return false;
  }
}

function checkWhitescreenProtection() {
  try {
    return (
      isNearWhite(getComputedStyle(document.body).backgroundColor) ||
      isNearWhite(getComputedStyle(document.documentElement).backgroundColor)
    );
  } catch {
    return false;
  }
}

function createOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  const shadow = el.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `:host{position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;transition:background-color 150ms ease,backdrop-filter 150ms ease!important}@media print{:host{display:none!important}}`;
  shadow.appendChild(style);
  document.documentElement.appendChild(el);
}

function updateOverlay(settings) {
  const el = document.getElementById(OVERLAY_ID);
  if (!el) return;
  const alpha = settings.intensity / 100;
  const rgb = resolveColorToRgb(settings.color);
  el.style.setProperty("background-color", `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`, "important");
  if (settings.blur) el.style.setProperty("backdrop-filter", "blur(2px)", "important");
  else el.style.removeProperty("backdrop-filter");
}

function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function applyMediaFilter(settings) {
  let el = document.getElementById(MEDIA_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = MEDIA_STYLE_ID;
    document.documentElement.appendChild(el);
  }
  const brightness = 1 - (settings.intensity / 100) * 0.7;
  el.textContent = `video,img,canvas{filter:brightness(${brightness})!important;transition:filter 150ms ease!important}`;
}

function removeMediaFilter() {
  document.getElementById(MEDIA_STYLE_ID)?.remove();
}

function applyDarkMode() {
  if (document.getElementById(DARK_MODE_ID)) return;
  const s = document.createElement("style");
  s.id = DARK_MODE_ID;
  s.textContent = `html{filter:invert(1) hue-rotate(180deg)!important}img,video,canvas,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}`;
  document.documentElement.appendChild(s);
}

function removeDarkMode() {
  document.getElementById(DARK_MODE_ID)?.remove();
}

function mergeSiteOverride(global, perSite, hostname) {
  const site = perSite?.[hostname];
  if (!site) return global;
  return {
    ...global,
    enabled: site.enabled ?? global.enabled,
    intensity: site.intensity ?? global.intensity,
    color: site.color ?? global.color,
  };
}

function inScheduleWindow(settings) {
  const sch = settings.schedule;
  if (!sch || !sch.enabled) return true;
  const h = new Date().getHours();
  if (sch.startHour <= sch.endHour) return h >= sch.startHour && h < sch.endHour;
  return h >= sch.startHour || h < sch.endHour; // overnight wrap
}

let currentGlobal = DEFAULTS;
let currentPerSite = {};

function render(settings) {
  // Never dim the extension's own pages (newtab dashboard, popup, etc.) — prevents white-out when opening Settings → Dimmer
  if (location.protocol === "chrome-extension:" || location.protocol === "moz-extension:" || location.protocol === "chrome:" || location.protocol === "about:" || location.href.includes("dashboard/index.html")) {
    cleanup();
    return;
  }
  if (settings.darkMode) applyDarkMode();
  else removeDarkMode();
  const effective = { ...settings, enabled: settings.enabled && inScheduleWindow(settings) };
  if (!effective.enabled) {
    removeOverlay();
    removeMediaFilter();
    return;
  }
  if (effective.mode === "overlay") {
    removeMediaFilter();
    createOverlay();
    const ws = effective.whitescreenProtection && checkWhitescreenProtection();
    updateOverlay(ws ? { ...effective, intensity: Math.max(effective.intensity, 15) } : effective);
  } else {
    removeOverlay();
    applyMediaFilter(effective);
  }
}

function cleanup() {
  removeOverlay();
  removeMediaFilter();
  removeDarkMode();
}

(async function init() {
  try {
    currentGlobal = await getStorage("dimmer.settings", DEFAULTS);
    currentPerSite = await getStorage("dimmer.perSite", {});
    render(mergeSiteOverride(currentGlobal, currentPerSite, location.hostname));

    onStorageChange("dimmer.settings", (nv) => {
      currentGlobal = nv ?? DEFAULTS;
      render(mergeSiteOverride(currentGlobal, currentPerSite, location.hostname));
    });
    onStorageChange("dimmer.perSite", (nv) => {
      currentPerSite = nv ?? {};
      render(mergeSiteOverride(currentGlobal, currentPerSite, location.hostname));
    });

    // Re-evaluate the schedule window every minute
    setInterval(() => render(mergeSiteOverride(currentGlobal, currentPerSite, location.hostname)), 60000);

    window.addEventListener("pagehide", cleanup);
    window.addEventListener("beforeunload", cleanup);
  } catch (e) {
    console.error("[Suite v2 Dimmer] Init error:", e);
  }
})();
