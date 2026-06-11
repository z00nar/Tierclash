// Firebase setup — CDN version, works with Live Server
const firebaseConfig = {
  apiKey: "AIzaSyCP2dDb4PlsoXLPTwNOU1OF1CX-AdTKL48",
  authDomain: "tierclash-a263a.firebaseapp.com",
  databaseURL: "https://tierclash-a263a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tierclash-a263a",
  storageBucket: "tierclash-a263a.firebasestorage.app",
  messagingSenderId: "956029674877",
  appId: "1:956029674877:web:b44c685c1b0312995cd814",
};

firebase.initializeApp(firebaseConfig);

// make login + database available to the rest of the app
window.auth = firebase.auth();
window.db = firebase.database();