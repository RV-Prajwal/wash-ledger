import { 
  collection, doc, writeBatch, serverTimestamp, increment, 
  query, where, orderBy, limit, getDocs, onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Wash } from './types';

// Helper to get IST date string (YYYY-MM-DD)
export const getISTDateKey = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
};

export const saveWash = async (washData: Omit<Wash, 'id' | 'washedAt' | 'deviceTime' | 'dateKey' | 'voided' | 'workerId'>, workerId: string) => {
  const batch = writeBatch(db);
  const washRef = doc(collection(db, 'washes'));
  const dateKey = getISTDateKey();
  
  const fullWashData: Omit<Wash, 'id' | 'hasPendingWrites'> = {
    ...washData,
    workerId,
    washedAt: serverTimestamp() as any,
    deviceTime: new Date().toISOString(),
    dateKey,
    voided: false
  };
  
  batch.set(washRef, fullWashData);
  
  // Update dailyStats
  const statsRef = doc(db, 'dailyStats', dateKey);
  
  const statUpdate: any = {
    count: increment(1),
    [`breakdownByVehicle.${washData.vehicleType}`]: increment(1),
    [`breakdownByMode.${washData.paymentMode}`]: increment(1)
  };
  
  if (washData.status === 'paid') {
    statUpdate.revenue = increment(washData.amount);
  } else {
    statUpdate.pendingAmount = increment(washData.amount);
  }
  
  batch.set(statsRef, statUpdate, { merge: true });
  
  await batch.commit();
  return washRef.id;
};

// Check if plate was scanned recently by this worker
export const checkRecentDuplicate = async (plate: string, workerId: string, minutes = 15): Promise<boolean> => {
  const dateKey = getISTDateKey();
  const q = query(
    collection(db, 'washes'),
    where('workerId', '==', workerId),
    where('dateKey', '==', dateKey),
    where('plate', '==', plate)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return false;
  
  const washes = snap.docs.map(doc => doc.data() as Wash);
  // Sort descending by deviceTime client-side
  washes.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
  
  const lastWash = washes[0];
  const lastWashTime = new Date(lastWash.deviceTime).getTime();
  const now = new Date().getTime();
  
  return (now - lastWashTime) < minutes * 60 * 1000;
};

// Subscribe to latest washes for a worker (Home screen)
export const subscribeToWorkerWashes = (workerId: string, callback: (washes: Wash[]) => void) => {
  const dateKey = getISTDateKey();
  const q = query(
    collection(db, 'washes'),
    where('workerId', '==', workerId),
    where('dateKey', '==', dateKey)
  );
  
  return onSnapshot(q, (snapshot) => {
    let washes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      hasPendingWrites: doc.metadata.hasPendingWrites
    } as Wash));
    
    // Sort descending by deviceTime client-side and limit to 50
    washes.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
    washes = washes.slice(0, 50);
    
    callback(washes);
  });
};

// Admin function to update a wash (e.g., mark paid, void, or correct plate/amount)
export const updateWash = async (washId: string, updates: Partial<Wash>, adminId: string, reason: string = 'Admin correction') => {
  const washRef = doc(db, 'washes', washId);
  
  // Create an audit trail entry
  const auditRef = doc(collection(washRef, 'audit'));
  const auditData = {
    updatedAt: new Date().toISOString(),
    adminId,
    reason,
    updates
  };

  // Run as batch to ensure both update and audit are saved
  const batch = writeBatch(db);
  batch.update(washRef, updates);
  batch.set(auditRef, auditData);
  
  await batch.commit();
};
