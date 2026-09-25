// ── Suite v2 Popup Script ──
const DEFAULTS = {
  discard: { enabled: true },
  dimmer: { enabled: false, intensity: 40 },
  yt: { enabled: true },
  stats: { totalDiscardedCount: 0, estimatedMemorySavedMb: 0 },
};

async function get(k, f) {
  try {
    const r = await chrome.storage.local.get(k);
    return r[k] ?? f;
  } catch (e) {
    console.error("[Popup] Storage get failed:", k, e);
    return f;
  }
}

async function set(k, v) {
  try {
    await chrome.storage.local.set({ [k]: v });
  } catch (e) {
    console.error("[Popup] Storage set failed:", k, e);
  }
}

function mkT(btn, init, cb) {
  btn.className = `toggle ${init ? "on" : "off"}`;
  btn.onclick = async () => {
    const n = btn.classList.contains("off");
    btn.className = `toggle ${n ? "on" : "off"}`;
    await cb(n);
  };
}

(async () => {
  const ds = await get("discard.settings", DEFAULTS.discard);
  mkT(document.getElementById("dt"), ds.enabled, async (v) => { ds.enabled = v; await set("discard.settings", ds); });
  const st = await get("discard.stats", DEFAULTS.stats);
  document.getElementById("dc").textContent = st.totalDiscardedCount;
  document.getElementById("ds").textContent = `~${Math.round(st.estimatedMemorySavedMb)}MB`;

  const dm = await get("dimmer.settings", DEFAULTS.dimmer);
  mkT(document.getElementById("dmt"), dm.enabled, async (v) => { dm.enabled = v; await set("dimmer.settings", dm); });
  const di = document.getElementById("di");
  const dv = document.getElementById("dv");
  di.value = dm.intensity;
  dv.textContent = `${dm.intensity}%`;
  di.oninput = async () => {
    dm.intensity = +di.value;
    dv.textContent = `${di.value}%`;
    await set("dimmer.settings", dm);
  };

  const ys = await get("ytFullscreen.settings", DEFAULTS.yt);
  mkT(document.getElementById("yt"), ys.enabled, async (v) => { ys.enabled = v; await set("ytFullscreen.settings", ys); });
})();
