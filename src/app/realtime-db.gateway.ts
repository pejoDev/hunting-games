import { Injectable } from '@angular/core';
import { Database, ref, onValue, set } from '@angular/fire/database';

/**
 * Thin seam around the @angular/fire/database free functions. AngularFire ships as ESM with
 * read-only named exports, so they can't be spied on directly in tests — this wrapper is the
 * substitutable boundary instead. No business logic lives here.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeDbGateway {
  constructor(private db: Database) {}

  observeRoot(callback: (data: any) => void): void {
    onValue(ref(this.db), (snapshot) => callback(snapshot.val()));
  }

  setCollection(path: 'teams' | 'disciplines' | 'results', value: unknown): Promise<void> {
    return set(ref(this.db, path), value);
  }
}
