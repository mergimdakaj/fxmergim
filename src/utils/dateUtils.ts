export interface DynamicDayInfo {
  dayLabel: string;
  dateFormatted: string;
  isoDate: string;
  dayNumber: number;
  monthName: string;
  year: number;
}

const ALBANIAN_MONTHS = [
  'Janar',
  'Shkurt',
  'Mars',
  'Prill',
  'Maj',
  'Qershor',
  'Korrik',
  'Gusht',
  'Shtator',
  'Tetor',
  'Nëntor',
  'Dhjetor',
];

export function formatAlbanianDate(d: Date): { dayLabel: string; dateFormatted: string; isoDate: string } {
  const day = d.getDate();
  const month = ALBANIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const isoDate = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    dayLabel: `${day} ${month}`,
    dateFormatted: `${day} ${month} ${year}`,
    isoDate,
  };
}

export function getDynamicDays(): {
  today: DynamicDayInfo;
  yesterday: DynamicDayInfo;
  dayBefore: DynamicDayInfo;
} {
  const now = new Date();

  const dToday = new Date(now);
  const dYesterday = new Date(now);
  dYesterday.setDate(dYesterday.getDate() - 1);
  const dDayBefore = new Date(now);
  dDayBefore.setDate(dDayBefore.getDate() - 2);

  const tInfo = formatAlbanianDate(dToday);
  const yInfo = formatAlbanianDate(dYesterday);
  const bInfo = formatAlbanianDate(dDayBefore);

  return {
    today: {
      ...tInfo,
      dayLabel: `Sot (${tInfo.dayLabel})`,
      dayNumber: dToday.getDate(),
      monthName: ALBANIAN_MONTHS[dToday.getMonth()],
      year: dToday.getFullYear(),
    },
    yesterday: {
      ...yInfo,
      dayLabel: `Dje (${yInfo.dayLabel})`,
      dayNumber: dYesterday.getDate(),
      monthName: ALBANIAN_MONTHS[dYesterday.getMonth()],
      year: dYesterday.getFullYear(),
    },
    dayBefore: {
      ...bInfo,
      dayLabel: `Pardje (${bInfo.dayLabel})`,
      dayNumber: dDayBefore.getDate(),
      monthName: ALBANIAN_MONTHS[dDayBefore.getMonth()],
      year: dDayBefore.getFullYear(),
    },
  };
}

export function syncTradeDynamicDates<T extends { day?: string; dayLabel?: string; dateFormatted?: string }>(
  trades: T[]
): T[] {
  const dynamicDays = getDynamicDays();
  return trades.map((t) => {
    if (t.day === 'today') {
      return {
        ...t,
        dayLabel: dynamicDays.today.dayLabel,
        dateFormatted: dynamicDays.today.dateFormatted,
      };
    } else if (t.day === 'yesterday') {
      return {
        ...t,
        dayLabel: dynamicDays.yesterday.dayLabel,
        dateFormatted: dynamicDays.yesterday.dateFormatted,
      };
    } else if (t.day === 'day_before') {
      return {
        ...t,
        dayLabel: dynamicDays.dayBefore.dayLabel,
        dateFormatted: dynamicDays.dayBefore.dateFormatted,
      };
    }
    return t;
  });
}

