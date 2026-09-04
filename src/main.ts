import { provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { AppComponent, routes } from './app/app.component';
import { FIREBASE_DATABASE } from './app/firebase-database.token';
import { FIREBASE_AUTH } from './app/firebase-auth.token';
import { environment } from './environments/environment';

const firebaseApp = initializeApp(environment.firebase);

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr()),
    { provide: FIREBASE_DATABASE, useValue: getDatabase(firebaseApp) },
    { provide: FIREBASE_AUTH, useValue: getAuth(firebaseApp) }
  ]
}).catch(err => console.error(err));
