import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import type { DailyStats, StatsPeriod, PeriodStatsResult, DailyPoint } from './types';
import { getISTDateKey } from './washes';

export const getDailyStats = async (dateKey: string = getISTDateKey()): Promise<DailyStats | null> => {
  const docRef = doc(db, 'dailyStats', dateKey);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as DailyStats;
  }
  return null;
};

// Range query for stats across dates
export const getStatsRange = async (startDateKey: string, endDateKey: string): Promise<(DailyStats & { id: string })[]> => {
  const q = query(
    collection(db, 'dailyStats'),
    where(documentId(), '>=', startDateKey),
    where(documentId(), '<=', endDateKey)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as DailyStats) }));
};

const pad = (n: number) => n.toString().padStart(2, '0');

export const formatDateKeyShort = (dateKey: string): string => {
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return dateKey;
};

export const getPeriodMeta = (period: StatsPeriod, d: Date) => {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 to 11
  const day = d.getDate();

  if (period === 'day') {
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
    const isToday = dateKey === getISTDateKey(new Date());
    const label = (isToday ? 'Today, ' : '') + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDateKey: dateKey,
      endDateKey: dateKey,
      label,
      subLabel: dateKey,
    };
  }

  if (period === 'month') {
    const startDateKey = `${year}-${pad(month + 1)}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDateKey = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
    const monthName = d.toLocaleDateString('en-IN', { month: 'long' });
    const monthShort = d.toLocaleDateString('en-IN', { month: 'short' });
    return {
      startDateKey,
      endDateKey,
      label: `${monthName} ${year}`,
      subLabel: `01 ${monthShort} – ${lastDay} ${monthShort} ${year}`,
    };
  }

  if (period === 'quarter') {
    const q = Math.floor(month / 3) + 1; // 1, 2, 3, 4
    const startMonth1 = (q - 1) * 3 + 1;
    const endMonth1 = q * 3;
    const lastDay = new Date(year, endMonth1, 0).getDate();
    const startDateKey = `${year}-${pad(startMonth1)}-01`;
    const endDateKey = `${year}-${pad(endMonth1)}-${pad(lastDay)}`;
    const qNames = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];
    return {
      startDateKey,
      endDateKey,
      label: `Q${q} ${year}`,
      subLabel: `${qNames[q - 1]} ${year}`,
    };
  }

  // period === 'year'
  return {
    startDateKey: `${year}-01-01`,
    endDateKey: `${year}-12-31`,
    label: `Year ${year}`,
    subLabel: `01 Jan ${year} – 31 Dec ${year}`,
  };
};

export const stepDateForPeriod = (date: Date, period: StatsPeriod, delta: number): Date => {
  const newDate = new Date(date);
  if (period === 'day') {
    newDate.setDate(newDate.getDate() + delta);
  } else if (period === 'month') {
    newDate.setMonth(newDate.getMonth() + delta);
  } else if (period === 'quarter') {
    newDate.setMonth(newDate.getMonth() + (delta * 3));
  } else if (period === 'year') {
    newDate.setFullYear(newDate.getFullYear() + delta);
  }
  return newDate;
};

export const isPeriodCurrentOrFuture = (date: Date, period: StatsPeriod): boolean => {
  const now = new Date();
  if (period === 'day') {
    const refKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const todayKey = getISTDateKey(now);
    return refKey >= todayKey;
  }
  if (period === 'month') {
    if (date.getFullYear() > now.getFullYear()) return true;
    if (date.getFullYear() === now.getFullYear() && date.getMonth() >= now.getMonth()) return true;
    return false;
  }
  if (period === 'quarter') {
    if (date.getFullYear() > now.getFullYear()) return true;
    const curQ = Math.floor(now.getMonth() / 3);
    const dateQ = Math.floor(date.getMonth() / 3);
    if (date.getFullYear() === now.getFullYear() && dateQ >= curQ) return true;
    return false;
  }
  if (period === 'year') {
    return date.getFullYear() >= now.getFullYear();
  }
  return false;
};

export const getPeriodStats = async (
  period: StatsPeriod,
  referenceDate: Date
): Promise<PeriodStatsResult> => {
  const { startDateKey, endDateKey, label, subLabel } = getPeriodMeta(period, referenceDate);

  if (period === 'day') {
    const statsDoc = await getDailyStats(startDateKey);
    const count = statsDoc?.count || 0;
    const revenue = statsDoc?.revenue || 0;
    const pendingAmount = statsDoc?.pendingAmount || 0;
    const breakdownByVehicle = statsDoc?.breakdownByVehicle || { Bike: 0, Car: 0 };
    const breakdownByMode = statsDoc?.breakdownByMode || { Cash: 0, UPI: 0, Card: 0 };

    return {
      period,
      startDateKey,
      endDateKey,
      label,
      subLabel,
      count,
      revenue,
      pendingAmount,
      breakdownByVehicle,
      breakdownByMode,
      activeDaysCount: count > 0 ? 1 : 0,
      avgDailyRevenue: revenue,
      avgDailyWashes: count,
      dailyPoints: count > 0 ? [{
        dateKey: startDateKey,
        formattedDate: label,
        count,
        revenue,
        pendingAmount,
        bikeCount: breakdownByVehicle.Bike || 0,
        carCount: breakdownByVehicle.Car || 0,
      }] : []
    };
  }

  // Multi-day aggregation (month, quarter, year)
  const statsList = await getStatsRange(startDateKey, endDateKey);

  let totalCount = 0;
  let totalRevenue = 0;
  let totalPending = 0;
  let bikeCount = 0;
  let carCount = 0;
  let cashCount = 0;
  let upiCount = 0;
  let cardCount = 0;

  const dailyPoints: DailyPoint[] = [];

  for (const doc of statsList) {
    const c = doc.count || 0;
    const rev = doc.revenue || 0;
    const pend = doc.pendingAmount || 0;
    const b = doc.breakdownByVehicle?.Bike || 0;
    const car = doc.breakdownByVehicle?.Car || 0;
    const cash = doc.breakdownByMode?.Cash || 0;
    const upi = doc.breakdownByMode?.UPI || 0;
    const card = doc.breakdownByMode?.Card || 0;

    totalCount += c;
    totalRevenue += rev;
    totalPending += pend;
    bikeCount += b;
    carCount += car;
    cashCount += cash;
    upiCount += upi;
    cardCount += card;

    if (c > 0 || rev > 0 || pend > 0) {
      dailyPoints.push({
        dateKey: doc.id,
        formattedDate: formatDateKeyShort(doc.id),
        count: c,
        revenue: rev,
        pendingAmount: pend,
        bikeCount: b,
        carCount: car,
      });
    }
  }

  // Fallback: If statsList had counts but legacy dailyStats docs lacked vehicle/mode maps,
  // query washes directly to populate vehicle & payment breakdowns accurately
  if (totalCount > 0 && bikeCount === 0 && carCount === 0) {
    try {
      const qWashes = query(
        collection(db, 'washes'),
        where('dateKey', '>=', startDateKey),
        where('dateKey', '<=', endDateKey)
      );
      const snapWashes = await getDocs(qWashes);
      for (const d of snapWashes.docs) {
        const data = d.data();
        if (data.vehicleType === 'Bike') bikeCount++;
        else if (data.vehicleType === 'Car') carCount++;
        if (data.paymentMode === 'Cash') cashCount++;
        else if (data.paymentMode === 'UPI') upiCount++;
        else if (data.paymentMode === 'Card') cardCount++;
      }
    } catch (e) {
      console.warn('Fallback breakdown query on washes skipped:', e);
    }
  }

  // Sort daily points descending by date (most recent first)
  dailyPoints.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const activeDaysCount = dailyPoints.length;
  const avgDailyRevenue = activeDaysCount > 0 ? Math.round(totalRevenue / activeDaysCount) : 0;
  const avgDailyWashes = activeDaysCount > 0 ? Math.round((totalCount / activeDaysCount) * 10) / 10 : 0;

  return {
    period,
    startDateKey,
    endDateKey,
    label,
    subLabel,
    count: totalCount,
    revenue: totalRevenue,
    pendingAmount: totalPending,
    breakdownByVehicle: {
      Bike: bikeCount,
      Car: carCount,
    },
    breakdownByMode: {
      Cash: cashCount,
      UPI: upiCount,
      Card: cardCount,
    },
    activeDaysCount,
    avgDailyRevenue,
    avgDailyWashes,
    dailyPoints,
  };
};
