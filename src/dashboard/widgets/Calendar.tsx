import { useState } from "react";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { holidaysFor, ordinal, isoWeek } from "@/shared/holidays";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_SUITE_PREFS } from "@/shared/types";

export default function CalendarWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [prefs] = useChromeStorage(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayNum = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });

  const all = holidaysFor(prefs.holidayCountry, year);
  const keys = new Set(all.map((h) => `${h.month}-${h.date}`));

  // 42-cell grid with leading/trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { day: number; m: number; out: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, m: month === 0 ? 11 : month - 1, out: true });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, m: month, out: false });
  let nd = 1;
  while (cells.length < 42) cells.push({ day: nd++, m: month === 11 ? 0 : month + 1, out: true });

  const startOfYear = new Date(year, 0, 1).getTime();
  const dayOfYear = Math.floor((today.getTime() - startOfYear) / 86400000) + 1;
  const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  const subtitle = `${today.toLocaleDateString("en-US", { weekday: "long" })} the ${todayNum}${ordinal(todayNum)} · Week ${isoWeek(today)} · Day ${dayOfYear} · ${daysInYear - dayOfYear} left`;

  const comingUp = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return all
      .map((h) => ({ ...h, d: new Date(year, h.month, h.date) }))
      .filter((h) => h.d.getTime() >= t.getTime())
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 3)
      .map((h) => {
        const diff = Math.round((h.d.getTime() - t.getTime()) / 86400000);
        const date = h.d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const rel = diff === 0 ? "today" : `in ${diff} day${diff === 1 ? "" : "s"}`;
        return { name: h.name, label: `${date} · ${rel}` };
      });
  })();

  return (
    <WidgetModal title="Date & Calendar" icon={<CalendarIcon size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="mb-1">
          <span className="text-[26px] font-light text-white">{monthName}</span>{" "}
          <span className="text-[26px] font-light text-white/40">{year}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-white/50">{subtitle}</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }}
              className="w-7 h-7 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-white/60 hover:text-white tap-scale"
              aria-label="Previous month"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }}
              className="w-7 h-7 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-white/60 hover:text-white tap-scale"
              aria-label="Next month"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="h-[3px] rounded-full bg-white/10 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (dayOfYear / daysInYear) * 100)}%`, background: "linear-gradient(90deg, #f6c453, #f3d27a)" }}
          />
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-white/35 py-1.5 font-medium text-[11px]">{d}</div>
          ))}
          {cells.map((c, i) => {
            const isToday = !c.out && isCurrentMonth && c.day === todayNum;
            const hol = keys.has(`${c.m}-${c.day}`);
            return (
              <div
                key={i}
                className={`relative py-1.5 rounded-full text-[13px] tap-scale ${
                  isToday
                    ? "bg-white text-black font-semibold"
                    : c.out
                      ? "text-white/25"
                      : hol
                        ? "text-white font-medium hover:bg-white/[0.07]"
                        : "text-white/70 hover:bg-white/[0.07]"
                }`}
                style={{ animation: `scaleIn 0.25s ease-out ${i * 6}ms both` }}
              >
                {c.day}
                {hol && !isToday && (
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-[3px] w-1 h-1 rounded-full bg-rose-300/80" />
                )}
              </div>
            );
          })}
        </div>
        {comingUp.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] text-white/40 uppercase tracking-[0.18em] mb-2 font-medium">Coming up</div>
            {comingUp.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[13px] py-1">
                <span className="text-white/85"><span className="mr-2">🎉</span>{h.name}</span>
                <span className="text-white/40 text-xs">{h.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetModal>
  );
}
