import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Waits for the first resolved auth state (Firebase's initial onAuthStateChanged check runs
 * asynchronously, so `undefined` means "not resolved yet" and must not be treated as signed out —
 * otherwise a page refresh would bounce a signed-in user to /login for a moment).
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => (user ? true : router.createUrlTree(['/login'])))
  );
};
