import { getAuth } from 'firebase-admin/auth';
import { HelperHoaStore } from '../store';
import { User } from '../types';

export class UserService {
  constructor(private store: HelperHoaStore) {}

  async createEmployee(employeeData: Omit<User, 'id'>, initialPassword: string): Promise<User> {
    // 1. Basic validation
    if (!employeeData.email || !initialPassword) {
      throw new Error('Email and initial password are required');
    }
    if (initialPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // 2. Create login record in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email: employeeData.email,
      password: initialPassword,
      displayName: `${employeeData.name} ${employeeData.lastName}`.trim(),
    });

    // 3. Construct user profile using Firebase Auth UID as document ID
    const newUser: User = {
      ...employeeData,
      id: userRecord.uid,
    };

    // 4. Save profile & role in Firestore
    try {
      await this.store.createUser(newUser);
    } catch (error) {
      // Rollback: delete Auth user if Firestore document creation fails
      await getAuth().deleteUser(userRecord.uid);
      throw error;
    }

    return newUser;
  }

  async deleteEmployee(uid: string): Promise<void> {
    const existingUser = await this.store.user(uid);
    if (!existingUser) {
      throw new Error(`User with ID ${uid} not found`);
    }

    // 1. Revoke login access from Firebase Authentication
    await getAuth().deleteUser(uid);

    // 2. Remove profile record from Firestore
    await this.store.deleteUser(uid);
  }

  async getUserById(uid: string): Promise<User | undefined> {
    return this.store.user(uid);
  }
}