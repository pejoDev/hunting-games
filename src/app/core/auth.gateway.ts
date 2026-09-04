import { Inject, Injectable } from '@angular/core';
import { Auth, User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase-auth.token';

/**
 * Thin seam around the firebase/auth free functions. The SDK ships as ESM with read-only
 * named exports, so they can't be spied on directly in tests — this wrapper is the substitutable
 * boundary instead. No business logic lives here.
 */
@Injectable({ providedIn: 'root' })
export class AuthGateway {
  constructor(@Inject(FIREBASE_AUTH) private auth: Auth) {}

  observeUser(callback: (user: User | null) => void): void {
    onAuthStateChanged(this.auth, callback);
  }

  signIn(email: string, password: string): Promise<unknown> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
