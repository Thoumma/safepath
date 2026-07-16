import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Web app config from the Firebase console (safepath-cfefc). These are
// public client identifiers, not secrets — same trust level as the
// Supabase anon key.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** Firebase app singleton — safe to import from both server and client code. */
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let analytics: Analytics | null = null;

/**
 * Analytics only exists in the browser (it touches window/IndexedDB), so it
 * cannot be initialized at module scope in Next.js. Call from a client
 * component after mount; resolves to null during SSR or in unsupported
 * environments.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!analytics && (await isSupported())) {
    analytics = getAnalytics(firebaseApp);
  }
  return analytics;
}
