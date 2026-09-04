import { Injectable } from '@angular/core';
import { User } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { AuthGateway } from './auth.gateway';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // undefined = auth state not yet resolved (initial Firebase check in progress), null = signed out.
  private _user = new BehaviorSubject<User | null | undefined>(undefined);
  user$ = this._user.asObservable();

  constructor(private authGateway: AuthGateway) {
    this.authGateway.observeUser(user => this._user.next(user));
  }

  get currentUser() { return this._user.getValue(); }

  login(email: string, password: string): Promise<unknown> {
    return this.authGateway.signIn(email.trim(), password);
  }

  logout(): Promise<void> {
    return this.authGateway.signOut();
  }
}
