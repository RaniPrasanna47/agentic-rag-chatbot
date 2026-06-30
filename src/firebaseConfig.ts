import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "optimistic-ripple-z8phd",
  appId: "1:727382741648:web:9a77c8fc3b248113467e15",
  apiKey: "AIzaSyDd6EyEwFnv-Wl5QOJAGNTVF5ta7oE8RPg",
  authDomain: "optimistic-ripple-z8phd.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-66de4676-3dfd-4886-b7c0-8e3b6377f9c2",
  storageBucket: "optimistic-ripple-z8phd.firebasestorage.app",
  messagingSenderId: "727382741648"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore with explicit database ID
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-66de4676-3dfd-4886-b7c0-8e3b6377f9c2");

export default app;
