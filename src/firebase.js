import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// 👇 Firebase Console > Project Settings > General > "Your apps" > SDK config se copy karo
const firebaseConfig = {
  apiKey: 'AIzaSyA8ykLyXlhexkwrqUdEm8iJ_yKzv58EyKI',
  authDomain: 'om-geranal-manager.firebaseapp.com',
  projectId: 'om-geranal-manager',
  storageBucket: 'om-geranal-manager.firebasestorage.app',
  messagingSenderId: '1028111163848',
  appId: '1:1028111163848:web:f92270lb0341O3c4b820fd',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
