import { getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDeo61v9RdziPVwdbXn31ksqSLLYM-v9lY",
  authDomain: "smart-home-app-eaeaa.firebaseapp.com",
  databaseURL: "https://smart-home-app-eaeaa-default-rtdb.firebaseio.com",
  projectId: "smart-home-app-eaeaa",
  storageBucket: "smart-home-app-eaeaa.firebasestorage.app",
  messagingSenderId: "900450797659",
  appId: "1:900450797659:web:e19d3eb60d415ef663d77e",
  measurementId: "G-L9K5YH7KV7",
};

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
