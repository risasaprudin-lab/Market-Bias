import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// User Profile Operations
export interface UserProfileData {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `user_profiles/${user.uid}`;
  try {
    const userDocRef = doc(db, 'user_profiles', user.uid);
    const existingSnap = await getDoc(userDocRef);
    const nowIso = new Date().toISOString();

    if (!existingSnap.exists()) {
      await setDoc(userDocRef, {
        userId: user.uid,
        displayName: user.displayName || 'Trader',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } else {
      await setDoc(
        userDocRef,
        {
          displayName: user.displayName || 'Trader',
          photoURL: user.photoURL || '',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// User Settings Operations
export interface UserSettingsData {
  userId: string;
  workerUrl?: string;
  apiKey?: string;
  selectedTimeframe?: string;
  streakThreshold?: number;
  theme?: 'dark' | 'light' | 'system';
  favoritePairs?: string[];
  updatedAt?: string;
}

export async function getUserSettings(userId: string): Promise<UserSettingsData | null> {
  const path = `user_settings/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'user_settings', userId));
    return snap.exists() ? (snap.data() as UserSettingsData) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserSettings(settings: UserSettingsData): Promise<void> {
  const path = `user_settings/${settings.userId}`;
  try {
    await setDoc(doc(db, 'user_settings', settings.userId), {
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Trading Journal Operations
export interface JournalEntry {
  id: string;
  userId: string;
  pair: string;
  category: 'crypto' | 'metals' | 'inst' | 'forex';
  dir: 'LONG' | 'SHORT' | 'NEUTRAL';
  roc?: number;
  price?: number;
  notes: string;
  timestamp: number;
  createdAt: string;
}

export async function addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<void> {
  const entryId = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `users/${entry.userId}/journal/${entryId}`;
  try {
    await setDoc(doc(db, 'users', entry.userId, 'journal', entryId), {
      ...entry,
      id: entryId,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const path = `users/${userId}/journal/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'journal', entryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeJournal(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${userId}/journal`;
  const q = query(collection(db, 'users', userId, 'journal'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((d) => d.data() as JournalEntry);
      onUpdate(entries);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Authentication Helpers
export async function loginWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(cred.user);
    return cred.user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}
