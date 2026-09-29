'use client';

import { useEffect, useState } from 'react';

/**
 * Umschalter zwischen hellem und dunklem Farbschema.
 *
 * Ohne Wahl folgt die Seite dem System (prefers-color-scheme). Wer umschaltet,
 * legt sich fest: Die Wahl steht als data-theme auf <html> und im
 * localStorage. Das Skript in app/layout.tsx liest sie vor dem ersten
 * Zeichnen, damit die Seite nicht erst dunkel aufblitzt.
 */

export const THEMA_SCHLUESSEL = 'sql-pruefstand:thema';

function istHell(): boolean {
  const gewaehlt = document.documentElement.dataset.theme;
  if (gewaehlt === 'light') return true;
  if (gewaehlt === 'dark') return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

export default function ThemaSchalter() {
  // null bis nach dem ersten Rendern im Browser - auf dem Server ist das
  // Schema unbekannt, und ein falsches Symbol wuerde kurz aufblitzen.
  const [hell, setHell] = useState<boolean | null>(null);

  useEffect(() => {
    setHell(istHell());
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const folgen = () => setHell(istHell());
    mq.addEventListener('change', folgen);
    return () => mq.removeEventListener('change', folgen);
  }, []);

  function umschalten() {
    const neu = istHell() ? 'dark' : 'light';
    document.documentElement.dataset.theme = neu;
    try {
      window.localStorage.setItem(THEMA_SCHLUESSEL, neu);
    } catch {
      /* privater Modus - gilt dann nur fuer diesen Besuch */
    }
    setHell(neu === 'light');
  }

  const beschriftung = hell ? 'Dunkles Farbschema einschalten' : 'Helles Farbschema einschalten';

  return (
    <button
      type="button"
      className="thema-schalter"
      onClick={umschalten}
      aria-label={beschriftung}
      title={beschriftung}
    >
      <span aria-hidden="true">{hell === null ? '' : hell ? '☾' : '☀'}</span>
    </button>
  );
}
