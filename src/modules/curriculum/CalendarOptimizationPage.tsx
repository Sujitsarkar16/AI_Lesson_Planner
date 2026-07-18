import React, { useMemo, useState } from 'react';
import { CalendarPlanApiError } from '@/shared/api/apiClient';
import {
  CurriculumService,
  type AcademicPlanInput,
  type CalendarBlock,
  type CalendarBlockKind,
  type CalendarPlan,
  type CalendarPlanVersionSummary,
  type Diagnostic,
  type PeriodAllocation,
  type PlanVersion,
  type Recommendation,
  type Weekday
} from '@/modules/curriculum/curriculumService';

// One self-contained feature page (no generic calendar framework). Local subcomponents
// only. All persistence goes through CurriculumService; invalid input (400) surfaces
// field diagnostics, stale edits (409) offer a reload, unknown plans (404) report clearly.

const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BLOCK_KINDS: CalendarBlockKind[] = ['Holiday', 'Examination', 'SchoolEvent', 'TeacherLeave'];
const RISK_CLASS: Record<PlanVersion['syllabus_completion_risk'], string> = {
  Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

const emptyBlock = (): CalendarBlock => ({ block_id: '', kind: 'Holiday', start_date: '', end_date: '', blocks_subject: true });

const parseJsonArray = <T,>(text: string): T[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array.');
  return parsed as T[];
};

const inputClass = 'w-full form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';
const cardClass = 'bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6';
const primaryBtn = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const secondaryBtn = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50';

const CalendarOptimizationPage: React.FC = () => {
  // Scalar plan metadata
  const [board, setBoard] = useState('CBSE');
  const [grade, setGrade] = useState('10');
  const [subject, setSubject] = useState('Mathematics');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [weeklyPeriods, setWeeklyPeriods] = useState<Partial<Record<Weekday, number>>>({});

  // Array-heavy collections captured as JSON (diagnostics are keyed by field path so the
  // returned diagnostic list pinpoints any invalid entry).
  const [chaptersText, setChaptersText] = useState('[]');
  const [revisionsText, setRevisionsText] = useState('[]');
  const [locksText, setLocksText] = useState('[]');

  // Calendar blocks managed structurally so disruptions can be added/edited/removed.
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [draftBlock, setDraftBlock] = useState<CalendarBlock>(emptyBlock());

  // Persisted plan state
  const [planId, setPlanId] = useState('');
  const [loadPlanId, setLoadPlanId] = useState('');
  const [plan, setPlan] = useState<CalendarPlan | null>(null);
  const [history, setHistory] = useState<CalendarPlanVersionSummary[]>([]);
  const [viewedVersion, setViewedVersion] = useState<PlanVersion | null>(null);

  // Request/feedback state
  const [pending, setPending] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);

  const activeVersion = viewedVersion ?? plan?.version ?? null;
  const isHistorical = viewedVersion !== null && viewedVersion !== plan?.version;

  const buildInput = (): AcademicPlanInput => ({
    plan_id: planId || 'draft',
    board,
    grade,
    subject,
    academic_year_start: yearStart,
    academic_year_end: yearEnd,
    required_completion_date: completionDate,
    weekly_periods: weeklyPeriods,
    chapters: parseJsonArray(chaptersText),
    holidays: blocks.filter((b) => b.kind === 'Holiday'),
    examinations: blocks.filter((b) => b.kind === 'Examination'),
    school_events: blocks.filter((b) => b.kind === 'SchoolEvent'),
    teacher_leave: blocks.filter((b) => b.kind === 'TeacherLeave'),
    revision_requirements: parseJsonArray(revisionsText),
    locked_allocations: parseJsonArray(locksText)
  });

  const adoptPlan = (next: CalendarPlan, note: string) => {
    setPlan(next);
    setPlanId(next.planId);
    setViewedVersion(null);
    setDiagnostics([]);
    setConflict(false);
    // Reflect the normalized/stored input back into the form so the next edit is based on
    // the authoritative current version.
    const { input } = next;
    setBoard(input.board); setGrade(input.grade); setSubject(input.subject);
    setYearStart(input.academic_year_start); setYearEnd(input.academic_year_end); setCompletionDate(input.required_completion_date);
    setWeeklyPeriods(input.weekly_periods ?? {});
    setChaptersText(JSON.stringify(input.chapters, null, 2));
    setRevisionsText(JSON.stringify(input.revision_requirements, null, 2));
    setLocksText(JSON.stringify(input.locked_allocations, null, 2));
    setBlocks([...input.holidays, ...input.examinations, ...input.school_events, ...input.teacher_leave]);
    setMessage({ tone: 'success', text: note });
  };

  // Wraps every write so JSON parse errors, 400 diagnostics, 409 conflicts, and 404s all
  // produce accessible feedback instead of an unhandled rejection.
  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setMessage(null);
    setDiagnostics([]);
    setConflict(false);
    try {
      await action();
    } catch (error) {
      if (error instanceof CalendarPlanApiError) {
        if (error.status === 409) {
          setConflict(true);
          setMessage({ tone: 'error', text: 'This plan changed since you loaded it. Reload the current version before saving again.' });
        } else if (error.status === 404) {
          setMessage({ tone: 'error', text: 'Plan not found.' });
        } else if (error.status === 400) {
          setDiagnostics(error.diagnostics as Diagnostic[]);
          setMessage({ tone: 'error', text: error.message || 'The plan input is invalid. See the diagnostics below.' });
        } else {
          setMessage({ tone: 'error', text: error.message || 'Request failed.' });
        }
      } else if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Expected a JSON array.')) {
        setMessage({ tone: 'error', text: `Chapters, revisions and locks must be valid JSON arrays: ${error.message}` });
      } else {
        setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unexpected error.' });
      }
    } finally {
      setPending(false);
    }
  };

  const handleCreate = () => run(async () => { adoptPlan(await CurriculumService.createCalendarPlan(buildInput()), 'Plan created and calculated.'); });
  const handleReplace = () => run(async () => {
    if (!plan) return;
    adoptPlan(await CurriculumService.replaceCalendarPlanInput(plan.planId, buildInput(), plan.currentInputRevision), 'Plan input replaced and recalculated.');
  });
  const handleLoad = () => run(async () => {
    const loaded = await CurriculumService.getCalendarPlan(loadPlanId.trim());
    adoptPlan(loaded, `Loaded plan ${loaded.planId}.`);
    setHistory(loaded.history);
  });

  const refreshHistory = async (id: string) => { setHistory(await CurriculumService.getCalendarPlan(id).then((p) => p.history)); };

  const handleUpsertBlock = () => run(async () => {
    if (!draftBlock.block_id.trim()) throw new Error('Block id is required.');
    if (!plan) {
      // No plan yet: keep the block in local input; it is persisted on create.
      setBlocks((current) => [...current.filter((b) => b.block_id !== draftBlock.block_id), { ...draftBlock }]);
      setDraftBlock(emptyBlock());
      setMessage({ tone: 'info', text: 'Block added to the draft. Create the plan to persist it.' });
      return;
    }
    adoptPlan(await CurriculumService.upsertCalendarBlock(plan.planId, { ...draftBlock }, plan.currentInputRevision), 'Disruption saved; plan recalculated.');
    setDraftBlock(emptyBlock());
    await refreshHistory(plan.planId);
  });

  const handleEditBlock = (block: CalendarBlock) => { setDraftBlock({ ...block }); };

  const handleRemoveBlock = (block: CalendarBlock) => run(async () => {
    if (!plan) {
      setBlocks((current) => current.filter((b) => b.block_id !== block.block_id));
      return;
    }
    adoptPlan(await CurriculumService.removeCalendarBlock(plan.planId, block, plan.currentInputRevision), 'Disruption removed; plan recalculated.');
    await refreshHistory(plan.planId);
  });

  const handleViewVersion = (version: number) => run(async () => {
    if (!plan) return;
    if (version === plan.currentVersion) { setViewedVersion(null); return; }
    setViewedVersion(await CurriculumService.getCalendarPlanVersion(plan.planId, version));
  });

  const handleReload = () => run(async () => {
    if (!plan) return;
    const reloaded = await CurriculumService.getCalendarPlan(plan.planId);
    adoptPlan(reloaded, 'Reloaded the current version.');
    setHistory(reloaded.history);
  });

  const allocationsByDate = useMemo(() => {
    const map = new Map<string, PeriodAllocation[]>();
    for (const a of activeVersion?.allocations ?? []) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [activeVersion]);

  return (
    <div className="space-y-6">
      <PageHeader />

      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
          className={`rounded-lg p-4 text-sm font-medium ${message.tone === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' : message.tone === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          {message.text}
          {conflict && (
            <button onClick={handleReload} disabled={pending} className="ml-3 underline font-semibold">
              Reload current version
            </button>
          )}
        </div>
      )}

      {diagnostics.length > 0 && (
        <div role="alert" className={cardClass}>
          <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-3">Field diagnostics</h3>
          <ul className="space-y-1 text-sm">
            {diagnostics.map((d) => (
              <li key={d.diagnostic_id} className="text-slate-700 dark:text-slate-300">
                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{d.path ?? d.target_id ?? d.code}</code>
                <span className="ml-2">{d.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Load an existing owned plan */}
      <div className={cardClass}>
        <label htmlFor="loadPlanId" className={labelClass}>Load an existing plan by id</label>
        <div className="flex gap-2">
          <input id="loadPlanId" className={inputClass} value={loadPlanId} onChange={(e) => setLoadPlanId(e.target.value)} placeholder="Plan id" />
          <button onClick={handleLoad} disabled={pending || !loadPlanId.trim()} className={secondaryBtn}>Load</button>
        </div>
        {planId && <p className="mt-2 text-xs text-slate-500">Current plan id: <code>{planId}</code> · input revision {plan?.currentInputRevision} · version {plan?.currentVersion}</p>}
      </div>

      {/* Plan input */}
      <fieldset className={cardClass} disabled={isHistorical}>
        <legend className="text-lg font-bold text-slate-900 dark:text-white mb-4">Plan input</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={labelClass} htmlFor="board">Board</label><input id="board" className={inputClass} value={board} onChange={(e) => setBoard(e.target.value)} /></div>
          <div><label className={labelClass} htmlFor="grade">Grade</label><input id="grade" className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
          <div><label className={labelClass} htmlFor="subject">Subject</label><input id="subject" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><label className={labelClass} htmlFor="yearStart">Academic year start</label><input id="yearStart" type="date" className={inputClass} value={yearStart} onChange={(e) => setYearStart(e.target.value)} /></div>
          <div><label className={labelClass} htmlFor="yearEnd">Academic year end</label><input id="yearEnd" type="date" className={inputClass} value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} /></div>
          <div><label className={labelClass} htmlFor="completion">Required completion date</label><input id="completion" type="date" className={inputClass} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} /></div>
        </div>

        <fieldset className="mt-5">
          <legend className={labelClass}>Weekly subject periods</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day}>
                <label className="block text-xs text-slate-500 mb-1" htmlFor={`wp-${day}`}>{day.slice(0, 3)}</label>
                <input
                  id={`wp-${day}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={weeklyPeriods[day] ?? 0}
                  onChange={(e) => setWeeklyPeriods((current) => ({ ...current, [day]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass} htmlFor="chapters">Chapters (JSON array: chapter_id, title, difficulty 1-5, required_periods, prerequisite_ids, sequence_order, standard_ids, optional is_introductory/introductory_combinable_periods/homework_eligible_activity_periods)</label>
            <textarea id="chapters" rows={6} className={`${inputClass} font-mono`} value={chaptersText} onChange={(e) => setChaptersText(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="revisions">Revision requirements (JSON array: revision_id, title, required_periods, deadline, chapter_ids)</label>
            <textarea id="revisions" rows={4} className={`${inputClass} font-mono`} value={revisionsText} onChange={(e) => setRevisionsText(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="locks">Locked allocations (JSON array: lock_id, date, period_index, allocation_kind, target_id)</label>
            <textarea id="locks" rows={4} className={`${inputClass} font-mono`} value={locksText} onChange={(e) => setLocksText(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={handleCreate} disabled={pending || !!plan} className={primaryBtn}>
            <span className="material-symbols-outlined text-base">add</span>Create plan
          </button>
          <button onClick={handleReplace} disabled={pending || !plan} className={primaryBtn}>
            <span className="material-symbols-outlined text-base">save</span>Save all input & recalculate
          </button>
        </div>
      </fieldset>

      {/* Disruptions (calendar blocks) */}
      <div className={cardClass}>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Disruptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-1"><label className={labelClass} htmlFor="blockId">Block id</label><input id="blockId" className={inputClass} value={draftBlock.block_id} onChange={(e) => setDraftBlock({ ...draftBlock, block_id: e.target.value })} /></div>
          <div className="md:col-span-1">
            <label className={labelClass} htmlFor="blockKind">Kind</label>
            <select id="blockKind" className={inputClass} value={draftBlock.kind} onChange={(e) => setDraftBlock({ ...draftBlock, kind: e.target.value as CalendarBlockKind })}>
              {BLOCK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div><label className={labelClass} htmlFor="blockStart">Start</label><input id="blockStart" type="date" className={inputClass} value={draftBlock.start_date} onChange={(e) => setDraftBlock({ ...draftBlock, start_date: e.target.value })} /></div>
          <div><label className={labelClass} htmlFor="blockEnd">End</label><input id="blockEnd" type="date" className={inputClass} value={draftBlock.end_date} onChange={(e) => setDraftBlock({ ...draftBlock, end_date: e.target.value })} /></div>
          <div className="flex items-center gap-2 pb-2">
            <input id="blocksSubject" type="checkbox" checked={draftBlock.blocks_subject} onChange={(e) => setDraftBlock({ ...draftBlock, blocks_subject: e.target.checked })} />
            <label htmlFor="blocksSubject" className="text-sm text-slate-700 dark:text-slate-300">Blocks subject</label>
          </div>
          <button onClick={handleUpsertBlock} disabled={pending || isHistorical} className={primaryBtn}>Add / update</button>
        </div>

        {blocks.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
            {blocks.map((b) => (
              <li key={`${b.kind}-${b.block_id}`} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300"><strong>{b.kind}</strong> · {b.block_id} · {b.start_date} → {b.end_date}{b.blocks_subject ? '' : ' (non-blocking)'}</span>
                <span className="flex gap-2">
                  <button onClick={() => handleEditBlock(b)} disabled={pending || isHistorical} className="text-primary hover:underline">Edit</button>
                  <button onClick={() => handleRemoveBlock(b)} disabled={pending || isHistorical} className="text-red-600 hover:underline">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Results */}
      {activeVersion && (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Calculated plan {isHistorical ? `(version ${activeVersion.version}, read-only)` : `(current, version ${activeVersion.version})`}
            </h3>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_CLASS[activeVersion.syllabus_completion_risk]}`}>
              Risk: {activeVersion.syllabus_completion_risk}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Available" value={activeVersion.total_periods_available} />
            <Stat label="Required" value={activeVersion.total_periods_required} />
            <Stat label="Scheduled" value={activeVersion.total_periods_scheduled} />
            <Stat label="Shortfall" value={activeVersion.period_shortfall} />
          </div>
          {activeVersion.completion_date && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Projected completion: <strong>{activeVersion.completion_date}</strong></p>}

          <TimelineSection allocationsByDate={allocationsByDate} />
          <DiagnosticsSection diagnostics={activeVersion.diagnostics} />
          <RecommendationsSection recommendations={activeVersion.recommendations} />
        </div>
      )}

      {/* Version history */}
      {plan && history.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Version history</h3>
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.version} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">v{h.version} · rev {h.input_revision} · {h.syllabus_completion_risk} · shortfall {h.period_shortfall} · {new Date(h.calculated_at).toLocaleString()}</span>
                <button onClick={() => handleViewVersion(h.version)} disabled={pending} className="text-primary hover:underline">
                  {h.version === plan.currentVersion && !isHistorical ? 'Current' : 'View'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const TimelineSection: React.FC<{ allocationsByDate: [string, PeriodAllocation[]][] }> = ({ allocationsByDate }) => {
  if (allocationsByDate.length === 0) return null;
  return (
    <section className="mt-5">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Allocation timeline</h4>
      <div className="max-h-72 overflow-y-auto space-y-2">
        {allocationsByDate.map(([date, allocations]) => (
          <div key={date} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 w-24 shrink-0">{date}</span>
            <span className="flex flex-wrap gap-1">
              {allocations.map((a) => (
                <span
                  key={a.allocation_id}
                  className={`text-xs px-2 py-0.5 rounded ${a.status === 'Locked' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : a.status === 'Blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}
                  title={`${a.allocation_kind} · period ${a.period_index} · ${a.status}`}
                >
                  P{a.period_index}: {a.target_id}{a.status !== 'Scheduled' ? ` (${a.status})` : ''}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const DiagnosticsSection: React.FC<{ diagnostics: Diagnostic[] }> = ({ diagnostics }) => {
  if (diagnostics.length === 0) return null;
  return (
    <section className="mt-5">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Diagnostics</h4>
      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
        {diagnostics.map((d) => (
          <li key={d.diagnostic_id}>· {d.message}</li>
        ))}
      </ul>
    </section>
  );
};

const RecommendationsSection: React.FC<{ recommendations: Recommendation[] }> = ({ recommendations }) => {
  if (recommendations.length === 0) return null;
  return (
    <section className="mt-5">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Recovery recommendations</h4>
      <ul className="space-y-2 text-sm">
        {recommendations.map((r) => (
          <li key={r.recommendation_id} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.type} · {r.target_id}</p>
            <p className="text-slate-600 dark:text-slate-400">Affected periods: {r.affected_periods} · projected shortfall if accepted: {r.projected_shortfall_if_accepted}</p>
            {r.earliest_compatible_slots && r.earliest_compatible_slots.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">Earliest compatible: {r.earliest_compatible_slots.map((s) => `${s.date} P${s.period_index}`).join(', ')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

const PageHeader: React.FC = () => (
  <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl shadow-lg p-6">
    <div className="flex items-center gap-3 mb-2">
      <span className="material-symbols-outlined text-4xl">event_available</span>
      <h2 className="text-2xl font-bold">Academic Calendar Optimization</h2>
    </div>
    <p className="text-white/80">Plan the year deterministically: capacity, prerequisite-safe allocations, risk, and recovery advice.</p>
  </div>
);

export default CalendarOptimizationPage;
