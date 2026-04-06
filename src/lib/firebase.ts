import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function missingEnv(): boolean {
  return Object.values(firebaseConfig).some((v) => !v);
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (missingEnv()) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}

export function getFirebaseStorage() {
  const a = getFirebaseApp();
  return a ? getStorage(a) : null;
}

export function getFirebaseFunctions() {
  const a = getFirebaseApp();
  return a ? getFunctions(a, "us-central1") : null;
}
