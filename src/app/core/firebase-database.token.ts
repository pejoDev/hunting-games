import { InjectionToken } from '@angular/core';
import { Database } from 'firebase/database';

export const FIREBASE_DATABASE = new InjectionToken<Database>('FIREBASE_DATABASE');
