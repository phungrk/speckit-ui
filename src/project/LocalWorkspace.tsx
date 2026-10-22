import { useEffect, useRef, useState, type ChangeEvent, type HTMLAttributes, type ReactNode } from 'react';
import { Icon, Label } from '../ui';
import { Markdown } from './Markdown';
import { ReaderMenu, SidebarToggle } from '../reader/ReaderControls';
import { LOCAL_OWNER, useReader, useSidebarKeys } from '../reader/useReader';
import { Annotator } from '../annotations/Annotator';
import type { HighlightActions } from '../annotations/highlightActions';
import { HighlightsPanel } from '../annotations/HighlightsPanel';
import { localFileStore } from '../annotations/store';
import type { FreshProps } from '../annotations/FreshBar';
import { useFreshness } from '../annotations/useFreshness';
import { PHASE_DOC } from '../annotations/colors';
import { contentHash } from '../annotations/anchor';
import { prefsFor } from './prefs';
import type { Highlight, HighlightAuthor } from './types';
import { buildLocalProject, firstLocalDocumentPath, readLocalDirectory, readLocalDirectoryHandle, type LocalFileSnapshot } from './localProject';
import { LIVE_CLASS, PHASES, phaseStatus } from './phases';
import {
  chooseLocalDirectory,
  clearLocalRepository,
  loadLocalRepository,
  saveLocalRepository,
  saveLocalView,
  supportsDirectoryPicker,
  supportsPersistentDirectoryAccess,
  type LocalDirectoryHandle,
  type LocalPermissionState,
  type LocalRepositoryView,
  type SavedLocalRepository
} from './localRepositoryPersistence';
import type { PhaseKey } from '../types';
import type { Project, SpecFeature } from './types';

type LocalView =
  | { state: 'restoring' }
  | { state: 'empty'; notice?: string }
  | { state: 'reading' }
  | { state: 'resume'; saved: SavedLocalRepository; permission: LocalPermissionState }
  | { state: 'error'; message: string; canForget?: boolean }
  | {
    state: 'ready';
    name: string;
    files: Map<string, string>;
    project: Project;
    file: string;
    handle?: LocalDirectoryHandle;
    persisted: boolean;
    persistenceWarning?: string;
  };

interface Props {
  onExit: () => void;
}

const canChooseFileInputDirectory = () => typeof document !== 'undefined' &&
  'webkitdirectory' in document.createElement('input');

const canChooseDirectory = () => supportsDirectoryPicker() || canChooseFileInputDirectory();

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const initialView = (): LocalRepositoryView => ({
  selectedFeatureSlug: null,
  selectedFilePath: null,
  selectedStep: 1,
  selectedDocumentPath: null
});

export function LocalWorkspace({ onExit }: Props) {
  const rd = useReader(LOCAL_OWNER, 'local');
  const [aaOpen, setAaOpen] = useState(false);
  // Highlights (specs/010-spec-annotations FR-016, FR-017): written to specs/NNN/highlights.json in the folder, never committed.
  const [rtab, setRtab] = useState<'local' | 'hl'>('local');
  const [savedHls, setSavedHls] = useState<Record<string, Highlight[]>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  // The selected comment, shared by the reading column, its rail and the Highlights tab (specs/012 FR-008, FR-012).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // What can be done with a highlight, handed over by the Annotator for the Highlights tab (specs/013 FR-008).
  const [hlActions, setHlActions] = useState<HighlightActions | null>(null);
  const selectHl = (id: string | null, o?: { jump?: boolean }) => { setSelectedId(id); if (id && o?.jump) setFocusId(id); };
  const [outdated, setOutdated] = useState<string[]>([]);
  const localPrefs = prefsFor(LOCAL_OWNER, 'local');
  const [authorName, setAuthorName] = useState(() => localPrefs.getAuthorName());
  const askAuthor = (): HighlightAuthor | null => {
    const name = window.prompt('Your name for highlights in this folder')?.trim();
    if (!name) return null;
    localPrefs.setAuthorName(name);
    setAuthorName(name);
    return { name, local: true };
  };
  useSidebarKeys(rd.layout, rd.setLayout);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const supported = canChooseDirectory();
  const [view, setView] = useState<LocalView>({ state: 'restoring' });
  const [selectedStep, setSelectedStep] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedFeatureSlug, setSelectedFeatureSlug] = useState<string | null>(null);

  useEffect(() => { input.current?.setAttribute('webkitdirectory', ''); }, []);

  const openHandle = async (
    handle: LocalDirectoryHandle,
    name: string,
    savedView: LocalRepositoryView | null,
    shouldPersist: boolean
  ) => {
    const id = ++request.current;
    setView({ state: 'reading' });
    try {
      const snapshot = await readLocalDirectoryHandle(handle);
      const project = buildLocalProject(name || snapshot.name, snapshot.files, snapshot.warnings);
      if (!project.specs.length) {
        const unreadable = snapshot.warnings.length ? ` ${snapshot.warnings.slice(0, 3).join(' ')}` : '';
        throw new Error(`No supported Spec Kit specs were found. Choose a repository with files under specs/NNN-name/.${unreadable}`);
      }
      if (id !== request.current) return;

      const preferredFeature = project.specs.find(feature => feature.slug === savedView?.selectedFeatureSlug);
      const featureFromPath = savedView?.selectedFilePath?.match(/^specs\/([^/]+)\//)?.[1];
      const feature = preferredFeature ?? project.specs.find(item => item.slug === featureFromPath) ?? project.specs[0];
      const step = savedView && Number.isInteger(savedView.selectedStep) && savedView.selectedStep >= 0 && savedView.selectedStep < PHASES.length
        ? savedView.selectedStep : 1;
      const savedDocument = savedView?.selectedDocumentPath && snapshot.files.has(savedView.selectedDocumentPath)
        ? savedView.selectedDocumentPath : null;
      const preferredFile = savedView?.selectedFilePath && snapshot.files.has(savedView.selectedFilePath)
        ? savedView.selectedFilePath : null;
      const file = preferredFile ?? savedDocument ?? (step === 0
        ? '.specify/memory/constitution.md'
        : stageFile(PHASES[step].k, feature.slug));

      let persisted = !shouldPersist;
      let persistenceWarning: string | undefined;
      if (shouldPersist) {
        try {
          await saveLocalRepository(handle, name || snapshot.name, savedView ?? initialView());
          persisted = true;
        } catch (error) {
          persistenceWarning = `This repository is open for this tab, but the browser could not remember it: ${errorMessage(error, 'browser storage is unavailable')}`;
        }
      }
      if (id !== request.current) return;

      setSelectedStep(step);
      setSelectedDocument(savedDocument);
      setSelectedFeatureSlug(feature.slug);
      setView({
        state: 'ready', name: name || snapshot.name, files: snapshot.files, project, file,
        handle, persisted, ...(persistenceWarning ? { persistenceWarning } : {})
      });
    } catch (error) {
      if (id !== request.current) return;
      setView({ state: 'error', message: errorMessage(error, 'The selected repository could not be read.'), ...(shouldPersist ? {} : { canForget: true }) });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const saved = await loadLocalRepository();
        if (cancelled) return;
        if (!saved) {
          setView({ state: 'empty' });
          return;
        }
        const permission = await saved.handle.queryPermission({ mode: 'read' });
        if (cancelled) return;
        if (permission === 'granted') {
          await openHandle(saved.handle, saved.name, saved.view, false);
        } else {
          setView({ state: 'resume', saved, permission });
        }
      } catch (error) {
        if (!cancelled) setView({ state: 'error', message: errorMessage(error, 'The saved repository is not available.'), canForget: true });
      }
    };
    void restore();
    return () => { cancelled = true; request.current++; };
  }, []);

  const openPicker = async () => {
    request.current++;
    if (supportsDirectoryPicker()) {
      try {
        const handle = await chooseLocalDirectory();
        await openHandle(handle, handle.name, null, true);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setView({ state: 'error', message: errorMessage(error, 'The directory picker is unavailable.'), canForget: view.state === 'ready' || view.state === 'resume' });
      }
      return;
    }
    if (!canChooseFileInputDirectory() || !input.current) {
      setView({ state: 'error', message: 'This browser cannot select a repository directory. Use GitHub mode or the demo.' });
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
      let persistenceWarning: string | undefined;
      try { await clearLocalRepository(); }
      catch { persistenceWarning = 'This browser cannot remember the selected folder; choose it again after reloading.'; }
      if (id !== request.current) return;
      const first = project.specs[0];
      const file = firstLocalDocumentPath(project) ?? filePath(first, initialFile(first));
      setSelectedStep(1);
      setSelectedDocument(null);
      setSelectedFeatureSlug(first.slug);
      setView({ state: 'ready', name: snapshot.name, files: snapshot.files, project, file, persisted: false, ...(persistenceWarning ? { persistenceWarning } : {}) });
    } catch (error) {
      if (id !== request.current) return;
      setView({ state: 'error', message: errorMessage(error, 'The selected repository could not be read.') });
    } finally {
      inputElement.value = '';
    }
  };

  const resumeSaved = async (saved: SavedLocalRepository) => {
    const id = ++request.current;
    setView({ state: 'reading' });
    try {
      const permission = await saved.handle.requestPermission({ mode: 'read' });
      if (id !== request.current) return;
      if (permission !== 'granted') {
        setView({ state: 'resume', saved, permission });
        return;
      }
      await openHandle(saved.handle, saved.name, saved.view, false);
    } catch (error) {
      if (id === request.current) setView({ state: 'error', message: errorMessage(error, 'The saved repository could not be reopened.'), canForget: true });
    }
  };

  const forgetSaved = async () => {
    request.current++;
    try {
      await clearLocalRepository();
      setSelectedStep(1);
      setSelectedDocument(null);
      setSelectedFeatureSlug(null);
      setView({ state: 'empty', notice: 'Saved local repository forgotten.' });
    } catch (error) {
      setView({ state: 'error', message: errorMessage(error, 'Could not forget the saved repository.'), canForget: true });
    }
  };

  const leave = () => {
    request.current++;
    setView({ state: 'empty' });
    onExit();
  };

  const ready = view.state === 'ready' ? view : null;
  const selectedSpec = ready?.project.specs.find(feature => feature.slug === selectedFeatureSlug) ?? null;
  const filePath = (feature: SpecFeature, file: string) => `specs/${feature.slug}/${file}`;
  const persistView = (next: LocalRepositoryView) => {
    if (ready?.persisted) void saveLocalView(next).catch(() => undefined);
  };
  const selectFile = (file: string) => {
    if (!ready) return;
    const feature = ready.project.specs.find(item => file.startsWith(`specs/${item.slug}/`));
    const featureSlug = feature?.slug ?? selectedFeatureSlug ?? ready.project.specs[0]?.slug ?? null;
    const stage = file === '.specify/memory/constitution.md' ? 0 : stageIndexForFile(file);
    const nextStep = stage >= 0 ? stage : selectedStep;
    const nextDocument = stage >= 0 ? null : file;
    if (feature) setSelectedFeatureSlug(feature.slug);
    setSelectedStep(nextStep);
    setSelectedDocument(nextDocument);
    setView({ ...ready, file });
    persistView({ selectedFeatureSlug: featureSlug, selectedFilePath: file, selectedStep: nextStep, selectedDocumentPath: nextDocument });
  };
  const selectSpec = (feature: SpecFeature) => {
    setSelectedFeatureSlug(feature.slug);
    setSelectedStep(1);
    setSelectedDocument(null);
    selectFile(filePath(feature, initialFile(feature)));
  };
  const selectStep = (step: number) => {
    if (!ready) return;
    setSelectedStep(step);
    setSelectedDocument(null);
    const feature = selectedSpec ?? ready.project.specs[0];
    const file = step === 0 ? '.specify/memory/constitution.md' : stageFile(PHASES[step].k, feature.slug);
    setView({ ...ready, file });
    persistView({ selectedFeatureSlug: feature.slug, selectedFilePath: file, selectedStep: step, selectedDocumentPath: null });
  };

  const activeFeature = ready && (selectedSpec ?? ready.project.specs[0]);
  // A folder is changed by git outside the app: it is looked at again when the window is focused, and on the button
  // (no timer), and the new comments wait for a click like on GitHub (specs/012 FR-014).
  const localStore = ready ? localFileStore(ready.handle ?? null) : null;
  const localHls = activeFeature ? savedHls[activeFeature.slug] ?? activeFeature.highlights?.items ?? [] : [];
  const freshCtl = useFreshness({
    enabled: !!activeFeature && !!localStore?.refresh && !localStore.readOnly,
    poll: false,
    read: etag => localStore!.refresh!({ slug: activeFeature!.slug, branch: null }, etag),
    current: () => localHls,
    resetKey: activeFeature ? activeFeature.slug : ''
  });
  const showFresh = (items: Highlight[] | null) => { if (items && activeFeature) setSavedHls(x => ({ ...x, [activeFeature.slug]: items })); };
  const fresh: FreshProps | undefined = activeFeature && localStore?.refresh ? { newCount: freshCtl.newCount, checkedAt: freshCtl.checkedAt, onApply: () => showFresh(freshCtl.apply()), onRefresh: () => { void freshCtl.refresh().then(showFresh); } } : undefined;
  const activePhase = PHASES[selectedStep] ?? PHASES[1];
  const headingPath = ready && activeFeature
    ? selectedDocument ?? stageFile(activePhase.k, activeFeature.slug)
    : '';
  const headingTitle = selectedDocument ? selectedDocument.split('/').at(-1) : activePhase.n;

  return <div className="sk sk-live">
    <nav className="nav sk-nav">
      {ready && <SidebarToggle side="left" open={rd.layout.left} onToggle={() => rd.setLayout({ ...rd.layout, left: !rd.layout.left })} />}
      <div className="nav-brand">Speckit</div>
      <div className="sk-proj">{ready ? `Local · ${ready.name}` : 'Local repository'}</div>
      <div className="sk-spacer"></div>
      <span className="sk-who">READ ONLY</span>
      {ready && <button className="btn btn-secondary sk-small" onClick={() => void openPicker()}>Choose another</button>}
      {ready?.persisted && <button className="btn btn-ghost sk-small" onClick={() => void forgetSaved()}>Forget saved folder</button>}
      {view.state === 'error' && view.canForget && <button className="btn btn-ghost sk-small" onClick={() => void forgetSaved()}>Forget saved folder</button>}
      <button className="btn btn-ghost sk-small" onClick={leave}>Exit local mode</button>
      <input ref={input} type="file" multiple hidden onChange={event => void selected(event)} aria-label="Choose a local repository directory" />
      <ReaderMenu reader={rd.reader} open={aaOpen} setOpen={setAaOpen} onChange={rd.setReader} onReset={rd.reset} />
      {ready && <SidebarToggle side="right" open={rd.layout.right} onToggle={() => rd.setLayout({ ...rd.layout, right: !rd.layout.right })} />}
    </nav>

    {view.state !== 'ready'
      ? <main className="sk-repos">
        <div className="sk-repos-head">
          <h2>Open a local repository</h2>
          <p className="sk-connect-lead">Choose a project folder. Its supported Spec Kit files are read in this tab only; they are not uploaded or changed.</p>
        </div>
        {view.state === 'error' && <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{view.message}</span></div>}
        {view.state === 'resume' && <LocalRepositoryResumeActions
          permission={view.permission}
          onResume={() => void resumeSaved(view.saved)}
          onChoose={() => void openPicker()}
          onForget={() => void forgetSaved()}
        />}
        {view.state === 'reading' && <p className="sk-ns-cursor" role="status">Reading selected Spec Kit files…</p>}
        {view.state === 'restoring' && <p className="sk-ns-cursor" role="status">Checking for a saved local repository…</p>}
        {view.state === 'empty' && view.notice && <p className="text-muted" role="status">{view.notice}</p>}
        {supportsDirectoryPicker() && !supportsPersistentDirectoryAccess() && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>This browser cannot save folder access. Choose the folder again after reloading.</span></div>}
        {!supportsDirectoryPicker() && canChooseFileInputDirectory() && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>This browser cannot remember folder access. Choose the folder again after reloading.</span></div>}
        {!supported && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>Directory selection is not supported in this browser. Demo and GitHub modes remain available.</span></div>}
        <div className="sk-actions">
          <button className="btn btn-primary" onClick={() => void openPicker()} disabled={!supported || view.state === 'reading' || view.state === 'restoring'}>
            Choose repository folder<Icon n="arrow" s={14} />
          </button>
          {view.state === 'error' && view.canForget && <button className="btn btn-secondary" onClick={() => void openPicker()}>Choose another folder</button>}
        </div>
        <p className="text-muted sk-sm">Local mode is read-only. Gate approvals, PR tracking, and Copilot are available in GitHub mode.</p>
      </main>
      : ready && activeFeature && <>
        <div className={'sk-body' + (rd.layout.left ? '' : ' no-left') + (rd.layout.right ? '' : ' no-right')}>
          {rd.layout.left && <aside className="sk-side">
            <div className="sk-pad">
              <Label>Local repository</Label>
              <p className="text-muted sk-sm">Files are read again from the selected folder and stay in this browser tab. Select another folder to refresh.</p>
            </div>
            {ready.persistenceWarning && <div className="sk-pad sk-rule"><div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>{ready.persistenceWarning}</span></div></div>}
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
                {selectedSpec === feature && <ul className="sk-files">{feature.files.filter(file => file !== 'highlights.json').map(file => <li key={file}>
                  <button className="sk-qitem" aria-current={ready.file === filePath(feature, file) ? 'page' : undefined}
                    onClick={() => selectFile(filePath(feature, file))}><b>{file}</b></button>
                </li>)}</ul>}
              </li>)}</ul>
            </div>
          </aside>}
          <main className="sk-main">
            <div className="sk-fhead">
              <div className="sk-file"><Icon n="file" s={14} />{headingPath}</div>
              <h2>{headingTitle}</h2>
            </div>
            <LocalFlow project={ready.project} feature={activeFeature}
              selected={selectedStep} onSelect={selectStep} />
            {selectedDocument
              ? <div className="sk-doc" role="tabpanel" aria-label={selectedDocument}><div className="sk-col"><Markdown>{ready.files.get(selectedDocument) ?? ''}</Markdown></div></div>
              : <LocalStageContent feature={activeFeature} files={ready.files} selected={selectedStep}
                annotate={(body, docProps) => {
                  const k = PHASES[selectedStep]?.k ?? 'specify';
                  const doc = PHASE_DOC[k] ?? '';
                  const text = ready.files.get(`specs/${activeFeature.slug}/${doc}`);
                  return <Annotator items={savedHls[activeFeature.slug] ?? activeFeature.highlights?.items ?? []}
                    target={{ slug: activeFeature.slug, branch: null, phase: k, doc, docSha: text ? contentHash(text) : null }}
                    store={localFileStore(ready.handle ?? null)} author={authorName ? { name: authorName, local: true } : null} askAuthor={askAuthor}
                    focusId={focusId} clearFocus={() => setFocusId(null)} selectedId={selectedId} onSelect={selectHl} fresh={fresh} onOutdated={setOutdated} onActions={setHlActions}
                    onItems={items => setSavedHls(x => ({ ...x, [activeFeature.slug]: items }))}
                    docProps={docProps}>{body}</Annotator>;
                }} />}
          </main>
          {rd.layout.right && <aside className="sk-right">
            <div className="sk-rtabs" role="tablist">
              <button role="tab" aria-selected={rtab === 'local'} onClick={() => setRtab('local')}>Local mode</button>
              <button role="tab" aria-selected={rtab === 'hl'} onClick={() => setRtab('hl')}>Highlights{(() => { const n = (savedHls[activeFeature.slug] ?? activeFeature.highlights?.items ?? []).length; return n > 0 && <span className="sk-rtab-n">{n}</span>; })()}{freshCtl.newCount > 0 && <span className="sk-rtab-new" aria-label={`${freshCtl.newCount} new comments`}>+{freshCtl.newCount}</span>}</button>
            </div>
            {rtab === 'hl' ? <HighlightsPanel actions={hlActions} items={savedHls[activeFeature.slug] ?? activeFeature.highlights?.items ?? []} phases={PHASES.map(p => ({ key: p.k, name: p.n }))} outdated={outdated}
              selectedId={selectedId} fresh={fresh} onOpen={h => { const i = PHASES.findIndex(p => p.k === h.phase); if (i >= 0) selectStep(i); selectHl(h.id, { jump: true }); }}
              readOnly={activeFeature.highlights?.error ?? localFileStore(ready.handle ?? null).readOnly} /> : <>
            <div className="sk-pad"><Label>Local mode</Label>
              <div className="sk-warn" role="status"><Icon n="lock" s={14} /><span>Read-only, except highlights.json</span></div>
              <p className="text-muted sk-sm">Approval gates, pull requests, and Copilot require GitHub mode. Highlights are written to specs/{activeFeature.slug}/highlights.json in this folder; commit it with git yourself.</p>
            </div>
            {ready.project.warnings.map(warning => <div className="sk-pad sk-rule" key={warning}><div className="sk-warn"><Icon n="alert" s={14} /><span>{warning}</span></div></div>)}
            </>}
          </aside>}
        </div>
      </>}
  </div>;
}

export function LocalRepositoryResumeActions({ permission, onResume, onChoose, onForget }: {
  permission: LocalPermissionState;
  onResume: () => void;
  onChoose: () => void;
  onForget: () => void;
}) {
  return <>
    <div className="sk-warn" role="status"><Icon n="lock" s={14} /><span>{permission === 'denied'
      ? 'Access to the saved folder was denied. Resume to grant read access or choose another folder.'
      : 'The saved folder needs your permission before it can be reopened.'}</span></div>
    <div className="sk-actions">
      <button type="button" className="btn btn-primary" onClick={onResume}>Resume saved folder</button>
      <button type="button" className="btn btn-secondary" onClick={onChoose}>Choose another folder</button>
      <button type="button" className="btn btn-ghost" onClick={onForget}>Forget saved folder</button>
    </div>
  </>;
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

export function LocalStageContent({ feature, files, selected, annotate }: {
  feature: SpecFeature;
  files: ReadonlyMap<string, string>;
  selected: number;
  /** Wraps the stage in the highlight layer (specs/010-spec-annotations); without it the plain column is rendered. */
  annotate?: (body: ReactNode, docProps: HTMLAttributes<HTMLDivElement>) => ReactNode;
}) {
  const phase = PHASES[selected] ?? PHASES[1];
  const sourcePath = stageFile(phase.k, feature.slug);
  const source = files.get(sourcePath);
  const clarifications = phase.k === 'clarify' ? feature.spec?.clarifications ?? [] : [];
  const absentMessage = phase.k === 'clarify'
    ? 'No clarification answers are recorded in this local spec.'
    : `No local ${phase.n.toLowerCase()} content is available for this spec.`;

  const docProps: HTMLAttributes<HTMLDivElement> = { id: 'local-flow-panel', role: 'tabpanel', 'aria-labelledby': `local-flow-tab-${selected}` };
  const body = <>
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
  </>;
  if (annotate) return annotate(body, docProps);
  return <div className="sk-doc" {...docProps}><div className="sk-col">{body}</div></div>;
}

function LocalStageEmpty({ title, message }: { title: string; message: string }) {
  return <div className="sk-empty"><Icon n="file" s={28} /><h4>{title}</h4><p>{message}</p></div>;
}

function initialFile(feature: SpecFeature) {
  return feature.files.includes('spec.md') ? 'spec.md' : feature.files[0];
}
