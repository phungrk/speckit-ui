import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Icon, Label } from '../ui';
import { Markdown } from './Markdown';
import { buildLocalProject, firstLocalDocumentPath, readLocalDirectory, type LocalFileSnapshot } from './localProject';
import { LIVE_CLASS, PHASES, phaseStatus } from './phases';
import type { PhaseKey } from '../types';
import type { Project, SpecFeature } from './types';

type LocalView =
  | { state: 'empty' }
  | { state: 'reading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; name: string; files: Map<string, string>; project: Project; file: string };

interface Props {
  onExit: () => void;
}

const canChooseDirectory = () => typeof document !== 'undefined' &&
  'webkitdirectory' in document.createElement('input');

export function LocalWorkspace({ onExit }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const supported = canChooseDirectory();
  const [view, setView] = useState<LocalView>({ state: 'empty' });
  const [selectedStep, setSelectedStep] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedFeatureSlug, setSelectedFeatureSlug] = useState<string | null>(null);

  useEffect(() => { input.current?.setAttribute('webkitdirectory', ''); }, []);

  const openPicker = () => {
    if (!supported) {
      setView({ state: 'error', message: 'This browser cannot select a repository directory. Use a current desktop browser, or choose GitHub mode or the demo.' });
      return;
    }
    if (!input.current) {
      setView({ state: 'error', message: 'The directory picker is unavailable. Reload the page and try again.' });
      return;
    }
    input.current.value = '';
    input.current.click();
  };

  const selected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selection = event.currentTarget.files;
    if (!selection?.length) return;
    const inputElement = event.currentTarget;
    const id = ++request.current;
    setView({ state: 'reading' });
    try {
      const snapshot: LocalFileSnapshot = await readLocalDirectory(selection);
      const project = buildLocalProject(snapshot.name, snapshot.files, snapshot.warnings);
      if (!project.specs.length) {
        const unreadable = snapshot.warnings.length ? ` ${snapshot.warnings.slice(0, 3).join(' ')}` : '';
        throw new Error(`No supported Spec Kit specs were found. Choose a repository with files under specs/NNN-name/.${unreadable}`);
      }
      if (id !== request.current) return;
      const first = project.specs[0];
      const file = firstLocalDocumentPath(project) ?? filePath(first, initialFile(first));
      setSelectedStep(1);
      setSelectedDocument(null);
      setSelectedFeatureSlug(first.slug);
      setView({ state: 'ready', name: snapshot.name, files: snapshot.files, project, file });
    } catch (error) {
      if (id !== request.current) return;
      setView({ state: 'error', message: error instanceof Error ? error.message : 'The selected repository could not be read.' });
    } finally {
      inputElement.value = '';
    }
  };

  const leave = () => {
    request.current++;
    setView({ state: 'empty' });
    onExit();
  };
  const reselect = () => {
    request.current++;
    openPicker();
  };

  const ready = view.state === 'ready' ? view : null;
  const selectedSpec = ready?.project.specs.find(feature => feature.slug === selectedFeatureSlug) ?? null;

  const selectFile = (file: string) => {
    if (view.state !== 'ready') return;
    const feature = view.project.specs.find(item => file.startsWith(`specs/${item.slug}/`));
    if (feature) setSelectedFeatureSlug(feature.slug);
    if (file === '.specify/memory/constitution.md') {
      setSelectedStep(0);
      setSelectedDocument(null);
    } else if (stageIndexForFile(file) >= 0) {
      const stage = stageIndexForFile(file);
      setSelectedStep(stage);
      setSelectedDocument(null);
    } else {
      setSelectedDocument(file);
    }
    setView({ ...view, file });
  };
  const filePath = (feature: SpecFeature, file: string) => `specs/${feature.slug}/${file}`;
  const selectSpec = (feature: SpecFeature) => {
    setSelectedFeatureSlug(feature.slug);
    setSelectedStep(1);
    setSelectedDocument(null);
    selectFile(filePath(feature, initialFile(feature)));
  };
  const activeFeature = ready && (selectedSpec ?? ready.project.specs[0]);
  const activePhase = PHASES[selectedStep] ?? PHASES[1];
  const headingPath = ready && activeFeature
    ? selectedDocument ?? stageFile(activePhase.k, activeFeature.slug)
    : '';
  const headingTitle = selectedDocument ? selectedDocument.split('/').at(-1) : activePhase.n;

  return <div className="sk sk-live">
    <nav className="nav sk-nav">
      <div className="nav-brand">Speckit</div>
      <div className="sk-proj">{ready ? `Local · ${ready.name}` : 'Local repository'}</div>
      <div className="sk-spacer"></div>
      <span className="sk-who">READ ONLY</span>
      {ready && <button className="btn btn-secondary sk-small" onClick={reselect}>Choose another</button>}
      <button className="btn btn-ghost sk-small" onClick={leave}>Exit local mode</button>
      <input ref={input} type="file" multiple hidden onChange={event => void selected(event)} aria-label="Choose a local repository directory" />
    </nav>

    {view.state === 'empty' || view.state === 'error' || view.state === 'reading'
      ? <main className="sk-repos">
        <div className="sk-repos-head">
          <h2>Open a local repository</h2>
          <p className="sk-connect-lead">Choose a project folder. Its supported Spec Kit files are read in this tab only; they are not uploaded or changed.</p>
        </div>
        {view.state === 'error' && <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{view.message}</span></div>}
        {view.state === 'reading' && <p className="sk-ns-cursor" role="status">Reading selected Spec Kit files…</p>}
        {!supported && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>Directory selection is not supported in this browser. Demo and GitHub modes remain available.</span></div>}
        <div className="sk-actions">
          <button className="btn btn-primary" onClick={openPicker} disabled={!supported || view.state === 'reading'}>
            Choose repository folder<Icon n="arrow" s={14} />
          </button>
        </div>
        <p className="text-muted sk-sm">Local mode is read-only. Gate approvals, PR tracking, and Copilot are available in GitHub mode.</p>
      </main>
      : ready && activeFeature && <>
        <div className="sk-body">
          <aside className="sk-side">
            <div className="sk-pad">
              <Label>Local repository</Label>
              <p className="text-muted sk-sm">Files stay in this browser tab. Select another folder to refresh.</p>
            </div>
            {ready.project.constitution && <div className="sk-pad sk-rule">
              <Label>Project files</Label>
              <ul className="sk-list"><li><button className="sk-qitem" aria-current={ready.file === '.specify/memory/constitution.md' ? 'page' : undefined} onClick={() => selectFile('.specify/memory/constitution.md')}><b>Constitution</b><span>.specify/memory/constitution.md</span></button></li></ul>
            </div>}
            <div className="sk-pad sk-rule">
              <div className="sk-rowh"><Label>Specs · {ready.project.specs.length}</Label></div>
              <ul className="sk-list">{ready.project.specs.map(feature => <li key={feature.slug}>
                <button className={`sk-feat${selectedSpec === feature ? ' on' : ''}`} aria-current={selectedSpec === feature ? 'page' : undefined}
                  onClick={() => selectSpec(feature)}>
                  <span className="sk-id">{feature.id}</span><b>{feature.title}</b>
                  <span className="sk-featst">{feature.slug}</span>
                </button>
                {selectedSpec === feature && <ul className="sk-files">{feature.files.map(file => <li key={file}>
                  <button className="sk-qitem" aria-current={ready.file === filePath(feature, file) ? 'page' : undefined}
                    onClick={() => selectFile(filePath(feature, file))}><b>{file}</b></button>
                </li>)}</ul>}
              </li>)}</ul>
            </div>
          </aside>
          <main className="sk-main">
            <div className="sk-fhead">
              <div className="sk-file"><Icon n="file" s={14} />{headingPath}</div>
              <h2>{headingTitle}</h2>
            </div>
            <LocalFlow project={ready.project} feature={activeFeature}
              selected={selectedStep} onSelect={step => { setSelectedStep(step); setSelectedDocument(null); }} />
            {selectedDocument
              ? <div className="sk-doc" role="tabpanel" aria-label={selectedDocument}><Markdown>{ready.files.get(selectedDocument) ?? ''}</Markdown></div>
              : <LocalStageContent feature={activeFeature} files={ready.files} selected={selectedStep} />}
          </main>
          <aside className="sk-right">
            <div className="sk-pad"><Label>Local mode</Label>
              <div className="sk-warn" role="status"><Icon n="lock" s={14} /><span>Read-only</span></div>
              <p className="text-muted sk-sm">Approval gates, pull requests, and Copilot require GitHub mode.</p>
            </div>
            {ready.project.warnings.map(warning => <div className="sk-pad sk-rule" key={warning}><div className="sk-warn"><Icon n="alert" s={14} /><span>{warning}</span></div></div>)}
          </aside>
        </div>
      </>}
  </div>;
}

const stageFile = (key: PhaseKey, slug: string) => {
  if (key === 'constitution') return '.specify/memory/constitution.md';
  const filename: Partial<Record<PhaseKey, string>> = {
    specify: 'spec.md',
    clarify: 'spec.md',
    plan: 'plan.md',
    tasks: 'tasks.md',
    analyze: 'analysis.md',
    implement: 'tasks.md'
  };
  return `specs/${slug}/${filename[key] ?? ''}`;
};

function stageIndexForFile(file: string) {
  if (file === '.specify/memory/constitution.md') return 0;
  const match = file.match(/^specs\/[^/]+\/(spec|plan|tasks|analysis)\.md$/);
  if (!match) return -1;
  return match[1] === 'spec' ? 1 : match[1] === 'plan' ? 3 : match[1] === 'tasks' ? 4 : 5;
}

export function LocalFlow({ project, feature, selected, onSelect }: {
  project: Project;
  feature: SpecFeature;
  selected: number;
  onSelect: (step: number) => void;
}) {
  const statuses = phaseStatus(project, feature);
  return <div className="sk-rail" role="tablist" aria-label="Spec Kit steps">
    {PHASES.map((phase, index) => {
      const status = statuses[index];
      const label = status === 'done'
        ? phase.k === 'implement' ? 'Tasks complete' : 'Available locally'
        : status === 'current' ? 'Next' : status === 'skipped' ? 'Not run' : 'Not started';
      return <button key={phase.k} id={`local-flow-tab-${index}`} type="button" role="tab" aria-selected={index === selected}
        aria-controls="local-flow-panel" tabIndex={index === selected ? 0 : -1}
        className={`sk-cell ${LIVE_CLASS[status]}`} onClick={() => onSelect(index)}
        onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % PHASES.length
            : event.key === 'ArrowLeft' ? (index + PHASES.length - 1) % PHASES.length
              : event.key === 'Home' ? 0
                : event.key === 'End' ? PHASES.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault();
          onSelect(next);
          event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
        }}>
        <span className="sk-num">{String(index + 1).padStart(2, '0')}</span>
        <b>{phase.n}</b>
        <span className="sk-st">{label}</span>
      </button>;
    })}
  </div>;
}

export function LocalStageContent({ feature, files, selected }: {
  feature: SpecFeature;
  files: ReadonlyMap<string, string>;
  selected: number;
}) {
  const phase = PHASES[selected] ?? PHASES[1];
  const sourcePath = stageFile(phase.k, feature.slug);
  const source = files.get(sourcePath);
  const clarifications = phase.k === 'clarify' ? feature.spec?.clarifications ?? [] : [];
  const absentMessage = phase.k === 'clarify'
    ? 'No clarification answers are recorded in this local spec.'
    : `No local ${phase.n.toLowerCase()} content is available for this spec.`;

  return <div className="sk-doc" id="local-flow-panel" role="tabpanel" aria-labelledby={`local-flow-tab-${selected}`}>
    {phase.k === 'clarify'
      ? clarifications.length
        ? <div className="sk-qs">{clarifications.map((item, index) => <div className="sk-q" key={`${item.session}-${index}`}>
          <div className="sk-q-h"><span className="sk-id">Q{index + 1}</span><h5>{item.q}</h5></div>
          <div className="sk-opts sk-opts-1"><div className="sk-opt">{item.a}</div></div>
          {item.session && <div className="sk-meta">Session {item.session}</div>}
        </div>)}</div>
        : <LocalStageEmpty title="Clarifications not recorded" message={absentMessage} />
      : source
        ? <Markdown>{source}</Markdown>
        : <LocalStageEmpty title={`${phase.n} unavailable`} message={absentMessage} />}
  </div>;
}

function LocalStageEmpty({ title, message }: { title: string; message: string }) {
  return <div className="sk-empty"><Icon n="file" s={28} /><h4>{title}</h4><p>{message}</p></div>;
}

function initialFile(feature: SpecFeature) {
  return feature.files.includes('spec.md') ? 'spec.md' : feature.files[0];
}
