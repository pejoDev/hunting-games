import { User } from 'firebase/auth';

/**
 * In-memory stand-in for AuthGateway. Mirrors real Firebase Auth semantics that AuthService
 * depends on: signIn does NOT push the new user by itself — the caller only sees it once it
 * comes back through observeUser's callback, exactly like the real onAuthStateChanged listener.
 */
export class FakeAuthGateway {
  private callback: ((user: User | null) => void) | null = null;
  signInCalls: Array<{ email: string; password: string }> = [];
  signOutCalls = 0;
  nextSignInError: Error | null = null;

  observeUser(callback: (user: User | null) => void): void {
    this.callback = callback;
  }

  signIn(email: string, password: string): Promise<unknown> {
    this.signInCalls.push({ email, password });
    if (this.nextSignInError) {
      return Promise.reject(this.nextSignInError);
    }
    return Promise.resolve();
  }

  signOut(): Promise<void> {
    this.signOutCalls++;
    this.emit(null);
    return Promise.resolve();
  }

  /** Simulates Firebase pushing an auth state change to the onAuthStateChanged listener. */
  emit(user: Partial<User> | null): void {
    this.callback?.(user as User | null);
  }
}
