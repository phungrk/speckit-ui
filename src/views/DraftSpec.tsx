import type { Draft } from '../types';
import { Icon, Label } from '../ui';
import { Stories } from './SpecView';

export function DraftSpec({ draft }: { draft: Draft }) {
  const open = draft.frs.filter(r => r[2]).length;
  return <div>
    <div className="sk-ns-callout"><Icon n="alert" s={14} /><span>{open} requirements need clarification. Run <b>/speckit.clarify</b> after this gate.</span></div>
    <section className="sk-sec"><Label>User scenarios</Label><Stories stories={draft.stories} /></section>
    <section className="sk-sec"><Label>Functional requirements</Label>
      <table className="table"><tbody>{draft.frs.map(([id, t, nc]) => <tr key={id}><td className="sk-id" style={{ width: 80 }}>{id}</td><td>{t}{nc && <> <mark className="sk-nc">{nc}</mark></>}</td></tr>)}</tbody></table>
    </section>
    <section className="sk-sec"><Label>Success criteria</Label>
      <table className="table"><tbody>{draft.sc.map(([id, t]) => <tr key={id}><td className="sk-id" style={{ width: 80 }}>{id}</td><td>{t}</td></tr>)}</tbody></table>
    </section>
    <section className="sk-sec"><Label>Spec quality checklist · checklists/requirements.md</Label>
      <ul className="sk-cl">{draft.checklist.map(([t, ok]) => <li key={t} className={ok ? 'ok' : ''}><span className="sk-clbox">{ok ? <Icon n="check" s={12} /> : null}</span>{t}</li>)}</ul>
    </section>
  </div>;
}
