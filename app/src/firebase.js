import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
    apiKey: "AIzaSyArfzFVKK5wW5g-1vuhKUnDEgsvJDvi1LQ",
    authDomain: "bullet-sportsday.firebaseapp.com",
    databaseURL: "https://bullet-sportsday-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bullet-sportsday",
    storageBucket: "bullet-sportsday.firebasestorage.app",
    messagingSenderId: "50259158706",
    appId: "1:50259158706:web:82e16f4662983b21f0cbab"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)