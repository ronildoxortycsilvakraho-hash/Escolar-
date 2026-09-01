// js/firebase.js
// Configuração e inicialização do Firebase (SDK modular v10, via CDN)
// Não é necessário instalar nada — basta abrir os arquivos .html num servidor local.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração do projeto Firebase (ITA Fast Food / flashfood)
const firebaseConfig = {
  apiKey: "AIzaSyBZIyoSbSIaWIn3YJ5AKpuaomjC2RAXG20",
  authDomain: "flashfood-e1da4.firebaseapp.com",
  projectId: "flashfood-e1da4",
  storageBucket: "flashfood-e1da4.firebasestorage.app",
  messagingSenderId: "743958656907",
  appId: "1:743958656907:web:91e8cee2e981dc2a64e18e",
  measurementId: "G-9V5KSJN9FJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db,
  // auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  // firestore
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
};
