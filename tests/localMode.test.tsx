import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalRepositoryResumeActions, LocalWorkspace } from '../src/project/LocalWorkspace';
import { buildLocalProject } from '../src/project/localProject';
import { LocalFlow, LocalStageContent } from '../src/project/LocalWorkspace';

const fixtureProject = (...names: string[]) => buildLocalProject('fixture', new Map([
  ['.specify/memory/constitution.md', '# Fixture constitution'],
  ...names.flatMap((name, index) => {
    const slug = `${String(index + 1).padStart(3, '0')}-${name}`;
    return [
      [`specs/${slug}/spec.md`, `# ${name}\n\n## Clarifications\n\n- Q: Is this ${name}? → A: Yes.`],
      [`specs/${slug}/plan.md`, `# Plan for ${name}`],
      [`specs/${slug}/tasks.md`, `# Tasks for ${name}`],
      [`specs/${slug}/analysis.md`, `# Analysis for ${name}`]
    ] as [string, string][];
  })
]));

describe('LocalWorkspace', () => {
  it('offers a read-only local route without rendering demo project content', () => {
    const html = renderToStaticMarkup(<LocalWorkspace onExit={() => {}} />);

    expect(html).toContain('Open a local repository');
    expect(html).toContain('read-only');
    expect(html).toContain('Gate approvals, PR tracking, and Copilot');
    expect(html).not.toContain('Wallet App');
  });

  it('explains when the current browser cannot select directories', () => {
    const html = renderToStaticMarkup(<LocalWorkspace onExit={() => {}} />);

    expect(html).toContain('Directory selection is not supported in this browser');
    expect(html).toContain('Demo and GitHub modes remain available');
  });

  it('renders the seven ordered workflow tabs and the selected local stage content', () => {
    const project = fixtureProject('first-feature');
    const feature = project.specs[0];
    const html = renderToStaticMarkup(<>
      <LocalFlow project={project} feature={feature} selected={3} onSelect={() => {}} />
      <LocalStageContent feature={feature} files={projectFiles('first-feature')} selected={3} />
    </>);
    const labels = ['Constitution', 'Specify', 'Clarify', 'Plan', 'Tasks', 'Analyze', 'Implement'];
    const positions = labels.map(label => html.indexOf(`>${label}<`));

    expect(positions.every(position => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('aria-label="Spec Kit steps"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Plan for first-feature');
  });

  it('renders stage content only for the selected local spec', () => {
    const project = fixtureProject('first-feature', 'second-feature');
    const html = renderToStaticMarkup(<>
      <LocalFlow project={project} feature={project.specs[1]} selected={3} onSelect={() => {}} />
      <LocalStageContent feature={project.specs[1]} files={projectFiles('first-feature', 'second-feature')} selected={3} />
    </>);

    expect(html).toContain('Plan for second-feature');
    expect(html).not.toContain('Plan for first-feature');
    expect(html).not.toContain('Wallet App');
  });

  it('shows truthful local-only statuses and an explicit state for missing stage content', () => {
    const project = buildLocalProject('partial', new Map([
      ['specs/001-partial/spec.md', '# Partial feature']
    ]));
    const feature = project.specs[0];
    const html = renderToStaticMarkup(<>
      <LocalFlow project={project} feature={feature} selected={3} onSelect={() => {}} />
      <LocalStageContent feature={feature} files={new Map()} selected={3} />
    </>);

    expect(html).toContain('Not run');
    expect(html).toContain('Available locally');
    expect(html).toContain('Plan unavailable');
    expect(html).toContain('No local plan content is available for this spec.');
    expect(html).not.toContain('Approved');
    expect(html).not.toContain('Wallet App');
  });

  it('shows local clarification answers without claiming a remote approval', () => {
    const project = fixtureProject('clarified-feature');
    const feature = project.specs[0];
    const html = renderToStaticMarkup(<LocalStageContent
      feature={feature} files={projectFiles('clarified-feature')} selected={2}
    />);

    expect(html).toContain('Is this clarified-feature?');
    expect(html).toContain('Yes.');
    expect(html).not.toContain('Approved');
  });

  it('renders a roving tab stop for the keyboard-operable flow tabs', () => {
    const project = fixtureProject('keyboard-feature');
    const html = renderToStaticMarkup(<LocalFlow
      project={project} feature={project.specs[0]} selected={1} onSelect={() => {}}
    />);

    expect((html.match(/role="tab"/g) ?? [])).toHaveLength(7);
    expect((html.match(/type="button"/g) ?? [])).toHaveLength(7);
    expect((html.match(/tabindex="-1"/g) ?? [])).toHaveLength(6);
    expect(html).toContain('id="local-flow-tab-1" type="button" role="tab" aria-selected="true" aria-controls="local-flow-panel" tabindex="0"');
  });
});

describe('LocalRepositoryResumeActions', () => {
  it('explains a permission prompt and offers resume, choose, and forget actions', () => {
    const html = renderToStaticMarkup(<LocalRepositoryResumeActions
      permission="prompt" onResume={() => {}} onChoose={() => {}} onForget={() => {}}
    />);

    expect(html).toContain('needs your permission');
    expect(html).toContain('Resume saved folder');
    expect(html).toContain('Choose another folder');
    expect(html).toContain('Forget saved folder');
    expect(html).toContain('role="status"');
  });

  it('explains denied access without presenting saved repository content', () => {
    const html = renderToStaticMarkup(<LocalRepositoryResumeActions
      permission="denied" onResume={() => {}} onChoose={() => {}} onForget={() => {}}
    />);

    expect(html).toContain('Access to the saved folder was denied');
    expect(html).not.toContain('Wallet App');
  });
});

function projectFiles(...names: string[]) {
  return new Map<string, string>([
    ['.specify/memory/constitution.md', '# Fixture constitution'],
    ...names.flatMap((name, index) => {
      const slug = `${String(index + 1).padStart(3, '0')}-${name}`;
      return [[`specs/${slug}/plan.md`, `# Plan for ${name}`] as [string, string]];
    })
  ]);
}
