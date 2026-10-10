import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { DailyStats } from './types';
import { getISTDateKey } from './washes';

export const getDailyStats = async (dateKey: string = getISTDateKey()): Promise<DailyStats | null> => {
  const docRef = doc(db, 'dailyStats', dateKey);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as DailyStats;
  }
  return null;
};

// For week/month views, we can query range
export const getStatsRange = async (startDateKey: string, endDateKey: string): Promise<DailyStats[]> => {
  const q = query(
    collection(db, 'dailyStats'),
    where('__name__', '>=', startDateKey),
    where('__name__', '<=', endDateKey)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as DailyStats);
};
