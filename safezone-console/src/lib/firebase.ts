import type { Analytics } from "firebase/analytics";

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

let analytics: Analytics | null = null;
let started = false;

/**
 * Analytics only exists in the browser (it touches window/IndexedDB), so it
 * cannot be initialized at module scope in Next.js. Call from a client
 * component after mount; resolves to null during SSR or in unsupported
 * environments.
 *
 * ## Why the imports live inside the function
 *
 * `firebase/app` + `firebase/analytics` are a large dependency, and
 * `<FirebaseAnalytics />` sits in the **root** layout — so a static import
 * here shipped Firebase in the first-load bundle of every route, including the
 * public report site that Lao visitors open on mobile data. Measurement is
 * never worth delaying the thing being measured.
 *
 * Importing dynamically moves Firebase into its own chunk, fetched after mount
 * and off the critical path. The `type` import above is erased at compile time
 * and costs nothing.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analytics) return analytics;
  if (started) return null; // already initialised, in flight, or unsupported
  started = true;

  try {
    const [{ getApp, getApps, initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
      import("firebase/app"),
      import("firebase/analytics"),
    ]);
    if (!(await isSupported())) return null;
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    return analytics;
  } catch {
    // Analytics must never break the page it is measuring — an ad blocker,
    // an offline load, or an unsupported browser all land here.
    return null;
  }
}
