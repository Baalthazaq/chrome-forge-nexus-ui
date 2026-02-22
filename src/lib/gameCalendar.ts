// Game Calendar System
// 13 months of 28 days + Day of Frippery (month 8, 1 day)
// Months 1-7 come before Frippery, months 9-14 come after

export interface GameDate {
  day: number;
  month: number; // 1-14, where 8 = Frippery
  year: number;
}

export interface MonthInfo {
  number: number;
  name: string;
  season: string;
  days: number; // 28 for normal months, 1 for Frippery
}

export const MONTHS: MonthInfo[] = [
  { number: 1, name: 'Oath', season: 'Shield', days: 28 },
  { number: 2, name: 'Stern', season: 'Shield', days: 28 },
  { number: 3, name: 'Engineer', season: 'Shield', days: 28 },
  { number: 4, name: 'Miner', season: 'Shield', days: 28 },
  { number: 5, name: 'Retribution', season: 'Shield', days: 28 },
  { number: 6, name: 'Shackles', season: 'Axe', days: 28 },
  { number: 7, name: 'Trade', season: 'Axe', days: 28 },
  { number: 8, name: 'Day of Frippery', season: '-', days: 1 },
  { number: 9, name: 'Light', season: 'Axe', days: 28 },
  { number: 10, name: 'Navigator', season: 'Axe', days: 28 },
  { number: 11, name: 'Tryst', season: 'Hammer', days: 28 },
  { number: 12, name: 'Destiny', season: 'Hammer', days: 28 },
  { number: 13, name: 'Groveling', season: 'Hammer', days: 28 },
  { number: 14, name: 'Negotiation', season: 'Hammer', days: 28 },
];

export const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function getMonth(monthNumber: number): MonthInfo | undefined {
  return MONTHS.find(m => m.number === monthNumber);
}

export function getSeasonForMonth(monthNumber: number): string {
  return getMonth(monthNumber)?.season || '-';
}

export function isFrippery(monthNumber: number): boolean {
  return monthNumber === 8;
}

export function formatGameDate(date: GameDate): string {
  const month = getMonth(date.month);
  if (!month) return `Day ${date.day}, Year ${date.year}`;
  
  if (isFrippery(date.month)) {
    return `Day of Frippery, Year ${date.year}`;
  }
  
  const suffix = getDaySuffix(date.day);
  const season = month.season !== '-' ? ` — Season of the ${month.season}` : '';
  return `${date.day}${suffix} of ${month.name}, Year ${date.year}${season}`;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function advanceDay(date: GameDate): GameDate {
  const currentMonth = getMonth(date.month);
  if (!currentMonth) return date;

  let newDay = date.day + 1;
  let newMonth = date.month;
  let newYear = date.year;

  if (newDay > currentMonth.days) {
    newDay = 1;
    newMonth++;
    if (newMonth > 14) {
      newMonth = 1;
      newYear++;
    }
  }

  return { day: newDay, month: newMonth, year: newYear };
}

export interface BillingTriggers {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  yearly: boolean;
}

export function getBillingTriggers(date: GameDate): BillingTriggers {
  const frippery = isFrippery(date.month);
  
  return {
    daily: true, // Always triggers
    weekly: !frippery && [2, 9, 16, 24].includes(date.day),
    monthly: !frippery && date.day === 14,
    yearly: date.month === 1 && date.day === 1,
  };
}

export function getBillingDescription(triggers: BillingTriggers): string[] {
  const descriptions: string[] = [];
  if (triggers.daily) descriptions.push('Daily subscriptions');
  if (triggers.weekly) descriptions.push('Weekly subscriptions');
  if (triggers.monthly) descriptions.push('Monthly subscriptions');
  if (triggers.yearly) descriptions.push('Yearly subscriptions');
  return descriptions;
}
