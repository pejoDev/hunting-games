// Koristi se isključivo za Playwright E2E testove (ng serve --configuration=e2e).
// `firebase` polje se ne koristi za stvarnu mrežnu komunikaciju kad je useEmulators true —
// Firebase SDK preusmjerava sve pozive na lokalne emulatore (main.ts), tako da testovi
// nikad ne diraju produkcijsku bazu.
export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: "AIzaSyB4DM8WHI2g4oL9wmy09wk2_oKWXmBBPRs",
    authDomain: "hunting-games-fe57e.firebaseapp.com",
    databaseURL: "https://hunting-games-fe57e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hunting-games-fe57e",
    storageBucket: "hunting-games-fe57e.firebasestorage.app",
    messagingSenderId: "701646953082",
    appId: "1:701646953082:web:cb307f7f95d8db5445f9c3",
    measurementId: "G-J4RBNB35Q8"
  }
};
