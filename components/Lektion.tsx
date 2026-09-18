'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import SchemaPanel, { type SchemaTabelle } from './SchemaPanel';
import { lektionFuerLevel } from '@/lib/lektionen';
import { dbFuerLevel, fuehreAus, schemaLesen } from '@/lib/db';
import type { QueryResult } from '@/lib/compare';
import { ladeGelesen, speichereGelesen } from '@/lib/fortschritt';

type Ausgabe =
  | { art: 'nichts' }
  | { art: 'laeuft' }
  | { art: 'fehler'; text: string }
  | { art: 'ergebnis'; daten: QueryResult };

export default function Lektion({ level }: { level: number }) {
  const lektion = lektionFuerLevel(level);
  const [schritt, setSchritt] = useState(0);
  const [sql, setSql] = useState('');
  const [ausgabe, setAusgabe] = useState<Ausgabe>({ art: 'nichts' });
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);

  const abschnitt = lektion?.abschnitte[schritt];
  const letzter = lektion ? schritt === lektion.abschnitte.length - 1 : false;

  // Datenbank auf den Stand dieser Stufe bringen.
  useEffect(() => {
    let weg = false;
    (async () => {
      const db = await dbFuerLevel(level);
      const t = await schemaLesen(db);
      if (!weg) setSchema(t);
    })();
    return () => {
      weg = true;
    };
  }, [level]);

  // Beim Abschnittswechsel das Beispiel neu laden und die alte Ausgabe wegwerfen.
  useEffect(() => {
    setSql(abschnitt?.beispiel ?? '');
    setAusgabe({ art: 'nichts' });
  }, [abschnitt]);

  // Wer den letzten Abschnitt erreicht, hat die Lektion gesehen.
  useEffect(() => {
    if (!letzter) return;
    const bisher = ladeGelesen();
    if (!bisher.includes(level)) speichereGelesen([...bisher, level]);
  }, [letzter, level]);

  const ausfuehren = useCallback(async () => {
    if (!sql.trim()) return;
    setAusgabe({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(level);
      const daten = await fuehreAus(db, sql);
      setAusgabe({ art: 'ergebnis', daten });
    } catch (f) {
      setAusgabe({ art: 'fehler', text: (f as Error).message });
    }
  }, [sql, level]);

  if (!lektion || !abschnitt) {
    return (
      <div className="buehne">
        <p>Diese Lektion gibt es nicht.</p>
        <Link className="knopf" href="/">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  const geaendert = sql !== (abschnitt.beispiel ?? '');

  return (
    <div className="huelle huelle-lektion">
      <header className="kopf">
        <Link href="/" className="zurueck">
          ← Übersicht
        </Link>
        <h1>
          Stufe {level} · {lektion.titel}
        </h1>
        <span className="stand mono">
          {schritt + 1} / {lektion.abschnitte.length}
        </span>
      </header>

      <main className="buehne">
        <nav className="punkte" aria-label="Abschnitte">
          {lektion.abschnitte.map((a, i) => (
            <button
              key={a.titel}
              className="punkt"
              data-zustand={i === schritt ? 'hier' : i < schritt ? 'durch' : 'offen'}
              onClick={() => setSchritt(i)}
              title={a.titel}
              aria-label={`Abschnitt ${i + 1}: ${a.titel}`}
            />
          ))}
        </nav>

        <article className="lehrtext">
          <div className="marke mono">Abschnitt {schritt + 1}</div>
          <h2>{abschnitt.titel}</h2>
          {abschnitt.text.map((absatz, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: markiere(absatz) }} />
          ))}

          {abschnitt.falle && (
            <aside className="falle">
              <span className="falle-marke mono">Typische Falle</span>
              <p dangerouslySetInnerHTML={{ __html: markiere(abschnitt.falle) }} />
            </aside>
          )}
        </article>

        {abschnitt.beispiel && (
          <section className="beispiel">
            <div className="beispiel-kopf">
              <span>Zum Ausprobieren – du kannst das hier ändern</span>
              {geaendert && (
                <button
                  className="knopf knopf-still"
                  onClick={() => setSql(abschnitt.beispiel ?? '')}
                >
                  Original wiederherstellen
                </button>
              )}
            </div>

            <SqlEditor wert={sql} onChange={setSql} onAusfuehren={ausfuehren} />

            <div className="steuerung">
              <button
                className="knopf knopf-primaer"
                onClick={ausfuehren}
                disabled={ausgabe.art === 'laeuft'}
              >
                {ausgabe.art === 'laeuft' ? 'Läuft …' : 'Ausführen'}
              </button>
              <span className="tastenhinweis mono">⌘/Strg + ⏎</span>
            </div>

            {abschnitt.beobachtung && (
              <p className="beobachtung">
                <span dangerouslySetInnerHTML={{ __html: markiere(abschnitt.beobachtung) }} />
              </p>
            )}

            {ausgabe.art === 'fehler' && (
              <div className="verdikt" data-art="fehler" role="status">
                <span className="verdikt-zeichen mono">!</span>
                <div>
                  <div className="verdikt-kopf">Postgres nimmt die Query nicht an.</div>
                  <pre>{ausgabe.text}</pre>
                </div>
              </div>
            )}

            {ausgabe.art === 'ergebnis' && (
              <Ergebnistabelle titel="Ergebnis" ergebnis={ausgabe.daten} maxZeilen={50} />
            )}
          </section>
        )}

        <div className="blaettern">
          <button
            className="knopf"
            onClick={() => setSchritt((s) => Math.max(0, s - 1))}
            disabled={schritt === 0}
          >
            ← Zurück
          </button>

          {letzter ? (
            <Link href={`/uebung/${level}`} className="knopf knopf-primaer">
              Jetzt die Aufgaben →
            </Link>
          ) : (
            <button
              className="knopf knopf-primaer"
              onClick={() => setSchritt((s) => s + 1)}
            >
              Weiter →
            </button>
          )}
        </div>
      </main>

      <SchemaPanel tabellen={schema} level={level} />
    </div>
  );
}

/**
 * Sehr kleine Auszeichnung fuer den Lehrtext: `code` und **fett**.
 * Der Text stammt ausschliesslich aus lib/lektionen.ts, also aus dem Repo -
 * es fliesst nichts hier hinein, was ein Nutzer eingeben koennte.
 */
function markiere(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
