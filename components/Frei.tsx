'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import SchemaPanel, { type SchemaTabelle } from './SchemaPanel';
import { migrations, MAX_LEVEL } from '@/lib/migrations';
import {
  dbFuerLevel,
  dbZuruecksetzen,
  fuehreAusOhneRollback,
  schemaLesen,
  type RohErgebnis,
} from '@/lib/db';

type Ausgabe =
  | { art: 'nichts' }
  | { art: 'laeuft' }
  | { art: 'fehler'; text: string }
  | { art: 'ergebnis'; daten: RohErgebnis };

const START = `-- Freier Modus: hier bleiben Änderungen bestehen.
-- Probier ruhig INSERT, UPDATE, CREATE TABLE oder DROP.
-- Der Knopf oben rechts baut den Datenstand wieder neu auf.

select * from cars limit 10;
`;

const VERLAUF_MAX = 12;

export default function Frei() {
  const [level, setLevel] = useState(MAX_LEVEL);
  const [sql, setSql] = useState(START);
  const [ausgabe, setAusgabe] = useState<Ausgabe>({ art: 'nichts' });
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);
  const [verlauf, setVerlauf] = useState<string[]>([]);
  const [baut, setBaut] = useState(true);
  const [veraendert, setVeraendert] = useState(false);

  const schemaAuffrischen = useCallback(async () => {
    const db = await dbFuerLevel(level, 'frei');
    setSchema(await schemaLesen(db));
  }, [level]);

  // Datenstand aufbauen, wenn sich die Stufe ändert.
  useEffect(() => {
    let weg = false;
    setBaut(true);
    (async () => {
      const db = await dbFuerLevel(level, 'frei');
      const t = await schemaLesen(db);
      if (weg) return;
      setSchema(t);
      setBaut(false);
      setVeraendert(false);
    })();
    return () => {
      weg = true;
    };
  }, [level]);

  const ausfuehren = useCallback(async () => {
    const roh = sql.replace(/--[^\n]*/g, '').trim();
    if (!roh) return;
    setAusgabe({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(level, 'frei');
      const daten = await fuehreAusOhneRollback(db, sql);
      setAusgabe({ art: 'ergebnis', daten });
      setVeraendert(true);
      setVerlauf((v) => [sql, ...v.filter((x) => x !== sql)].slice(0, VERLAUF_MAX));
      // Ein CREATE oder DROP verändert das Schema - Panel neu einlesen.
      await schemaAuffrischen();
    } catch (f) {
      setAusgabe({ art: 'fehler', text: (f as Error).message });
      setVeraendert(true);
      await schemaAuffrischen();
    }
  }, [sql, level, schemaAuffrischen]);

  const zuruecksetzen = useCallback(async () => {
    setBaut(true);
    setAusgabe({ art: 'nichts' });
    const db = await dbZuruecksetzen(level, 'frei');
    setSchema(await schemaLesen(db));
    setBaut(false);
    setVeraendert(false);
  }, [level]);

  const stufe = migrations.find((m) => m.level === level);

  return (
    <div className="huelle huelle-lektion">
      <header className="kopf">
        <Link href="/" className="zurueck">
          ← Übersicht
        </Link>
        <h1>Freier Modus</h1>
        <div className="kopf-werkzeuge">
          <label className="stufenwahl">
            <span className="leise">Datenstand</span>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="mono"
            >
              {migrations.map((m) => (
                <option key={m.level} value={m.level}>
                  Stufe {m.level} – {m.label}
                </option>
              ))}
            </select>
          </label>
          <button className="knopf" onClick={zuruecksetzen} disabled={baut}>
            {baut ? 'Baut …' : 'Zurücksetzen'}
          </button>
        </div>
      </header>

      <main className="buehne">
        <div className="frei-hinweis" data-veraendert={veraendert}>
          <p>
            Was du hier ausführst, <strong>bleibt bestehen</strong> — anders als in den
            Aufgaben. Du kannst Daten ändern, Tabellen anlegen und auch löschen.
            {veraendert
              ? ' Der Datenstand weicht jetzt möglicherweise vom Original ab.'
              : ' Der Datenstand ist gerade unverändert.'}
          </p>
          <p className="leise">
            Aktuell geladen: alle Tabellen bis Stufe {level} ({stufe?.label}). Das
            Zurücksetzen baut alles frisch auf, deine Änderungen sind dann weg.
          </p>
        </div>

        <SqlEditor wert={sql} onChange={setSql} onAusfuehren={ausfuehren} />

        <div className="steuerung">
          <button
            className="knopf knopf-primaer"
            onClick={ausfuehren}
            disabled={ausgabe.art === 'laeuft' || baut}
          >
            {ausgabe.art === 'laeuft' ? 'Läuft …' : 'Ausführen'}
          </button>
          <span className="tastenhinweis mono">⌘/Strg + ⏎</span>
        </div>

        {ausgabe.art === 'fehler' && (
          <div className="verdikt" data-art="fehler" role="status">
            <span className="verdikt-zeichen mono">!</span>
            <div>
              <div className="verdikt-kopf">Postgres nimmt die Query nicht an.</div>
              <pre>{ausgabe.text}</pre>
            </div>
          </div>
        )}

        {ausgabe.art === 'ergebnis' &&
          (ausgabe.daten.felder.length > 0 ? (
            <Ergebnistabelle
              titel="Ergebnis"
              ergebnis={ausgabe.daten}
              maxZeilen={200}
            />
          ) : (
            <div className="verdikt" data-art="korrekt" role="status">
              <span className="verdikt-zeichen mono">✓</span>
              <div>
                <div className="verdikt-kopf">
                  {ausgabe.daten.anweisungen === 1
                    ? 'Anweisung ausgeführt.'
                    : `${ausgabe.daten.anweisungen} Anweisungen ausgeführt.`}
                </div>
                {typeof ausgabe.daten.betroffen === 'number' &&
                  ausgabe.daten.betroffen > 0 && (
                    <ul>
                      <li>
                        {ausgabe.daten.betroffen}{' '}
                        {ausgabe.daten.betroffen === 1 ? 'Zeile' : 'Zeilen'} betroffen.
                      </li>
                    </ul>
                  )}
              </div>
            </div>
          ))}

        {verlauf.length > 0 && (
          <section className="verlauf">
            <div className="kappe">Zuletzt ausgeführt – zum Übernehmen anklicken</div>
            <ul>
              {verlauf.map((v, i) => (
                <li key={i}>
                  <button className="verlauf-eintrag mono" onClick={() => setSql(v)}>
                    {v.split('\n').find((z) => z.trim() && !z.trim().startsWith('--')) ??
                      v.split('\n')[0]}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SchemaPanel tabellen={schema} level={level} />
    </div>
  );
}
