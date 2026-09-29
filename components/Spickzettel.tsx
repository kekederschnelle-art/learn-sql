'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ThemaSchalter from './ThemaSchalter';
import { spickzettel, type SpickEintrag } from '@/lib/spickzettel';
import { markiere } from '@/lib/markiere';

/** Sucht in Titel, Syntax, Beispiel und Merksatz, ohne Gross-/Kleinschreibung. */
function passt(e: SpickEintrag, suche: string): boolean {
  if (!suche) return true;
  const heuhaufen = `${e.titel}\n${e.syntax}\n${e.beispiel}\n${e.merke ?? ''}`.toLowerCase();
  return suche
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((wort) => heuhaufen.includes(wort));
}

function KopierKnopf({ text }: { text: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <button
      type="button"
      className="knopf knopf-still spick-kopieren"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setKopiert(true);
          setTimeout(() => setKopiert(false), 1500);
        } catch {
          /* Zwischenablage gesperrt - dann eben markieren und kopieren */
        }
      }}
    >
      {kopiert ? 'Kopiert' : 'Kopieren'}
    </button>
  );
}

export default function Spickzettel() {
  const [suche, setSuche] = useState('');

  const gefiltert = useMemo(
    () =>
      spickzettel
        .map((k) => ({ ...k, eintraege: k.eintraege.filter((e) => passt(e, suche.trim())) }))
        .filter((k) => k.eintraege.length > 0),
    [suche],
  );
  const treffer = gefiltert.reduce((n, k) => n + k.eintraege.length, 0);

  return (
    <main className="start spick" id="inhalt">
      <header className="start-kopf">
        <div className="start-leiste">
          <Link href="/lektionen" className="zurueck">
            ← Übersicht
          </Link>
          <ThemaSchalter />
        </div>
        <h1>Spickzettel</h1>
        <p className="lead">
          Die Syntax aller Stufen zum Nachschlagen. Jedes Beispiel läuft gegen den
          Datensatz seiner Stufe – kopier es in den <Link href="/frei">freien Modus</Link>{' '}
          und probier es aus.
        </p>
      </header>

      <div className="spick-werkzeuge">
        <label className="spick-suche">
          <span className="sr-only">Spickzettel durchsuchen</span>
          <input
            type="search"
            className="mono"
            placeholder="Suchen, z. B. „left join“ oder „null“"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />
        </label>
        <p className="leise mono" role="status">
          {suche.trim() ? `${treffer} Treffer` : ''}
        </p>
      </div>

      {!suche.trim() && (
        <nav className="spick-inhalt" aria-label="Stufen">
          <ol>
            {spickzettel.map((k) => (
              <li key={k.level}>
                <a href={`#stufe-${k.level}`}>
                  <span className="mono leise">{k.level}</span> {k.titel}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {gefiltert.length === 0 && (
        <p className="leise">Nichts gefunden. Versuch es mit einem einzelnen Schlüsselwort.</p>
      )}

      {gefiltert.map((k) => (
        <section key={k.level} id={`stufe-${k.level}`} className="spick-kapitel">
          <div className="spick-kapitel-kopf">
            <h2>
              <span className="mono spick-nr">Stufe {k.level}</span> {k.titel}
            </h2>
            <Link href={`/lektion/${k.level}`} className="rail-link">
              Zur Einführung →
            </Link>
          </div>

          <div className="spick-liste">
            {k.eintraege.map((e) => (
              <article key={e.titel} className="spick-eintrag">
                <h3>{e.titel}</h3>
                <pre className="mono spick-syntax">{e.syntax}</pre>
                {e.merke && (
                  <p
                    className="spick-merke"
                    dangerouslySetInnerHTML={{ __html: markiere(e.merke) }}
                  />
                )}
                <div className="spick-beispiel">
                  <div className="spick-beispiel-kopf">
                    <span className="leise">Beispiel</span>
                    <KopierKnopf text={e.beispiel} />
                  </div>
                  <pre className="mono">{e.beispiel}</pre>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
