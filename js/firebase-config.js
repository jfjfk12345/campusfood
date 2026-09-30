import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDykTrZuf_J34VZIbYAwtISAq-mGCM_5bc",
  authDomain: "campusfood-d8b45.firebaseapp.com",
  projectId: "campusfood-d8b45",
  storageBucket: "campusfood-d8b45.firebasestorage.app",
  messagingSenderId: "137509458524",
  appId: "1:137509458524:web:c75610b067937b02648c99",
  measurementId: "G-KJ8NM8V9HM"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
