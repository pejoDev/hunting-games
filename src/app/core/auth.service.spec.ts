import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthGateway } from './auth.gateway';
import { FakeAuthGateway } from '../testing/fake-auth.gateway';
import { User } from 'firebase/auth';

describe('AuthService', () => {
  let service: AuthService;
  let gateway: FakeAuthGateway;

  const user = (overrides: Partial<User> = {}): User => ({ email: 'organizator@primjer.hr', ...overrides } as User);

  beforeEach(() => {
    gateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthGateway, useValue: gateway }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should start with an unresolved auth state before Firebase reports back', () => {
    expect(service.currentUser).toBeUndefined();
  });

  it('should expose the signed-in user once the auth listener reports one', () => {
    gateway.emit(user());

    expect(service.currentUser?.email).toBe('organizator@primjer.hr');
  });

  it('should expose null once the auth listener reports signed-out', () => {
    gateway.emit(user());
    gateway.emit(null);

    expect(service.currentUser).toBeNull();
  });

  it('should emit auth state changes through user$ to subscribers', () => {
    const emissions: Array<User | null | undefined> = [];
    service.user$.subscribe(u => emissions.push(u));

    gateway.emit(user());

    expect(emissions).toEqual([undefined, user()]);
  });

  describe('login', () => {
    it('should trim the email and forward credentials to the gateway', async () => {
      await service.login('  organizator@primjer.hr  ', 'lozinka123');

      expect(gateway.signInCalls).toEqual([{ email: 'organizator@primjer.hr', password: 'lozinka123' }]);
    });

    it('should reject when the gateway rejects (e.g. wrong password)', async () => {
      gateway.nextSignInError = new Error('auth/wrong-password');

      await expectAsync(service.login('organizator@primjer.hr', 'pogresna')).toBeRejected();
    });
  });

  describe('logout', () => {
    it('should sign the user out and clear the current user', async () => {
      gateway.emit(user());

      await service.logout();

      expect(gateway.signOutCalls).toBe(1);
      expect(service.currentUser).toBeNull();
    });
  });
});
