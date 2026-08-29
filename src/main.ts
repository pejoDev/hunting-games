import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { AppComponent, routes } from './app/app.component';
import { FIREBASE_DATABASE } from './app/firebase-database.token';
import { environment } from './environments/environment';

const firebaseApp = initializeApp(environment.firebase);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    { provide: FIREBASE_DATABASE, useValue: getDatabase(firebaseApp) }
  ]
}).catch(err => console.error(err));
