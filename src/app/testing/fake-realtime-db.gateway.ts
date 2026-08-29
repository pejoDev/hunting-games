import { AppState } from '../models';

/**
 * In-memory stand-in for RealtimeDbGateway. Mirrors real Firebase RTDB semantics that the
 * business logic in CompetitionService depends on: writes do NOT update local state by
 * themselves — the service only sees new data once it comes back through observeRoot's
 * callback, exactly like the real onValue listener echoing back a write.
 */
export class FakeRealtimeDbGateway {
  private callback: ((data: any) => void) | null = null;
  writes: Partial<Record<'teams' | 'disciplines' | 'results', unknown>> = {};
  writeCalls: Array<{ path: string; value: unknown }> = [];

  observeRoot(callback: (data: any) => void): void {
    this.callback = callback;
  }

  setCollection(path: 'teams' | 'disciplines' | 'results', value: unknown): Promise<void> {
    this.writes[path] = value;
    this.writeCalls.push({ path, value });
    return Promise.resolve();
  }

  /** Simulates Firebase pushing data to the onValue listener (initial load or another client's write). */
  emit(data: Partial<AppState> | null): void {
    this.callback?.(data);
  }
}
