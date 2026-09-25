import { useState, useEffect, useRef } from "react";
import { Cloud, Search, Sunrise, Sunset } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_WEATHER, type DashboardWeatherSettings } from "@/shared/types";

const KNOWN: Record<string, { lat: number; lon: number }> = {
  mumbai: { lat: 19.076, lon: 72.8777 },
  thane: { lat: 19.2183, lon: 72.9781 },
  delhi: { lat: 28.6139, lon: 77.209 },
  "new delhi": { lat: 28.6139, lon: 77.209 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  london: { lat: 51.5074, lon: -0.1278 },
  "new york": { lat: 40.7128, lon: -74.006 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  paris: { lat: 48.8566, lon: 2.3522 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  dubai: { lat: 25.2048, lon: 55.2708 },
  sydney: { lat: -33.8688, lon: 151.2093 },
};

interface Current {
  temp: number;
  code: number;
  city: string;
  high: number;
  low: number;
}

interface Hour {
  time: number;
  temp: number;
  code: number;
}

interface Day {
  label: string;
  high: number;
  low: number;
  code: number;
}

interface SunTimes {
  rise: string;
  set: string;
}

function desc(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Storm";
}

function fmtSun(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}

function SunArc({ rise, set }: SunTimes) {
  const toMin = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const r = toMin(rise);
  const s = toMin(set);
  const f = Math.min(1, Math.max(0, (nowMin - r) / Math.max(1, s - r)));
  const day = nowMin >= r && nowMin <= s;
  const x = 100 - 90 * Math.cos(Math.PI * f);
  const y = 100 - 90 * Math.sin(Math.PI * f);
  return (
    <div className="mt-4">
      <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Sunrise &amp; sunset</div>
      <svg viewBox="0 0 200 112" className="w-full h-24" aria-hidden>
        <path d="M10,100 A90,90 0 0 1 190,100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle
          cx={x}
          cy={y}
          r="5"
          fill={day ? "#fbbf24" : "rgba(255,255,255,0.35)"}
          style={day ? { filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))" } : undefined}
        />
      </svg>
      <div className="flex items-center justify-between -mt-2">
        <span className="flex items-center gap-1 text-[11px] text-white/60 tabular-nums">
          <Sunrise size={12} className="text-white/40" />{fmtSun(rise)}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-white/60 tabular-nums">
          {fmtSun(set)}<Sunset size={12} className="text-white/40" />
        </span>
      </div>
    </div>
  );
}

export default function WeatherWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [settings, setSettings] = useChromeStorage<DashboardWeatherSettings>(
    STORAGE_KEYS.DASHBOARD_WEATHER, DEFAULT_WEATHER
  );
  const [query, setQuery] = useState(settings.cityName || "Thane");
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState<Current | null>(null);
  const [hourly, setHourly] = useState<Hour[]>([]);
  const [daily, setDaily] = useState<Day[]>([]);
  const [sun, setSun] = useState<SunTimes | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setQuery(settings.cityName || "Thane"), [settings.cityName]);

  useEffect(() => {
    const city = (settings.cityName || "").trim();
    if (!city) return;
    setError(false);
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const { signal } = ctl;

    async function load(lat: number, lon: number, name: string) {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=7&timezone=auto`,
        { signal }
      );
      const wx = await res.json();
      if (signal.aborted || !wx?.current) throw new Error("bad payload");
      const toUnit = (c: number) =>
        settings.unit === "fahrenheit" ? Math.round((c * 9) / 5 + 32) : Math.round(c);
      setCurrent({
        temp: toUnit(wx.current.temperature_2m),
        code: wx.current.weather_code,
        city: name,
        high: toUnit(wx.daily.temperature_2m_max[0]),
        low: toUnit(wx.daily.temperature_2m_min[0]),
      });
      // Hourly strip starts at the current hour (not midnight)
      const curPrefix = String(wx.current.time).slice(0, 13);
      let startIdx = wx.hourly.time.findIndex((t: string) => t.slice(0, 13) >= curPrefix);
      if (startIdx < 0) startIdx = 0;
      const COUNT = 10;
      setHourly(
        wx.hourly.time.slice(startIdx, startIdx + COUNT).map((t: string, k: number) => {
          const i = startIdx + k;
          return {
            time: new Date(t).getHours(),
            temp: toUnit(wx.hourly.temperature_2m[i]),
            code: wx.hourly.weather_code[i],
          };
        })
      );
      if (wx.daily.sunrise?.[0] && wx.daily.sunset?.[0]) {
        setSun({ rise: wx.daily.sunrise[0], set: wx.daily.sunset[0] });
      } else {
        setSun(null);
      }
      setDaily(
        wx.daily.time.slice(1, 6).map((t: string, i: number) => ({
          label: new Date(t + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
          high: toUnit(wx.daily.temperature_2m_max[i + 1]),
          low: toUnit(wx.daily.temperature_2m_min[i + 1]),
          code: wx.daily.weather_code[i + 1],
        }))
      );
    }

    (async () => {
      try {
        const key = city.toLowerCase();
        if (KNOWN[key]) {
          await load(KNOWN[key].lat, KNOWN[key].lon, city);
          return;
        }
        const m = city.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        if (m) {
          const lat = parseFloat(m[1]);
          const lon = parseFloat(m[2]);
          if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
            await load(lat, lon, `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
            return;
          }
        }
        const geo = await (
          await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { signal })
        ).json();
        const loc = geo.results?.[0];
        if (!loc) throw new Error("not found");
        await load(loc.latitude, loc.longitude, loc.name);
      } catch (e) {
        if (!signal.aborted) {
          console.error("Weather failed:", e);
          setError(true);
        }
      }
    })();

    return () => ctl.abort();
  }, [settings.cityName, settings.unit]);

  const unit = settings.unit === "fahrenheit" ? "°F" : "°C";

  return (
    <WidgetModal title="Weather" icon={<Cloud size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${error ? "border-red-500/60" : "border-white/10"} bg-black/30`}>
          <Search size={14} className="text-white/40 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSettings({ ...settings, cityName: query.trim() });
            }}
            onBlur={() => { if (query.trim() !== settings.cityName) setSettings({ ...settings, cityName: query.trim() }); }}
            placeholder="Search city…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
          <div className="flex gap-1">
            {(["celsius", "fahrenheit"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setSettings({ ...settings, unit: u })}
                className={`px-2 py-0.5 rounded-md text-[11px] tap-scale ${settings.unit === u ? "bg-white/15 text-white" : "text-white/40"}`}
              >
                {u === "celsius" ? "°C" : "°F"}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="text-red-400 text-[11px] mt-1.5">City not found. Try another name.</div>}

        <div className="flex items-end justify-between mt-4 mb-1">
          <div>
            <div className="text-5xl text-white/90 font-thin leading-none tabular-nums">
              {current ? `${current.temp}°` : "--"}
            </div>
            <div className="text-white/60 text-sm mt-2">
              {current ? `${desc(current.code)} · H:${current.high}° L:${current.low}°` : "Loading…"}
            </div>
            <div className="text-white/35 text-[11px] mt-0.5">{current?.city || settings.cityName}</div>
          </div>
          <Cloud size={40} className="text-white/50" />
        </div>

        <div className="text-[10px] text-white/35 uppercase tracking-wider mt-4 mb-2">Today, hourly</div>
        <div className="flex justify-between">
          {hourly.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[10px] text-white/45">{i === 0 ? "Now" : `${h.time % 12 || 12}${h.time >= 12 ? "p" : "a"}`}</span>
              <span className="text-xs text-white/70 tabular-nums">{h.temp}°</span>
            </div>
          ))}
        </div>

        {sun && <SunArc rise={sun.rise} set={sun.set} />}

        <div className="text-[10px] text-white/35 uppercase tracking-wider mt-4 mb-1">Next 5 days</div>
        {daily.map((d, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-white/70 text-[13px] w-12">{d.label}</span>
            <span className="text-white/40 text-xs">{desc(d.code)}</span>
            <span className="text-white/80 text-[13px] tabular-nums">{d.low}° <span className="text-white/35">/ {d.high}°{unit === "°F" ? "" : ""}</span></span>
          </div>
        ))}
        <div className="text-[10px] text-white/25 text-center mt-3">Data from Open-Meteo</div>
      </div>
    </WidgetModal>
  );
}
