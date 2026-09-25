// ── Suite v2 Storage (chrome.storage.local in extension, localStorage on web) ──

declare const chrome: any;

export const STORAGE_KEYS = {
  DASHBOARD_BACKGROUND: "dashboard.background",
  DASHBOARD_DISPLAY: "dashboard.display",
  DASHBOARD_WEATHER: "dashboard.weather",
  DASHBOARD_WIDGETS: "dashboard.widgets",
  DASHBOARD_TASKS: "dashboard.tasks",
  DASHBOARD_NOTES: "dashboard.notes",
  DASHBOARD_SHORTCUTS: "dashboard.shortcuts",
  DASHBOARD_AI_AGENTS: "dashboard.aiAgents",
  DASHBOARD_WORLD_CLOCKS: "dashboard.worldClocks",
  DASHBOARD_HABITS: "dashboard.habits",
  DASHBOARD_GITHUB: "dashboard.github",
  DISCARD_SETTINGS: "discard.settings",
  DISCARD_PERSITE: "discard.perSite",
  DISCARD_STATS: "discard.stats",
  DIMMER_SETTINGS: "dimmer.settings",
  DIMMER_PERSITE: "dimmer.perSite",
  YT_FULLSCREEN_SETTINGS: "ytFullscreen.settings",
  SUITE_PREFS: "suite.prefs",
} as const;

const isChromeExtension =
  typeof chrome !== "undefined" && chrome.storage?.local;

export async function getStorage<T>(key: string, fallback: T): Promise<T> {
  try {
    if (isChromeExtension) {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) ?? fallback;
    }
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setStorage<T>(key: string, value: T): Promise<void> {
  try {
    if (isChromeExtension) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (err) {
        // Quota exceeded (usually a huge uploaded wallpaper/video data-URI
        // wedged in dashboard.background): retry without the bulky upload
        // fields so key/interval/cache still persist instead of losing the
        // entire save silently — otherwise every save fails and the
        // wallpaper refetches on every tab.
        if (
          key === STORAGE_KEYS.DASHBOARD_BACKGROUND &&
          value &&
          typeof value === "object"
        ) {
          const slim = { ...(value as Record<string, unknown>) };
          let stripped = false;
          for (const f of ["customImageUrl", "customVideoUrl"]) {
            if (typeof slim[f] === "string" && (slim[f] as string).length > 500_000) {
              delete slim[f];
              stripped = true;
            }
          }
          if (stripped) {
            await chrome.storage.local.set({ [key]: slim });
            console.warn(
              "[Suite v2 Storage] Background saved without oversized upload (quota)."
            );
            return;
          }
        }
        throw err;
      }
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("[Suite v2 Storage] Write failed:", key, e);
  }
}

type StorageChangeCallback = (newValue: any, oldValue: any) => void;
const listeners = new Map<string, Set<StorageChangeCallback>>();

if (!isChromeExtension && typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    e.key &&
      listeners.get(e.key)?.forEach((cb) => {
        let newVal: any, oldVal: any;
        try {
          newVal = e.newValue ? JSON.parse(e.newValue) : null;
        } catch {
          newVal = e.newValue;
        }
        try {
          oldVal = e.oldValue ? JSON.parse(e.oldValue) : null;
        } catch {
          oldVal = e.oldValue;
        }
        cb(newVal, oldVal);
      });
  });
}

export function onStorageChange(
  key: string,
  callback: StorageChangeCallback
): () => void {
  if (isChromeExtension) {
    const listener = (
      changes: { [key: string]: { newValue?: any; oldValue?: any } },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes[key]) callback(changes[key].newValue, changes[key].oldValue);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(callback);
  return () => {
    listeners.get(key)?.delete(callback);
  };
}

// ── React Hook ──
import { useState, useEffect, useCallback, useRef } from "react";

export function useChromeStorage<T>(
  key: string,
  fallback: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    let cancelled = false;
    getStorage<T>(key, fallbackRef.current).then((stored) => {
      if (!cancelled) {
        setValue(stored);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const unsub = onStorageChange(key, (newVal) => {
      if (newVal !== undefined) setValue(newVal);
    });
    return unsub;
  }, [key]);

  const updateValue = useCallback(
    (newValueOrFn: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof newValueOrFn === "function"
            ? (newValueOrFn as (prev: T) => T)(prev)
            : newValueOrFn;
        setStorage(key, resolved);
        if (!isChromeExtension) {
          listeners.get(key)?.forEach((cb) => cb(resolved, prev));
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, updateValue, isLoading];
}
