import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'worker';

export interface User {
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  vehicleType: 'Bike' | 'Car';
  name: string;
  price: number;
  active: boolean;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card';
export type WashStatus = 'paid' | 'pending';

export interface Wash {
  id?: string;
  plate: string;
  vehicleType: 'Bike' | 'Car';
  serviceId: string;
  serviceName: string;
  amount: number;
  paymentMode: PaymentMode;
  status: WashStatus;
  washedAt: Timestamp; // serverTimestamp
  deviceTime: string;
  dateKey: string; // YYYY-MM-DD in IST
  workerId: string;
  voided: boolean;
  hasPendingWrites?: boolean; // Client-only flag
}

export interface DailyStats {
  count: number;
  revenue: number;
  pendingAmount: number;
  breakdownByVehicle: {
    Bike: number;
    Car: number;
  };
  breakdownByMode: {
    Cash: number;
    UPI: number;
    Card: number;
  };
}
