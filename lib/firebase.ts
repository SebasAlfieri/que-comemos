import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_V2,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_V2,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_V2,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_V2,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_V2,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_V2,
};

const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

let authReady: Promise<User> | null = null;

/**
 * Resuelve cuando hay un usuario (anónimo) logueado.
 * Toda consulta a Firestore tiene que esperar esto, porque las reglas exigen request.auth.
 */
export function ensureAuth(): Promise<User> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authReady) {
    authReady = new Promise<User>((resolve, reject) => {
      const unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsub();
            resolve(user);
          } else {
            signInAnonymously(auth).catch((error) => {
              unsub();
              authReady = null;
              reject(error);
            });
          }
        },
        (error) => {
          unsub();
          authReady = null;
          reject(error);
        },
      );
    });
  }
  return authReady;
}
