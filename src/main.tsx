import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/modernist.css';
import './styles/workspace.css';
import './styles/live.css';
import { Root } from './Root';

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
