import { collection, getDocs, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Service } from './types';

export const getServices = async (activeOnly = true): Promise<Service[]> => {
  const q = activeOnly 
    ? query(collection(db, 'services'), where('active', '==', true))
    : collection(db, 'services');
    
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
};

export const updateService = async (id: string, data: Partial<Service>) => {
  await updateDoc(doc(db, 'services', id), data);
};

export const createService = async (id: string, data: Service) => {
  await setDoc(doc(db, 'services', id), data);
};
