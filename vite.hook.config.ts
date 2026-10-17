// Builds the Claude Code gate check (hook/speckit-gate.ts) into one Node ES module,
// dist/speckit-gate.mjs, served next to the app (specs/004 R8).
import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { buildCommit } from './vite.config.ts';

export default defineConfig(() => {
  const commit = buildCommit();
  return {
    define: { __BUILD__: JSON.stringify(commit) },
    build: {
      ssr: 'hook/speckit-gate.ts',
      outDir: process.env.HOOK_OUT_DIR || 'dist',
      emptyOutDir: false,
      target: 'node18',
      minify: false,
      rollupOptions: {
        external: [...builtinModules, ...builtinModules.map(m => `node:${m}`)],
        output: { format: 'es' as const, entryFileNames: 'speckit-gate.mjs', banner: `#!/usr/bin/env node\n// speckit-gate ${commit} · https://github.com/phungrk/speckit-ui#approval-gates` }
      }
    },
    ssr: { noExternal: true as const }
  };
});
