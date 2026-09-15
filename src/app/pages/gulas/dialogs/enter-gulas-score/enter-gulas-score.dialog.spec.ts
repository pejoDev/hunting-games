import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EnterGulasScoreDialog } from './enter-gulas-score.dialog';
import { GulasService } from '../../../../core/gulas.service';
import { RealtimeDbGateway } from '../../../../core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../../../../testing/fake-realtime-db.gateway';
import { GulasCompetitor, GulasCriteriaScores, GulasScore } from '../../../../core/models';

describe('EnterGulasScoreDialog', () => {
  let component: EnterGulasScoreDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EnterGulasScoreDialog>>;
  let gulasService: GulasService;
  let gateway: FakeRealtimeDbGateway;

  const jelen: GulasCompetitor = { id: 1, codeName: 'JELEN' };

  const criteria = (overrides: Partial<GulasCriteriaScores> = {}): GulasCriteriaScores => ({
    boja: 5, izgled: 4, gustoca: 5, okus: 9, dojam: 4,
    ...overrides
  });

  const score = (overrides: Partial<GulasScore> = {}): GulasScore => ({
    id: 1, competitorId: 1, judge: 1, criteria: criteria(),
    ...overrides
  });

  // Live database round-trip: seeds `scores` and makes gulasService.setScore both resolve AND
  // immediately echo the updated snapshot back through the fake gateway - mirrors real Firebase's
  // optimistic local cache, which the dialog's auto-advance logic (reads gulasService state right
  // after awaiting setScore) depends on. FakeRealtimeDbGateway itself deliberately does NOT do
  // this (see its own header comment) since other specs rely on writes not self-updating state.
  function seedLiveScores(initial: GulasScore[]) {
    let scores = [...initial];
    gateway.emit({ gulasCompetitors: [jelen], gulasScores: scores });

    spyOn(gulasService, 'setScore').and.callFake(async (competitorId: number, judge: 1 | 2 | 3, c: GulasCriteriaScores) => {
      const idx = scores.findIndex(s => s.competitorId === competitorId && s.judge === judge);
      if (idx >= 0) {
        scores = [...scores];
        scores[idx] = { ...scores[idx], criteria: c };
      } else {
        scores = [...scores, { id: scores.length + 1, competitorId, judge, criteria: c }];
      }
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: scores });
    });
  }

  function fillValidCriteria() {
    component.values = { boja: 5, izgled: 4, gustoca: 5, okus: 9, dojam: 4 };
  }

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [EnterGulasScoreDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        GulasService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });

    gulasService = TestBed.inject(GulasService);
    gateway.emit({ gulasCompetitors: [jelen], gulasScores: [] });
    component = TestBed.createComponent(EnterGulasScoreDialog).componentInstance;
    component.ngOnInit();
  });

  it('should load all existing competitors as selectable options on init', () => {
    expect(component.availableCompetitors).toEqual([jelen]);
  });

  describe('judgeState', () => {
    it('should be "pending" for every judge when no competitor is selected', () => {
      expect(component.judgeState(1)).toBe('pending');
    });

    it('should be "done" for a judge that has already scored the selected competitor', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [score({ judge: 1 })] });
      component.selectedCompetitor = jelen;
      component.selectedJudge = 2;

      expect(component.judgeState(1)).toBe('done');
    });

    it('should be "current" for the selected (unscored) judge', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 2;

      expect(component.judgeState(2)).toBe('current');
    });

    it('should be "pending" for an unscored judge that is not currently selected', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;

      expect(component.judgeState(3)).toBe('pending');
    });
  });

  describe('onCompetitorSelected', () => {
    it('should reset judge and values when the selection is cleared', () => {
      component.selectedCompetitor = null;
      component.onCompetitorSelected();

      expect(component.selectedJudge).toBeNull();
      expect(component.values).toEqual({ boja: null, izgled: null, gustoca: null, okus: null, dojam: null });
    });

    it('should auto-select judge 1 for a competitor with no scores at all', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();

      expect(component.selectedJudge).toBe(1);
      expect(component.values['boja']).toBeNull();
    });

    it('should skip already-scored judges and land on the first unscored one', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [score({ judge: 1 })] });

      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();

      expect(component.selectedJudge as number).toBe(2);
      expect(component.values['boja']).toBeNull();
    });

    it('should fall back to judge 1 (with prefilled values) when the competitor is already fully scored', () => {
      gateway.emit({
        gulasCompetitors: [jelen],
        gulasScores: [1, 2, 3].map(j => score({ id: j, judge: j as 1 | 2 | 3 }))
      });

      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();

      expect(component.selectedJudge as number).toBe(1);
      expect(component.values).toEqual(criteria() as any);
    });

    it('should clear any previous "just completed" panel state', () => {
      component.justCompletedCodeName = 'SRNA';
      component.selectedCompetitor = jelen;

      component.onCompetitorSelected();

      expect(component.justCompletedCodeName).toBeNull();
    });
  });

  describe('onJudgeSelected', () => {
    it('should prefill values when the manually-picked judge already scored this competitor', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [score({ judge: 1, criteria: criteria({ okus: 7 }) })] });
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;

      component.onJudgeSelected();

      expect(component.values).toEqual(criteria({ okus: 7 }) as any);
    });

    it('should reset values when the manually-picked judge has not scored this competitor', () => {
      component.values = criteria() as any;
      component.selectedCompetitor = jelen;
      component.selectedJudge = 3;

      component.onJudgeSelected();

      expect(component.values).toEqual({ boja: null, izgled: null, gustoca: null, okus: null, dojam: null });
    });
  });

  describe('isAlreadyScored', () => {
    it('should be false when no competitor/judge is selected', () => {
      expect(component.isAlreadyScored()).toBe(false);
    });

    it('should be true when the selected judge already scored the selected competitor', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [score({ judge: 2 })] });
      component.selectedCompetitor = jelen;
      component.selectedJudge = 2;

      expect(component.isAlreadyScored()).toBe(true);
    });

    it('should be false when the selected judge has not scored this competitor yet', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 3;

      expect(component.isAlreadyScored()).toBe(false);
    });
  });

  describe('hasMoreJudgesAfterSave', () => {
    it('should be false when no competitor/judge is selected', () => {
      expect(component.hasMoreJudgesAfterSave()).toBe(false);
    });

    it('should be true when other judges remain unscored', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      expect(component.hasMoreJudgesAfterSave()).toBe(true);
    });

    it('should be false when the currently selected judge is the last unscored one', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [score({ judge: 1 }), score({ id: 2, judge: 2 })] });
      component.selectedCompetitor = jelen;
      component.selectedJudge = 3;

      expect(component.hasMoreJudgesAfterSave()).toBe(false);
    });
  });

  describe('getTotal', () => {
    it('should sum the entered values, treating unfilled fields as zero', () => {
      component.values = { boja: 5, izgled: null, gustoca: 5, okus: null, dojam: 4 };
      expect(component.getTotal()).toBe(14);
    });

    it('should be 0 when nothing is filled in', () => {
      expect(component.getTotal()).toBe(0);
    });
  });

  describe('fieldError', () => {
    const bojaField = () => component.criteria[0]; // boja, 1-5
    const okusField = () => component.criteria[3]; // okus, 1-10

    it('should be null when the field is empty', () => {
      component.values['boja'] = null;
      expect(component.fieldError(bojaField())).toBeNull();
    });

    it('should flag non-integer values', () => {
      component.values['boja'] = 4.5;
      expect(component.fieldError(bojaField())).toBe('Ocjena mora biti cijeli broj');
    });

    it('should flag values below the minimum', () => {
      component.values['boja'] = 0;
      expect(component.fieldError(bojaField())).toBe('Ocjena mora biti između 1 i 5');
    });

    it('should flag values above the maximum', () => {
      component.values['okus'] = 11;
      expect(component.fieldError(okusField())).toBe('Ocjena mora biti između 1 i 10');
    });

    it('should be null for a valid value', () => {
      component.values['okus'] = 10;
      expect(component.fieldError(okusField())).toBeNull();
    });
  });

  describe('canSave', () => {
    it('should be false without a selected competitor and judge', () => {
      fillValidCriteria();
      expect(component.canSave()).toBe(false);
    });

    it('should be false when any criterion is unfilled', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      component.values = { boja: 5, izgled: 4, gustoca: 5, okus: 9, dojam: null };

      expect(component.canSave()).toBe(false);
    });

    it('should be false when any criterion is out of range', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      fillValidCriteria();
      component.values['okus'] = 11;

      expect(component.canSave()).toBe(false);
    });

    it('should be true when a competitor and judge are selected and all criteria are valid', () => {
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      fillValidCriteria();

      expect(component.canSave()).toBe(true);
    });
  });

  describe('save', () => {
    it('should do nothing when the form cannot be saved', async () => {
      seedLiveScores([]);
      await component.save();
      expect(gulasService.setScore).not.toHaveBeenCalled();
    });

    it('should do nothing when a save is already in progress', async () => {
      seedLiveScores([]);
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      fillValidCriteria();
      component.saving = true;

      await component.save();

      expect(gulasService.setScore).not.toHaveBeenCalled();
    });

    it('should record the score for the selected competitor and judge', async () => {
      seedLiveScores([]);
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      fillValidCriteria();

      await component.save();

      expect(gulasService.setScore).toHaveBeenCalledWith(1, 1, criteria());
    });

    it('should auto-advance to the next unscored judge and clear the fields when judges remain', async () => {
      seedLiveScores([]);
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      fillValidCriteria();

      await component.save();

      expect(component.selectedJudge as number).toBe(2);
      expect(component.values).toEqual({ boja: null, izgled: null, gustoca: null, okus: null, dojam: null });
      expect(component.justCompletedCodeName).toBeNull();
    });

    it('should skip straight to judge 3 when judge 2 is the one just saved and 1 is already done', async () => {
      seedLiveScores([score({ judge: 1 })]);
      component.selectedCompetitor = jelen;
      component.selectedJudge = 2;
      fillValidCriteria();

      await component.save();

      expect(component.selectedJudge as number).toBe(3);
    });

    it('should show the "completed" panel and reset the selection when the last judge is saved', async () => {
      seedLiveScores([score({ judge: 1 }), score({ id: 2, judge: 2 })]);
      component.selectedCompetitor = jelen;
      component.selectedJudge = 3;
      fillValidCriteria();

      await component.save();

      expect(component.justCompletedCodeName).toBe('JELEN');
      expect(component.selectedCompetitor).toBeNull();
      expect(component.selectedJudge).toBeNull();
      expect(component.values).toEqual({ boja: null, izgled: null, gustoca: null, okus: null, dojam: null });
    });
  });

  describe('startNextCompetitor', () => {
    it('should clear the completed panel and reset the form for a new competitor', () => {
      component.justCompletedCodeName = 'JELEN';
      component.selectedCompetitor = jelen;
      component.selectedJudge = 1;
      component.values = criteria() as any;

      component.startNextCompetitor();

      expect(component.justCompletedCodeName).toBeNull();
      expect(component.selectedCompetitor).toBeNull();
      expect(component.selectedJudge).toBeNull();
      expect(component.values).toEqual({ boja: null, izgled: null, gustoca: null, okus: null, dojam: null });
    });
  });

  describe('close', () => {
    it('should close the dialog', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
