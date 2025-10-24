// src/firebase.ts
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk",
  authDomain: "albayt-sofra.firebaseapp.com",
  projectId: "albayt-sofra",
  storageBucket: "albayt-sofra.appspot.com", // 👈 يظل زي ما هو
  messagingSenderId: "895117143740",
  appId: "1:895117143740:web:239cfccc93d101c1f36ab9",
  measurementId: "G-FK3746ERH8"
}

// ✅ تهيئة التطبيق
export const app = initializeApp(firebaseConfig)

// ✅ الخدمات
export const auth = getAuth(app)
export const db = getFirestore(app)

// ✅ التخزين مربوط بالبكت الجديد
export const storage = getStorage(app, "gs://albayt-sofra.firebasestorage.app")
