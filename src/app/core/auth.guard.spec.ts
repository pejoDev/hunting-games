import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthGateway } from './auth.gateway';
import { FakeAuthGateway } from '../testing/fake-auth.gateway';
import { User } from 'firebase/auth';

describe('authGuard', () => {
  let gateway: FakeAuthGateway;

  beforeEach(() => {
    gateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthGateway, useValue: gateway }
      ]
    });
    TestBed.inject(Router);
  });

  function runGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
  }

  it('should not settle before the initial auth state resolves (no premature redirect on refresh)', () => {
    const emissions: Array<boolean | UrlTree> = [];
    runGuard().subscribe(v => emissions.push(v));

    expect(emissions).toEqual([]);
  });

  it('should allow activation when a user is signed in', () => {
    const emissions: Array<boolean | UrlTree> = [];
    runGuard().subscribe(v => emissions.push(v));

    gateway.emit({ email: 'organizator@primjer.hr' } as User);

    expect(emissions).toEqual([true]);
  });

  it('should redirect to /login when signed out', () => {
    const emissions: Array<boolean | UrlTree> = [];
    runGuard().subscribe(v => emissions.push(v));

    gateway.emit(null);

    expect(emissions.length).toBe(1);
    expect((emissions[0] as UrlTree).toString()).toBe('/login');
  });
});
