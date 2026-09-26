import { useEffect, useMemo, useRef } from "react";
import { STORAGE_KEYS, useChromeStorage, getStorage } from "@/shared/storage";
import { DEFAULT_BACKGROUND, type DashboardBackgroundSettings } from "@/shared/types";

const GRADIENTS = [
  "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 30%, #2d1b69 60%, #1a0a3e 100%)",
  "linear-gradient(135deg, #0a0a0a 0%, #1a2332 30%, #0d2137 60%, #0a1628 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
];

function svgFallback(hue: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice"><rect width="1920" height="1080" fill="hsl(${hue}, 50%, 12%)"/><circle cx="1400" cy="300" r="320" fill="hsl(${(hue + 40) % 360}, 60%, 45%)" opacity="0.12"/><circle cx="400" cy="800" r="260" fill="hsl(${(hue + 80) % 360}, 60%, 45%)" opacity="0.10"/></svg>`
  )}`;
}

const PICSUM_SEED_URL = "https://picsum.photos/seed";

function cacheAge(ts?: number): string {
  if (!ts) return "";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return " · cached just now";
  if (s < 3600) return ` · cached ${Math.floor(s / 60)}m ago`;
  if (s < 86400) return ` · cached ${Math.floor(s / 3600)}h ago`;
  return ` · cached ${Math.floor(s / 86400)}d ago`;
}

function refreshToMs(interval: DashboardBackgroundSettings["refreshInterval"]): number {
  if (interval === "hour") return 3_600_000;
  if (interval === "day") return 86_400_000;
  if (interval === "week") return 604_800_000;
  if (interval === "newtab" || interval === "always") return 0;
  return Infinity; // "never"
}

export default function BackgroundLayer() {
  const [settings, setSettings] = useChromeStorage(
    STORAGE_KEYS.DASHBOARD_BACKGROUND,
    DEFAULT_BACKGROUND
  );

  const gradient = GRADIENTS[settings.fallbackPoolIndex % GRADIENTS.length];
  const fallback = useMemo(
    () => svgFallback((settings.fallbackPoolIndex || 0) * 37),
    [settings.fallbackPoolIndex]
  );

  // Fetch state per config-signature: newtab/always refetch at most once per
  // page load for a given config (prevents the lastFetchedAt-dep fetch loop).
  const fetchedSig = useRef("");

  useEffect(() => {
    if (settings.source !== "unsplash") return;
    let cancelled = false;

    // Debounce: wait for settings (esp. keystrokes in the API key field) to
    // settle before hitting the network — failed attempts still count
    // against Unsplash's 50 req/hour demo limit. Cached photos render
    // immediately regardless; this only delays *fetching*.
    const timer = setTimeout(() => {
    (async () => {
      const cur = await getStorage<DashboardBackgroundSettings>(
        STORAGE_KEYS.DASHBOARD_BACKGROUND,
        DEFAULT_BACKGROUND
      );
      if (cancelled || cur.source !== "unsplash") return;

      const cooldownMs = refreshToMs(cur.refreshInterval);
      const expired =
        !cur.lastFetchedAt || Date.now() - cur.lastFetchedAt >= cooldownMs;
      const need =
        !cur.cachedImageUrl ||
        cur.refreshInterval === "always" ||
        cur.refreshInterval === "newtab" ||
        expired;
      if (!need) return;

      const sig = `${cur.refreshInterval}|${cur.unsplashAccessKey ?? ""}|${cur.fallbackPoolIndex}`;
      if (
        (cur.refreshInterval === "newtab" || cur.refreshInterval === "always") &&
        fetchedSig.current === sig
      ) {
        return;
      }
      fetchedSig.current = sig;

      // Save over `cur` (the just-read stored object), NOT hook state —
      // hook state may still be defaults on a fresh tab, and spreading it
      // would wipe a good stored API key.
      const save = (patch: Partial<DashboardBackgroundSettings>) =>
        setSettings({ ...cur, ...patch, lastFetchedAt: Date.now() });

      try {
        const accessKey = cur.unsplashAccessKey?.trim();
        if (!accessKey) throw new Error("No Unsplash key");
        const res = await fetch(
          "https://api.unsplash.com/photos/random?orientation=landscape",
          {
            headers: {
              "Accept-Version": "v1",
              Authorization: `Client-ID ${accessKey}`,
            },
          }
        );
        if (!res.ok) throw new Error(`Unsplash ${res.status}`);
        const data = await res.json();
        const url = data?.urls?.regular || data?.urls?.full || data?.urls?.raw;
        const photographer = data?.user?.name || "Unsplash";
        if (!url || cancelled) return;
        save({
          cachedImageUrl: url,
          cachedImageAttribution: `Photo by ${photographer} on Unsplash`,
        });
      } catch {
        if (cancelled) return;
        // Keep the current photo when a refresh fails (bad key, offline,
        // or mid-typing in the key field) — only seed a fresh Picsum photo
        // when there is no cached photo at all. This stops per-keystroke
        // wallpaper churn and preserves the interval.
        if (!cur.cachedImageUrl) {
          // Resolve Picsum's redirect ONCE and cache the final JPG URL, so
          // no redirect can ever re-roll a different photo on later tabs.
          const seedUrl = `${PICSUM_SEED_URL}/${Date.now()}/1920/1080`;
          let finalUrl = seedUrl;
          try {
            const r = await fetch(seedUrl);
            if (!cancelled && r.ok && r.url && r.url !== seedUrl) finalUrl = r.url;
          } catch { /* keep seed URL */ }
          if (cancelled) return;
          save({
            cachedImageUrl: finalUrl,
            cachedImageAttribution: "Photo by Picsum",
          });
        }
      }
    })();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // NOTE: lastFetchedAt intentionally NOT a dep — it changes on every
    // save, which would re-trigger newtab/always fetches in a loop.
  }, [settings.source, settings.refreshInterval, settings.unsplashAccessKey, settings.fallbackPoolIndex, setSettings]);

  const bgImage =
    settings.source === "upload" && settings.customImageUrl
      ? settings.customImageUrl
      : settings.source === "unsplash"
        ? (settings.cachedImageUrl || fallback)
        : null;
  const bgColor =
    settings.source === "color" && settings.customColor
      ? settings.customColor
      : null;
  const bgVideo =
    settings.source === "video" && settings.customVideoUrl
      ? settings.customVideoUrl
      : null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={bgColor ? { background: bgColor } : { background: gradient }}
      />
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallback;
            }}
          />
          <div className="absolute inset-0 bg-black/10" />
        </>
      )}
      {bgVideo && (
        <>
          <video
            key={bgVideo}
            src={bgVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </>
      )}
      {settings.source !== "color" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.18) 100%)",
          }}
        />
      )}
      {settings.source === "unsplash" && settings.cachedImageAttribution && (
        <div className="absolute bottom-3 right-4 text-xs text-white/30">
          {settings.cachedImageAttribution}{cacheAge(settings.lastFetchedAt)}
        </div>
      )}
    </div>
  );
}
