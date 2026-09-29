'use client';

import { useEffect, useState } from 'react';

/**
 * Umschalter zwischen hellem und dunklem Farbschema.
 *
 * Standard ist dunkel, egal was das System eingestellt hat. Wer auf hell
 * umschaltet, bekommt data-theme="light" auf <html>, und die Wahl landet im
 * localStorage. Das Skript in app/layout.tsx liest sie vor dem ersten
 * Zeichnen, damit die Seite nicht erst dunkel aufblitzt.
 */

export const THEMA_SCHLUESSEL = 'sql-pruefstand:thema';

function istHell(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

export default function ThemaSchalter() {
  // null bis nach dem ersten Rendern im Browser - auf dem Server ist das
  // Schema unbekannt, und ein falsches Symbol wuerde kurz aufblitzen.
  const [hell, setHell] = useState<boolean | null>(null);

  useEffect(() => setHell(istHell()), []);

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
