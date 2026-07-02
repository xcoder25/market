import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Simple configuration check
const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "your_api_key_here" && 
  firebaseConfig.projectId &&
  localStorage.getItem("ibom_offline_mode") !== "true";

if (!isConfigured) {
  if (localStorage.getItem("ibom_offline_mode") === "true") {
    console.info("Running in offline fallback demo mode.");
  } else {
    console.warn(
      "Firebase is not configured yet. Please copy .env.example to .env.local and add your Firebase credentials."
    );
  }
}

// Initialize Firebase (only if configured to avoid SDK startup exceptions with empty parameters)
const app = isConfigured ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) : null;
const auth = isConfigured ? getAuth(app) : null;

// Initialize Firestore with persistent offline local cache support
let db = null;
if (isConfigured && app) {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (err) {
    // If initializeFirestore was already called (e.g. during dev HMR), get the active Firestore instance
    db = getFirestore(app);
  }
}

export { app, auth, db, isConfigured };
