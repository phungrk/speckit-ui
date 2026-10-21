import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/modernist.css';
// Before the workspace styles, as in the design: a component that sets its own size keeps it (specs/010).
import './styles/reader.css';
import './styles/workspace.css';
import './styles/live.css';
import { Root } from './Root';
import { DEFAULT_READER, applyReader, loadDeviceReader } from './reader/settings';

// Apply the reader theme before React paints, so a reload never flashes the default (specs/010 R2).
applyReader(loadDeviceReader() ?? DEFAULT_READER);

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
