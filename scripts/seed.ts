import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  const adminEmail = process.argv[2] || 'owner@washledger.com';
  const adminPassword = process.argv[3] || 'admin123456';

  console.log(`Creating admin user: ${adminEmail}`);

  try {
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      user = userCredential.user;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        console.log('User exists, logging in instead...');
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = userCredential.user;
      } else {
        throw err;
      }
    }

    // Create user doc
    await setDoc(doc(db, 'users', user.uid), {
      name: 'Admin',
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString()
    });
    console.log('Admin user and role created successfully.');

    // Create some sample services
    const services = [
      { id: 'bike-wash', vehicleType: 'Bike', name: 'Standard Wash', price: 100, active: true },
      { id: 'car-wash-b', vehicleType: 'Car', name: 'Body Wash', price: 300, active: true },
      { id: 'car-wash-c', vehicleType: 'Car', name: 'Complete Wash', price: 500, active: true }
    ];

    for (const s of services) {
      await setDoc(doc(db, 'services', s.id), s);
    }
    console.log('Sample services created successfully.');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seed();
