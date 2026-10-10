import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    // Read the rules file
    const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');
    
    // Initialize the test environment
    testEnv = await initializeTestEnvironment({
      projectId: 'veichlewashledger-test',
      firestore: { rules }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    
    // Setup initial data using admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Admin user
      await db.collection('users').doc('admin_id').set({ role: 'admin', active: true });
      // Active worker
      await db.collection('users').doc('worker_id').set({ role: 'worker', active: true });
      // Inactive worker
      await db.collection('users').doc('inactive_id').set({ role: 'worker', active: false });
      
      // Sample service
      await db.collection('services').doc('service_1').set({ price: 100 });
      
      // Sample wash owned by worker_id
      await db.collection('washes').doc('wash_1').set({ workerId: 'worker_id', amount: 100 });
    });
  });

  describe('Users Collection', () => {
    it('allows a user to read their own document', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertSucceeds(db.collection('users').doc('worker_id').get());
    });

    it('denies a user from reading another users document', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertFails(db.collection('users').doc('admin_id').get());
    });

    it('allows an admin to read any user document', async () => {
      const db = testEnv.authenticatedContext('admin_id').firestore();
      await assertSucceeds(db.collection('users').doc('worker_id').get());
    });
  });

  describe('Services Collection', () => {
    it('allows an active worker to read services', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertSucceeds(db.collection('services').get());
    });

    it('denies an inactive worker from reading services', async () => {
      const db = testEnv.authenticatedContext('inactive_id').firestore();
      await assertFails(db.collection('services').get());
    });

    it('denies a worker from modifying services', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertFails(db.collection('services').doc('service_1').update({ price: 200 }));
    });

    it('allows an admin to modify services', async () => {
      const db = testEnv.authenticatedContext('admin_id').firestore();
      await assertSucceeds(db.collection('services').doc('service_1').update({ price: 200 }));
    });
  });

  describe('Washes Collection', () => {
    it('allows a worker to read their own washes', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      // Must use where clause matching their ID
      const query = db.collection('washes').where('workerId', '==', 'worker_id');
      await assertSucceeds(query.get());
    });

    it('denies a worker from reading another workers washes', async () => {
      const db = testEnv.authenticatedContext('inactive_id').firestore(); // or another worker
      await assertFails(db.collection('washes').doc('wash_1').get());
    });

    it('allows an active worker to create a wash under their own ID', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertSucceeds(db.collection('washes').add({ workerId: 'worker_id', amount: 150 }));
    });

    it('denies an active worker from creating a wash under another ID', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertFails(db.collection('washes').add({ workerId: 'admin_id', amount: 150 }));
    });

    it('denies a worker from updating a wash', async () => {
      const db = testEnv.authenticatedContext('worker_id').firestore();
      await assertFails(db.collection('washes').doc('wash_1').update({ amount: 0 }));
    });
    
    it('allows an admin to update a wash', async () => {
      const db = testEnv.authenticatedContext('admin_id').firestore();
      await assertSucceeds(db.collection('washes').doc('wash_1').update({ amount: 0 }));
    });
  });
});
