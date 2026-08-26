import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCzNje5bQZ_5P0s0KQeK0s0KQeK0s0KQeK0s0",
  authDomain: "mujer-express.firebaseapp.com",
  projectId: "mujer-express",
  storageBucket: "mujer-express.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl01"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);