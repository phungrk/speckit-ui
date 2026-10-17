import { SK } from '../data';
import type { Requirement, Story } from '../types';
import { DocHead, Label } from '../ui';

export function Stories({ stories }: { stories: Story[] }) {
  return <>{stories.map(u => <article key={u.id} className="sk-story">
    <div className="sk-story-h">{u.p && <span className="tag tag-accent">{u.p}</span>}<span className="sk-id">{u.id}</span><h5>{u.title}</h5></div>
    <p>{u.text}</p>
    <ol className="sk-ac">{u.ac.map((a, i) => <li key={i}><b>Given</b> {a[0]}, <b>when</b> {a[1]}, <b>then</b> {a[2]}.</li>)}</ol>
  </article>)}</>;
}

export function SpecView({ extraFR }: { extraFR: Requirement | null }) {
  const s = SK.spec;
  const frs = extraFR ? [...s.frs, extraFR] : s.frs;
  return <div>
    <DocHead file="specs/003-transfer-limits/spec.md" title="Feature specification" meta={`Created ${s.created} · ${s.stories.length} user stories · ${frs.length} requirements`} />
    <section className="sk-sec"><Label>User scenarios</Label><Stories stories={s.stories} /></section>
    <section className="sk-sec"><Label>Functional requirements</Label>
      <table className="table"><tbody>{frs.map(([id, t]) => <tr key={id} className={extraFR && id === extraFR[0] ? 'sk-new' : ''}><td className="sk-id" style={{ width: 80 }}>{id}</td><td>{t}</td></tr>)}</tbody></table>
    </section>
    <section className="sk-sec"><Label>Success criteria</Label>
      <table className="table"><tbody>{s.sc.map(([id, t]) => <tr key={id}><td className="sk-id" style={{ width: 80 }}>{id}</td><td>{t}</td></tr>)}</tbody></table>
    </section>
  </div>;
}
