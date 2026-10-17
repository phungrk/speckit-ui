import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Raw HTML in the source is not rendered (react-markdown's default), so repo content can't inject markup.
const components: Components = {
  table: ({ node: _node, ...props }) => <table className="table" {...props} />,
  a: ({ node: _node, ...props }) => <a target="_blank" rel="noreferrer" {...props} />
};

export function Markdown({ children }: { children: string }) {
  return <div className="sk-md"><ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown></div>;
}
