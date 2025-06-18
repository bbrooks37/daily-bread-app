// src/firebase.ts
// This file centralizes Firebase configuration and initialization.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// In a production environment, it's recommended to load these values
// from environment variables for security and flexibility.
export const firebaseConfig = {
  apiKey: "AIzaSyCbv2ZbGUQhJ7kTDh370fuy_hEn5ilCW2w",
  authDomain: "daily-verses-bread.firebaseapp.com",
  projectId: "daily-verses-bread",
  storageBucket: "daily-verses-bread.firebasestorage.app",
  messagingSenderId: "394760345294",
  appId: "1:394760345294:web:35e00a44c1c62d3d26629f",
  measurementId: "G-HFK9DH3WNE"
};

// Initialize the Firebase application
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore services
export const auth = getAuth(app);
export const db = getFirestore(app);
