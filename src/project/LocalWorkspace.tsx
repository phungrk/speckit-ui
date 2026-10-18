import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Icon, Label } from '../ui';
import { Markdown } from './Markdown';
import { buildLocalProject, firstLocalDocumentPath, readLocalDirectory, type LocalFileSnapshot } from './localProject';
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
  const selectedSpec = ready?.project.specs.find(feature => ready.file.startsWith(`specs/${feature.slug}/`)) ?? null;
  const content = ready?.files.get(ready.file) ?? '';
  const title = selectedSpec?.title ?? (ready?.file === '.specify/memory/constitution.md' ? 'Constitution' : 'Local repository');

  const selectFile = (file: string) => {
    if (view.state === 'ready') setView({ ...view, file });
  };
  const filePath = (feature: SpecFeature, file: string) => `specs/${feature.slug}/${file}`;

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
      : ready && <>
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
                  onClick={() => selectFile(filePath(feature, initialFile(feature)))}>
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
              <div className="sk-file"><Icon n="file" s={14} />{ready.file}</div>
              <h2>{title}</h2>
            </div>
            <div className="sk-doc" role="tabpanel" aria-label={ready.file}><Markdown>{content}</Markdown></div>
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

function initialFile(feature: SpecFeature) {
  return feature.files.includes('spec.md') ? 'spec.md' : feature.files[0];
}
