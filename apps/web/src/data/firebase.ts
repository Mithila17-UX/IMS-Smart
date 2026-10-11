import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ims-avalon-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ims-avalon-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence (multi-tab enabled for browser & tablet PWA)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators if VITE_USE_EMULATORS is true
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  const host = "localhost";
  const authPort = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099);
  const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080);
  const storagePort = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199);
  const functionsPort = Number(import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT || 5001);

  try {
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, firestorePort);
    connectStorageEmulator(storage, host, storagePort);
    connectFunctionsEmulator(functions, host, functionsPort);
  } catch {
    // Emulator connection errors are suppressed in hot reloads
  }
}
