// Importamos las herramientas de Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Tus datos de conexión — NO se comparten con nadie
const firebaseConfig = {
  apiKey: "AIzaSyDCgqnWzMnWJhkdT6xtN5wzTxFxwg9Lla8",
  authDomain: "mujeres-express.firebaseapp.com",
  projectId: "mujeres-express",
  storageBucket: "mujeres-express.firebasestorage.app",
  messagingSenderId: "836599127765",
  appId: "1:836599127765:web:b1164243c033ce82080c5c"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Conectamos los servicios que vamos a usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;