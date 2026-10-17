import { sections } from '../../server/parse';
import type { Phase } from '../types';
import { DocHead, Icon, Label } from '../ui';
import { Stories } from '../views/SpecView';
import { Markdown } from './Markdown';
import { allTasks, blobUrl, taskArea, type LiveStatus } from './phases';
import type { Constitution, LiveTask, Project, SpecFeature, TaskPhase } from './types';

const stripComments = (md: string) => md.replace(/<!--[\s\S]*?-->/g, '');

/** H2 sections of `md` other than the ones a view already renders, as markdown. */
function OtherSections({ md, skip }: { md: string; skip: RegExp }) {
  const rest = sections(stripComments(md), 2).filter(s => !skip.test(s.title) && s.body.trim());
  return <>{rest.map(s => <section key={s.title} className="sk-sec"><Label>{s.title.replace(/\*\(.*?\)\*/g, '').trim()}</Label><Markdown>{s.body}</Markdown></section>)}</>;
}

/** H3 sections inside the H2 sections a view renders structurally (e.g. Edge Cases, Key Entities). */
function SubSections({ md, within, skip }: { md: string; within: RegExp; skip: RegExp }) {
  const subs = sections(stripComments(md), 2).filter(s => within.test(s.title)).flatMap(s => sections(s.body, 3)).filter(s => !skip.test(s.title) && s.body.trim());
  return <>{subs.map(s => <section key={s.title} className="sk-sec"><Label>{s.title}</Label><Markdown>{s.body}</Markdown></section>)}</>;
}

export function NotStarted({ phase, status, prefix, spec }: { phase: Phase; status: LiveStatus; prefix: string; spec: SpecFeature }) {
  const cmd = prefix + phase.k;
  return <div className="sk-empty">
    <Icon n={status === 'pending' ? 'lock' : 'file'} s={28} />
    <h4>{status === 'skipped' ? `${phase.n} was not run for this spec` : `${phase.n} has not started`}</h4>
    <p>{status === 'current'
      ? <>This is the next step. Run <b>{cmd}</b> in Claude Code to generate {phase.k === 'analyze' ? 'the report' : phase.file}.</>
      : status === 'skipped' ? <>No {phase.k === 'clarify' ? 'clarification session is' : 'saved report is'} recorded in <b>specs/{spec.slug}/</b>.</>
      : <>It opens after the earlier steps. <b>{cmd}</b> generates {phase.file}.</>}</p>
    {phase.k === 'analyze' && <p className="text-muted" style={{ fontSize: 13 }}>{prefix}analyze prints its report in the terminal. Save it to <b>specs/{spec.slug}/analysis.md</b> to see it here.</p>}
  </div>;
}

export function LiveConstitution({ c, project }: { c: Constitution | null; project: Project }) {
  if (!c) return <div className="sk-empty"><Icon n="file" s={28} /><h4>No constitution yet</h4><p>Run <b>{project.commandPrefix}constitution</b> to write .specify/memory/constitution.md.</p></div>;
  const meta = [c.version && `v${c.version}`, c.ratified && `ratified ${c.ratified}`, c.amended && `amended ${c.amended}`, 'applies to every feature'].filter(Boolean).join(' · ');
  return <div>
    <DocHead file=".specify/memory/constitution.md" title={c.title} meta={meta} />
    {c.principles.length
      ? <>
        <ol className="sk-principles">{c.principles.map(p => <li key={p.num}><span className="sk-roman">{p.num}</span><div><h5>{p.title}</h5><Markdown>{p.body}</Markdown></div></li>)}</ol>
        <div className="sk-sec" style={{ marginTop: 'var(--space-8)' }}><OtherSections md={c.raw} skip={/Principles/i} /></div>
      </>
      : <Markdown>{c.raw}</Markdown>}
  </div>;
}

export function LiveSpec({ f }: { f: SpecFeature }) {
  const s = f.spec!;
  const meta = [s.fields.Created && `Created ${s.fields.Created}`, s.fields.Status && `Status ${s.fields.Status}`, `${s.stories.length} user stories`, `${s.frs.length} requirements`].filter(Boolean).join(' · ');
  return <div>
    <DocHead file={`specs/${f.slug}/spec.md`} title="Feature specification" meta={meta} />
    {s.needsClarification > 0 && <div className="sk-ns-callout"><Icon n="alert" s={14} /><span>{s.needsClarification} [NEEDS CLARIFICATION] markers in spec.md.</span></div>}
    {s.fields.Input && <section className="sk-sec"><Label>Input</Label><p>{s.fields.Input.replace(/^User description:\s*/i, '')}</p></section>}
    {s.stories.length > 0 && <section className="sk-sec"><Label>User scenarios</Label><Stories stories={s.stories} /></section>}
    {s.frs.length > 0 && <section className="sk-sec"><Label>Functional requirements</Label>
      <table className="table"><tbody>{s.frs.map(r => <tr key={r.id}><td className="sk-id" style={{ width: 80 }}>{r.id}</td><td>{r.text}{r.clarification && <> <mark className="sk-nc">[NEEDS CLARIFICATION: {r.clarification}]</mark></>}</td></tr>)}</tbody></table>
    </section>}
    {s.sc.length > 0 && <section className="sk-sec"><Label>Success criteria</Label>
      <table className="table"><tbody>{s.sc.map(r => <tr key={r.id}><td className="sk-id" style={{ width: 80 }}>{r.id}</td><td>{r.text}</td></tr>)}</tbody></table>
    </section>}
    <SubSections md={s.raw} within={/^(User Scenarios|Requirements|Success Criteria)/i} skip={/^(User Story|Functional Requirements|Measurable Outcomes)/i} />
    <OtherSections md={s.raw} skip={/^(User Scenarios|Requirements|Success Criteria|Clarifications)/i} />
  </div>;
}

export function LiveClarify({ f }: { f: SpecFeature }) {
  const items = f.spec!.clarifications;
  const sessions = [...new Set(items.map(c => c.session))];
  return <div>
    <DocHead file={`specs/${f.slug}/spec.md § Clarifications`} title="Clarifications" meta={`${sessions.length} session${sessions.length === 1 ? '' : 's'} · ${items.length} answers`} />
    <div className="sk-qs">{items.map((c, i) => <div key={i} className="sk-q">
      <div className="sk-q-h"><span className="sk-id">Q{i + 1}</span><h5>{c.q}</h5></div>
      <div className="sk-opts sk-opts-1"><div className="sk-opt on"><Icon n="check" s={14} />{c.a}</div></div>
      {c.session && <div className="sk-meta">Session {c.session}</div>}
    </div>)}</div>
  </div>;
}

export function LivePlan({ f, project }: { f: SpecFeature; project: Project }) {
  const p = f.plan!;
  const artifacts = f.files.filter(x => !/^(spec|plan|tasks|analysis)\.md$/.test(x) && !x.startsWith('checklists/'));
  return <div>
    <DocHead file={`specs/${f.slug}/plan.md`} title="Implementation plan" meta={`Generated by ${project.commandPrefix}plan`} />
    {p.summary && <section className="sk-sec"><Label>Summary</Label><Markdown>{p.summary}</Markdown></section>}
    {p.context.length > 0 && <section className="sk-sec"><Label>Technical context</Label>
      <div className="sk-grid2">{p.context.map(([k, v]) => <div key={k} className="sk-kv"><span>{k}</span><b>{v.replace(/`/g, '')}</b></div>)}</div>
    </section>}
    {p.checks.length > 0 && <section className="sk-sec"><Label>Constitution check · {p.checks.filter(c => c[1]).length} / {p.checks.length}</Label>
      <table className="table"><tbody>{p.checks.map(([k, ok]) => <tr key={k}><td>{k}</td><td style={{ width: 110 }}>{ok ? <span className="sk-pass"><Icon n="check" s={14} />Pass</span> : <span className="sk-fail"><Icon n="alert" s={14} />Not ticked</span>}</td></tr>)}</tbody></table>
    </section>}
    {artifacts.length > 0 && <section className="sk-sec"><Label>Artifacts</Label>
      <div className="sk-cells">{artifacts.map(a => <a key={a} className="sk-cellbox sk-cellbox-link" href={blobUrl(project, `specs/${f.slug}/${a}`)} target="_blank" rel="noreferrer"><Icon n="file" s={16} /><b>{a}</b><span>Open on GitHub</span></a>)}</div>
    </section>}
    <OtherSections md={p.raw} skip={/^(Summary|Technical Context|Constitution Check)/i} />
  </div>;
}

const plain = (t: LiveTask) => t.text.replace(/`([^`]+)`/g, '$1');

function TaskGroups({ phases, checks }: { phases: TaskPhase[]; checks?: boolean }) {
  return <>{phases.map(ph => <section key={ph.name} className="sk-sec">
    <Label>Phase · {ph.name}</Label>
    <table className="table sk-tasks"><tbody>{ph.tasks.map(t => <tr key={t.id} className={checks && t.done ? 'is-done' : ''}>
      {checks && <td style={{ width: 36 }}><span className={'sk-check sk-check-ro' + (t.done ? ' on' : '')} role="img" aria-label={t.done ? 'Done' : 'Open'}>{t.done && <Icon n="check" s={12} />}</span></td>}
      <td className="sk-id" style={{ width: 56 }}>{t.id}</td>
      <td style={{ width: 34 }}>{t.parallel ? <span className="tag tag-outline" title="Parallelizable">P</span> : null}</td>
      <td><div>{plain(t)}</div>{t.path && <div className="sk-path">{t.path}</div>}</td>
      <td style={{ width: 120 }} className="sk-owner">{t.story && <span className="sk-id">{t.story} · </span>}{taskArea(t)}</td>
    </tr>)}</tbody></table>
  </section>)}</>;
}

export function LiveTasks({ f }: { f: SpecFeature }) {
  const tasks = allTasks(f);
  return <div>
    <DocHead file={`specs/${f.slug}/tasks.md`} title="Tasks" meta={`${tasks.length} tasks · ${tasks.filter(t => t.parallel).length} parallelizable · ${f.tasks!.length} phases`} />
    <TaskGroups phases={f.tasks!} />
  </div>;
}

export function LiveAnalyze({ f }: { f: SpecFeature }) {
  const a = f.analysis!;
  const blocking = a.findings.filter(x => x.severity === 'CRITICAL' || x.severity === 'HIGH').length;
  const constitution = a.findings.filter(x => /constitution/i.test(x.category)).length;
  return <div>
    <DocHead file={`specs/${f.slug}/analysis.md`} title="Consistency analysis" meta="Saved report of the read-only check across spec.md, plan.md and tasks.md" />
    <div className="sk-stats">
      <div><span>Findings</span><b>{a.findings.length}</b></div>
      <div className={blocking ? 'warn' : ''}><span>Critical + high</span><b>{blocking}</b></div>
      <div className={constitution ? 'warn' : ''}><span>Constitution issues</span><b>{constitution}</b></div>
      <div><span>Medium + low</span><b>{a.findings.length - blocking}</b></div>
    </div>
    {a.findings.length > 0 && <section className="sk-sec"><Label>Findings</Label>
      {a.findings.map(x => <article key={x.id} className="sk-finding">
        <div className="sk-finding-h">
          <span className={'tag ' + (x.severity === 'CRITICAL' || x.severity === 'HIGH' ? 'tag-accent' : x.severity === 'MEDIUM' ? 'tag-outline' : 'tag-neutral')}>{x.severity}</span>
          <span className="sk-id">{x.id}</span><b>{x.category}</b><span className="sk-path">{x.location}</span>
        </div>
        <p>{x.summary}</p>
        {x.recommendation && <p className="sk-meta">Recommendation: {x.recommendation}</p>}
      </article>)}
    </section>}
    <Label>Full report</Label>
    <Markdown>{stripComments(a.raw)}</Markdown>
  </div>;
}

export function LiveImplement({ f }: { f: SpecFeature }) {
  const tasks = allTasks(f);
  const n = tasks.filter(t => t.done).length;
  const areas = [...new Set(tasks.map(taskArea))];
  return <div>
    <DocHead file={`specs/${f.slug}/tasks.md`} title="Implementation" meta={`${n} of ${tasks.length} tasks checked off in tasks.md`} />
    <div className="sk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={n}><div style={{ width: (tasks.length ? n / tasks.length * 100 : 0) + '%' }}></div></div>
    {areas.length > 1 && <div className="sk-cells" style={{ marginBottom: 'var(--space-8)' }}>{areas.map(a => {
      const ts = tasks.filter(t => taskArea(t) === a);
      return <div key={a} className="sk-cellbox"><b>{a}</b><span>{ts.filter(t => t.done).length} of {ts.length} done</span></div>;
    })}</div>}
    <TaskGroups phases={f.tasks!} checks />
  </div>;
}
