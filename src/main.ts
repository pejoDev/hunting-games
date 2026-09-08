import { provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { AppComponent, routes } from './app/app.component';
import { FIREBASE_DATABASE } from './app/core/firebase-database.token';
import { FIREBASE_AUTH } from './app/core/firebase-auth.token';
import { environment } from './environments/environment';

const firebaseApp = initializeApp(environment.firebase);
const database = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

if (environment.useEmulators) {
  connectDatabaseEmulator(database, '127.0.0.1', 9000);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr()),
    { provide: FIREBASE_DATABASE, useValue: database },
    { provide: FIREBASE_AUTH, useValue: auth }
  ]
}).catch(err => console.error(err));
