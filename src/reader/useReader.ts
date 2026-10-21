import { useEffect, useMemo, useState } from 'react';
import { prefsFor, type PrefsStorage } from '../project/prefs';
import { DEFAULT_READER, applyReader, loadDeviceReader, resolveReader, saveDeviceReader, type LayoutPrefs, type ReaderSettings } from './settings';
import { sidebarKey } from './ReaderControls';

/** Local and demo have no GitHub login; their settings belong to the browser. */
export const DEMO_OWNER = '~demo';
export const LOCAL_OWNER = '~local';

export interface ReaderState {
  reader: ReaderSettings;
  setReader: (s: ReaderSettings) => void;
  reset: () => void;
  layout: LayoutPrefs;
  setLayout: (l: LayoutPrefs) => void;
}

/** Reader settings and sidebar layout for one owner (a GitHub login, ~local or ~demo), per data-model.md "Luồng". */
export function useReader(owner: string, where: PrefsStorage, initialLayout?: LayoutPrefs): ReaderState {
  const prefs = useMemo(() => prefsFor(owner, where), [owner, where]);
  const [reader, setState] = useState<ReaderSettings>(() => resolveReader(loadDeviceReader(), prefs.getReader()).settings);
  const [layout, setLayoutState] = useState<LayoutPrefs>(() => initialLayout ?? prefs.getLayout());

  useEffect(() => {
    const { settings, saveOwner } = resolveReader(loadDeviceReader(), prefs.getReader());
    if (saveOwner) prefs.setReader(settings);
    saveDeviceReader(settings);
    applyReader(settings);
    setState(settings);
    if (!initialLayout) setLayoutState(prefs.getLayout());
  }, [prefs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setReader = (s: ReaderSettings) => {
    applyReader(s);
    prefs.setReader(s);
    saveDeviceReader(s);
    setState(s);
  };
  const setLayout = (l: LayoutPrefs) => { prefs.setLayout(l); setLayoutState(l); };
  return { reader, setReader, reset: () => setReader(DEFAULT_READER), layout, setLayout };
}

/** `[` and `]` toggle the sidebars (research R7). */
export function useSidebarKeys(layout: LayoutPrefs, setLayout: (l: LayoutPrefs) => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const side = sidebarKey(e);
      if (!side) return;
      e.preventDefault();
      setLayout({ ...layout, [side]: !layout[side] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layout, setLayout]);
}
