// ── Suite v2 Discard — Background Service Worker (MV3) ──
const ALARM_NAME = "suite-v2-discard-check";
const ESTIMATED_MB_PER_TAB = 80;

const DEFAULTS = {
  discard: { enabled: true, idleMinutes: 15, minInactiveTabsThreshold: 3, neverDiscardActiveTab: true, neverDiscardAudibleTab: true, neverDiscardPinnedTab: true, neverDiscardWithUnsavedForm: true, gracePeriodSeconds: 60, useMemoryPressure: false, memoryPressureThresholdPercent: 15, whitelist: [], advancedConditions: { onlyWhenIdleState: false, skipIfOffline: false } },
  stats: { totalDiscardedCount: 0, estimatedMemorySavedMb: 0, lastResetAt: Date.now() },
};

async function getStorage(key, fallback) {
  try {
    const r = await chrome.storage.local.get(key);
    return r[key] ?? fallback;
  } catch (e) {
    console.error("[Discard] Storage get failed:", key, e);
    return fallback;
  }
}

async function setStorage(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    console.error("[Discard] Storage set failed:", key, e);
  }
}

// Atomic stats increment (single read-modify-write, no lost updates)
async function incrementDiscardStats() {
  try {
    const stats = await getStorage("discard.stats", DEFAULTS.stats);
    stats.totalDiscardedCount += 1;
    stats.estimatedMemorySavedMb += ESTIMATED_MB_PER_TAB;
    await setStorage("discard.stats", stats);
  } catch (e) {
    console.error("[Discard] Stats increment failed:", e);
  }
}

const tabCreatedTimes = new Map();
const dirtyTabs = new Set();

chrome.tabs.onCreated.addListener((tab) => tabCreatedTimes.set(tab.id, Date.now()));
chrome.tabs.onRemoved.addListener((tabId) => { tabCreatedTimes.delete(tabId); dirtyTabs.delete(tabId); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") dirtyTabs.delete(tabId);
});

async function isEligibleForDiscard(tab, settings, inactiveCount) {
  if (tab.active && settings.neverDiscardActiveTab) return false;
  if (Date.now() - tab.lastAccessed < settings.idleMinutes * 60_000) return false;
  if (inactiveCount < settings.minInactiveTabsThreshold) return false;
  if (tab.discarded) return false;
  if (tab.audible && settings.neverDiscardAudibleTab) return false;
  if (tab.pinned && settings.neverDiscardPinnedTab) return false;
  const created = tabCreatedTimes.get(tab.id) ?? Date.now();
  if (Date.now() - created < settings.gracePeriodSeconds * 1000) return false;
  try {
    const hostname = new URL(tab.url).hostname;
    if (settings.whitelist.some((w) => hostname.includes(w))) return false;
    const perSite = await getStorage("discard.perSite", []);
    const rule = perSite.find((r) => hostname.includes(r.hostname));
    if (rule && rule.mode === "always-keep") return false;
  } catch { /* unparsable URL — treat as eligible */ }
  if (dirtyTabs.has(tab.id) && settings.neverDiscardWithUnsavedForm) return false;
  if (settings.advancedConditions.onlyWhenIdleState) {
    try {
      if ((await chrome.idle.queryState(60)) !== "idle") return false;
    } catch { /* idle API unavailable */ }
  }
  if (settings.advancedConditions.skipIfOffline) {
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    } catch { /* ignore */ }
  }
  return true;
}

async function getEffectiveIdleMinutes(settings) {
  if (!settings.useMemoryPressure) return settings.idleMinutes;
  try {
    if (chrome.system?.memory) {
      const info = await chrome.system.memory.getInfo();
      if ((info.availableCapacity / info.capacity) * 100 < settings.memoryPressureThresholdPercent) {
        return Math.max(1, Math.floor(settings.idleMinutes / 2));
      }
    }
  } catch { /* memory API unavailable */ }
  return settings.idleMinutes;
}

function registerAlarm() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const settings = await getStorage("discard.settings", DEFAULTS.discard);
  if (!settings.enabled) return;
  const effective = { ...settings, idleMinutes: await getEffectiveIdleMinutes(settings) };
  try {
    const tabs = await chrome.tabs.query({});
    const inactive = tabs.filter((t) => !t.active && !t.discarded);
    for (const tab of inactive) {
      if (await isEligibleForDiscard(tab, effective, inactive.length)) {
        try {
          await chrome.tabs.discard(tab.id);
          await incrementDiscardStats();
        } catch (e) {
          console.error("[Discard] Failed to discard tab:", tab.id, e);
        }
      }
    }
  } catch (e) {
    console.error("[Discard] Alarm handler error:", e);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "discard-root", title: "Discard", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "discard-this-tab", parentId: "discard-root", title: "Discard Tab", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "discard-other-windows", parentId: "discard-root", title: "Discard Tabs in Other Windows", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "discard-all-other", parentId: "discard-root", title: "Discard All Other Tabs", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "release-all-other", parentId: "discard-root", title: "Release All Other Tabs", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "discard-tab-group", parentId: "discard-root", title: "Discard Tab Group", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "keep-tabs-submenu", parentId: "discard-root", title: "Keep Tabs", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "keep-session", parentId: "keep-tabs-submenu", title: "Keep Selected Tabs for This Session", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "allow-discard", parentId: "keep-tabs-submenu", title: "Allow Selected Tabs to Be Discarded", contexts: ["tab"] });
  chrome.contextMenus.create({ id: "always-keep-site", parentId: "keep-tabs-submenu", title: "Always Keep Tabs for This Site", contexts: ["tab"] });
  registerAlarm();
});

async function upsertPerSiteRule(hostname, mode) {
  try {
    const rules = await getStorage("discard.perSite", []);
    const idx = rules.findIndex((r) => r.hostname === hostname);
    if (idx >= 0) rules[idx].mode = mode;
    else rules.push({ hostname, mode });
    await setStorage("discard.perSite", rules);
  } catch (e) {
    console.error("[Discard] Per-site rule update failed:", e);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  try {
    switch (info.menuItemId) {
      case "discard-this-tab":
        await chrome.tabs.discard(tab.id);
        await incrementDiscardStats();
        break;
      case "discard-other-windows": {
        const all = await chrome.tabs.query({});
        for (const t of all.filter((t) => t.windowId !== tab.windowId && !t.active && !t.discarded)) {
          await chrome.tabs.discard(t.id);
          await incrementDiscardStats();
        }
        break;
      }
      case "discard-all-other": {
        const all = await chrome.tabs.query({});
        for (const t of all.filter((t) => t.id !== tab.id && !t.discarded)) {
          await chrome.tabs.discard(t.id);
          await incrementDiscardStats();
        }
        break;
      }
      case "release-all-other": {
        const ps = await getStorage("discard.perSite", []);
        await setStorage("discard.perSite", ps.filter((r) => r.mode !== "always-keep" && r.mode !== "keep-session"));
        break;
      }
      case "discard-tab-group": {
        if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          const gt = await chrome.tabs.query({ groupId: tab.groupId });
          for (const t of gt) {
            if (!t.active) {
              await chrome.tabs.discard(t.id);
              await incrementDiscardStats();
            }
          }
        }
        break;
      }
      case "keep-session":
        await upsertPerSiteRule(new URL(tab.url).hostname, "keep-session");
        break;
      case "allow-discard":
        await upsertPerSiteRule(new URL(tab.url).hostname, "allow-discard");
        break;
      case "always-keep-site":
        await upsertPerSiteRule(new URL(tab.url).hostname, "always-keep");
        break;
    }
  } catch (e) {
    console.error("[Discard] Context menu action failed:", e);
  }
});

// Dimmer keyboard commands live here (single service worker owns all commands)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-dimmer" || command === "dimmer-up" || command === "dimmer-down") {
    try {
      const s = await getStorage("dimmer.settings", { enabled: false, intensity: 40 });
      if (command === "toggle-dimmer") s.enabled = !s.enabled;
      else if (command === "dimmer-up") s.intensity = Math.min(100, s.intensity + 10);
      else if (command === "dimmer-down") s.intensity = Math.max(0, s.intensity - 10);
      await setStorage("dimmer.settings", s);
    } catch (e) {
      console.error("[Discard] Dimmer command failed:", e);
    }
  }
  if (command === "toggle-yt-fullscreen") {
    try {
      const [at] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (at?.id && at.url?.includes("youtube.com")) {
        await chrome.tabs.sendMessage(at.id, { type: "TOGGLE_YT_FULLSCREEN" });
      }
    } catch (e) {
      console.error("[Discard] YT command failed:", e);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TAB_STATS") {
    chrome.tabs.query({}).then((tabs) =>
      sendResponse({
        type: "TAB_STATS_RESPONSE",
        payload: { totalTabs: tabs.length, discardedTabs: tabs.filter((t) => t.discarded).length },
      })
    );
    return true;
  }
  if (message.type === "FORM_DIRTY") {
    if (message.tabId) dirtyTabs.add(message.tabId);
    return;
  }
  if (message.type === "DISCARD_TABS_NOW") {
    (async () => {
      let count = 0;
      try {
        const settings = await getStorage("discard.settings", DEFAULTS.discard);
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabs = await chrome.tabs.query({});
        const inactive = tabs.filter((t) => t.id !== active?.id && !t.discarded);
        for (const t of inactive) {
          if (await isEligibleForDiscard(t, settings, inactive.length)) {
            try {
              await chrome.tabs.discard(t.id);
              count++;
            } catch { /* skip */ }
          }
        }
        const stats = await getStorage("discard.stats", DEFAULTS.stats);
        stats.totalDiscardedCount += count;
        stats.estimatedMemorySavedMb += count * ESTIMATED_MB_PER_TAB;
        await setStorage("discard.stats", stats);
      } catch (e) {
        console.error("[Discard] DISCARD_TABS_NOW failed:", e);
      }
      sendResponse({ type: "DISCARD_COMPLETE", payload: { count } });
    })();
    return true;
  }
});

registerAlarm();
console.log("[Suite v2] Service worker initialized");
