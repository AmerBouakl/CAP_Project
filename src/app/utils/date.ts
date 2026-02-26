// Date helpers that avoid UTC conversion side effects in local-date UIs.

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todayLocalDateKey = (): string => toLocalDateKey(new Date());

export const getMondayOfWeek = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + delta);
  return start;
};

export const getFridayOfWeek = (date: Date): Date => {
  const friday = new Date(getMondayOfWeek(date));
  friday.setDate(friday.getDate() + 4);
  return friday;
};

export const getISOWeekInputValue = (date: Date): string => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const dayNr = (target.getDay() + 6) % 7; // Monday=0 ... Sunday=6
  target.setDate(target.getDate() - dayNr + 3); // Thursday of this ISO week

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setHours(0, 0, 0, 0);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const parseISOWeekInputValue = (value: string): Date => {
  const [yearStr, weekStr] = value.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  if (!year || !week) return new Date();

  const jan4 = new Date(year, 0, 4);
  jan4.setHours(0, 0, 0, 0);
  const jan4DayNr = (jan4.getDay() + 6) % 7;

  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - jan4DayNr);

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  return monday;
};
