import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthGateway } from './auth.gateway';
import { FakeAuthGateway } from './testing/fake-auth.gateway';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let gateway: FakeAuthGateway;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    gateway = new FakeAuthGateway();
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthGateway, useValue: gateway },
        { provide: Router, useValue: router }
      ]
    });
    component = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('should do nothing when email or password is missing', async () => {
    component.email = '';
    component.password = '';

    await component.submit();

    expect(gateway.signInCalls).toEqual([]);
  });

  it('should sign in and navigate to the overview on success', async () => {
    component.email = 'organizator@primjer.hr';
    component.password = 'lozinka123';

    await component.submit();

    expect(gateway.signInCalls).toEqual([{ email: 'organizator@primjer.hr', password: 'lozinka123' }]);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(component.errorMessage).toBe('');
  });

  it('should show an error message and stay put when the credentials are rejected', async () => {
    gateway.nextSignInError = new Error('auth/wrong-password');
    component.email = 'organizator@primjer.hr';
    component.password = 'pogresna';

    await component.submit();

    expect(component.errorMessage).toBe('Neispravan email ili lozinka.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });
});
