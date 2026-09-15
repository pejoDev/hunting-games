import { AppState, GulasCompetitor, GulasScore } from '../core/models';

// Shape of the raw Firebase root snapshot - top-level keys as GulasService/CompetitionService
// read them off `data` in their observeRoot callback (gulasCompetitors/gulasScores are the
// Firebase key names, distinct from GulasState's internal competitors/scores field names).
type RootSnapshot = Partial<AppState> & { gulasCompetitors?: GulasCompetitor[]; gulasScores?: GulasScore[] };

/**
 * In-memory stand-in for RealtimeDbGateway. Mirrors real Firebase RTDB semantics that the
 * business logic in CompetitionService depends on: writes do NOT update local state by
 * themselves — the service only sees new data once it comes back through observeRoot's
 * callback, exactly like the real onValue listener echoing back a write.
 */
type CollectionPath = 'teams' | 'disciplines' | 'results' | 'gulasCompetitors' | 'gulasScores';

export class FakeRealtimeDbGateway {
  private callback: ((data: any) => void) | null = null;
  writes: Partial<Record<CollectionPath, unknown>> = {};
  writeCalls: Array<{ path: string; value: unknown }> = [];

  observeRoot(callback: (data: any) => void): void {
    this.callback = callback;
  }

  setCollection(path: CollectionPath, value: unknown): Promise<void> {
    this.writes[path] = value;
    this.writeCalls.push({ path, value });
    return Promise.resolve();
  }

  setCollections(updates: Partial<Record<CollectionPath, unknown>>): Promise<void> {
    for (const [path, value] of Object.entries(updates)) {
      this.writes[path as CollectionPath] = value;
      this.writeCalls.push({ path, value });
    }
    return Promise.resolve();
  }

  /** Simulates Firebase pushing data to the onValue listener (initial load or another client's write). */
  emit(data: RootSnapshot | null): void {
    this.callback?.(data);
  }
}
