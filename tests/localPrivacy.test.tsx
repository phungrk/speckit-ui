import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLocalProject, readLocalDirectory } from '../src/project/localProject';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocalFlow } from '../src/project/LocalWorkspace';

describe('local mode privacy boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses user-selected content without sending a request or writing files', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const file = new File(['# Private local spec'], 'spec.md', { type: 'text/markdown' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'private-repo/specs/001-private/spec.md' });

    const snapshot = await readLocalDirectory([file]);
    const project = buildLocalProject(snapshot.name, snapshot.files, snapshot.warnings);

    expect(project.specs[0].spec?.title).toBe('Private local spec');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders local workflow navigation without remote or write actions', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const selectStage = vi.fn();
    const project = buildLocalProject('private', new Map([
      ['specs/001-private/spec.md', '# Private local spec']
    ]));
    const html = renderToStaticMarkup(<LocalFlow
      project={project} feature={project.specs[0]} selected={1} onSelect={selectStage}
    />);
    const flow = LocalFlow({ project, feature: project.specs[0], selected: 1, onSelect: selectStage });
    const tabs = flow.props.children as React.ReactElement[];
    tabs[3].props.onClick();

    expect(html).toContain('role="tablist"');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Approve');
    expect(html).not.toContain('Run command');
    expect(selectStage).toHaveBeenCalledWith(3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
