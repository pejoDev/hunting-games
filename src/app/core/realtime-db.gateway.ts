import { Inject, Injectable } from '@angular/core';
import { Database, ref, onValue, set } from 'firebase/database';
import { FIREBASE_DATABASE } from './firebase-database.token';

/**
 * Thin seam around the firebase/database free functions. The SDK ships as ESM with read-only
 * named exports, so they can't be spied on directly in tests — this wrapper is the substitutable
 * boundary instead. No business logic lives here.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeDbGateway {
  constructor(@Inject(FIREBASE_DATABASE) private db: Database) {}

  observeRoot(callback: (data: any) => void): void {
    onValue(ref(this.db), (snapshot) => callback(snapshot.val()));
  }

  setCollection(path: 'teams' | 'disciplines' | 'results', value: unknown): Promise<void> {
    return set(ref(this.db, path), value);
  }
}
