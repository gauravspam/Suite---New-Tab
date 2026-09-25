// ── Suite v2 holidays ──

export interface Holiday {
  date: number;
  month: number; // 0-based
  name: string;
}

function indianHolidays(year: number): Holiday[] {
  const fixed: Holiday[] = [
    { date: 26, month: 0, name: "Republic Day" },
    { date: 15, month: 7, name: "Independence Day" },
    { date: 2, month: 9, name: "Gandhi Jayanti" },
    { date: 25, month: 11, name: "Christmas" },
    { date: 14, month: 0, name: "Makar Sankranti" },
  ];
  const variable2026: Holiday[] = [
    { date: 26, month: 1, name: "Maha Shivaratri" },
    { date: 14, month: 2, name: "Holi" },
    { date: 18, month: 3, name: "Good Friday" },
    { date: 12, month: 4, name: "Buddha Purnima" },
    { date: 9, month: 7, name: "Raksha Bandhan" },
    { date: 26, month: 7, name: "Janmashtami" },
    { date: 22, month: 9, name: "Dussehra" },
    { date: 20, month: 9, name: "Dhanteras" },
    { date: 22, month: 10, name: "Diwali" },
    { date: 24, month: 10, name: "Bhai Dooj" },
    { date: 5, month: 10, name: "Guru Nanak Jayanti" },
  ];
  // TODO: proper lunar-calendar computation for other years
  return year === 2026 ? [...fixed, ...variable2026] : fixed;
}

function usHolidays(): Holiday[] {
  return [
    { date: 1, month: 0, name: "New Year's Day" },
    { date: 4, month: 6, name: "Independence Day" },
    { date: 31, month: 9, name: "Halloween" },
    { date: 11, month: 10, name: "Veterans Day" },
    { date: 25, month: 11, name: "Christmas Day" },
  ];
}

export function holidaysFor(country: string | undefined, year: number): Holiday[] {
  return /india/i.test(country || "") ? indianHolidays(year) : usHolidays();
}

export function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st";
  if (n % 10 === 2 && n % 100 !== 12) return "nd";
  if (n % 10 === 3 && n % 100 !== 13) return "rd";
  return "th";
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}
