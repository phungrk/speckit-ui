import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalWorkspace } from '../src/project/LocalWorkspace';

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
});
