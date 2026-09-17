'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import SchemaPanel, { type SchemaTabelle } from './SchemaPanel';
import { tasks, tasksNachLevel, type Task } from '@/lib/tasks';
import { migrations } from '@/lib/migrations';
import { dbFuerLevel, fuehreAus, schemaLesen } from '@/lib/db';
import { vergleiche, type QueryResult, type VergleichsErgebnis } from '@/lib/compare';
import {
  ladeEntwuerfe,
  ladeGeloest,
  speichereEntwuerfe,
  speichereGeloest,
} from '@/lib/fortschritt';

type Lauf =
  | { art: 'nichts' }
  | { art: 'laeuft' }
  | { art: 'sqlfehler'; text: string }
  | {
      art: 'geprueft';
      urteil: VergleichsErgebnis;
      eigene: QueryResult;
      erwartet: QueryResult;
    };

const START_SQL = '-- Deine Query hier\n';

export default function Trainer() {
  const gruppen = useMemo(() => tasksNachLevel(), []);
  const [aktiveId, setAktiveId] = useState(tasks[0].id);
  const aufgabe: Task = useMemo(
    () => tasks.find((t) => t.id === aktiveId) ?? tasks[0],
    [aktiveId],
  );
  const nummer = useMemo(
    () => tasks.findIndex((t) => t.id === aktiveId) + 1,
    [aktiveId],
  );

  const [entwuerfe, setEntwuerfe] = useState<Record<string, string>>({});
  const [geloest, setGeloest] = useState<string[]>([]);
  const [geladen, setGeladen] = useState(false);

  const [lauf, setLauf] = useState<Lauf>({ art: 'nichts' });
  const [hinweiseOffen, setHinweiseOffen] = useState(0);
  const [loesungOffen, setLoesungOffen] = useState(false);
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);

  // Ein Ref, damit der Tastaturkurzbefehl im Editor immer die aktuelle
  // Prueffunktion aufruft und nicht eine eingefrorene aus dem ersten Render.
  const pruefenRef = useRef<() => void>(() => {});

  useEffect(() => {
    setEntwuerfe(ladeEntwuerfe());
    setGeloest(ladeGeloest());
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (geladen) speichereEntwuerfe(entwuerfe);
  }, [entwuerfe, geladen]);

  useEffect(() => {
    if (geladen) speichereGeloest(geloest);
  }, [geloest, geladen]);

  // Datenbank auf den Stand der Aufgabe bringen und Schema auslesen.
  useEffect(() => {
    let abgebrochen = false;
    setLauf({ art: 'nichts' });
    setHinweiseOffen(0);
    setLoesungOffen(false);
    (async () => {
      const db = await dbFuerLevel(aufgabe.level);
      const t = await schemaLesen(db);
      if (!abgebrochen) setSchema(t);
    })();
    return () => {
      abgebrochen = true;
    };
  }, [aufgabe.level, aufgabe.id]);

  const sql = entwuerfe[aufgabe.id] ?? START_SQL;
  const setSql = useCallback(
    (wert: string) => setEntwuerfe((e) => ({ ...e, [aufgabe.id]: wert })),
    [aufgabe.id],
  );

  const pruefen = useCallback(async () => {
    if (!sql.replace(/--[^\n]*/g, '').trim()) return;
    setLauf({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(aufgabe.level);
      // Die Musterloesung laeuft gegen denselben Datenstand wie die Eingabe.
      // Deshalb gibt es kein eingefrorenes Erwartungs-JSON, das veralten kann.
      const erwartet = await fuehreAus(db, aufgabe.loesung);
      let eigene: QueryResult;
      try {
        eigene = await fuehreAus(db, sql);
      } catch (fehler) {
        setLauf({ art: 'sqlfehler', text: (fehler as Error).message });
        return;
      }
      const urteil = vergleiche(erwartet, eigene, aufgabe.reihenfolgeZaehlt);
      setLauf({ art: 'geprueft', urteil, eigene, erwartet });
      if (urteil.korrekt) {
        setGeloest((g) => (g.includes(aufgabe.id) ? g : [...g, aufgabe.id]));
      }
    } catch (fehler) {
      setLauf({ art: 'sqlfehler', text: (fehler as Error).message });
    }
  }, [aufgabe, sql]);

  pruefenRef.current = pruefen;
  const pruefenStabil = useCallback(() => pruefenRef.current(), []);

  const geschafft = geloest.length;

  return (
    <div className="huelle">
      <header className="kopf">
        <h1>SQL-Prüfstand</h1>
        <span className="untertitel">Gebrauchtwagen-Datensatz, wächst mit jeder Stufe</span>
        <span className="stand">
          {geschafft} / {tasks.length} gelöst
        </span>
      </header>

      <nav className="rail" aria-label="Aufgaben">
        {gruppen.map(({ level, tasks: gruppenTasks }) => {
          const migration = migrations.find((m) => m.level === level);
          return (
            <div key={level}>
              <div className="stufe">
                <div className="stufe-kopf">
                  <span className="nr">Stufe {level}</span>
                  <span>+ {migration?.label}</span>
                </div>
                <p className="stufe-was">{migration?.freischaltet}</p>
              </div>
              {gruppenTasks.map((t) => {
                const idx = tasks.findIndex((x) => x.id === t.id) + 1;
                return (
                  <button
                    key={t.id}
                    className="aufgabe-knopf"
                    data-aktiv={t.id === aktiveId}
                    onClick={() => setAktiveId(t.id)}
                  >
                    <span className="zahl">{String(idx).padStart(2, '0')}</span>
                    <span className="titel">{t.titel}</span>
                    <span className="haken">{geloest.includes(t.id) ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <main className="buehne">
        <div className="aufgabenkopf">
          <div className="marke">
            Aufgabe {String(nummer).padStart(2, '0')} · Stufe {aufgabe.level}
          </div>
          <h2>{aufgabe.titel}</h2>
          <p className="aufgabentext">{aufgabe.aufgabe}</p>
          <div className="sortierfahne">
            {aufgabe.reihenfolgeZaehlt
              ? 'Zeilenreihenfolge wird geprüft'
              : 'Zeilenreihenfolge ist egal'}
            {' · Spaltenreihenfolge wie oben genannt · Aliase egal'}
          </div>
        </div>

        <SqlEditor wert={sql} onChange={setSql} onAusfuehren={pruefenStabil} />

        <div className="steuerung">
          <button
            className="knopf knopf-primaer"
            onClick={pruefen}
            disabled={lauf.art === 'laeuft'}
          >
            {lauf.art === 'laeuft' ? 'Läuft …' : 'Ausführen und prüfen'}
          </button>

          <button
            className="knopf"
            onClick={() => setHinweiseOffen((n) => n + 1)}
            disabled={hinweiseOffen >= aufgabe.hinweise.length}
          >
            {hinweiseOffen === 0
              ? 'Hinweis'
              : hinweiseOffen >= aufgabe.hinweise.length
                ? 'Keine Hinweise mehr'
                : 'Noch ein Hinweis'}
          </button>

          <button className="knopf" onClick={() => setLoesungOffen((v) => !v)}>
            {loesungOffen ? 'Lösung verstecken' : 'Lösung zeigen'}
          </button>

          <span className="tastenhinweis">⌘/Strg + ⏎</span>
        </div>

        {hinweiseOffen > 0 && (
          <div className="hinweisliste">
            {aufgabe.hinweise.slice(0, hinweiseOffen).map((h, i) => (
              <p key={i}>
                <span className="zaehler">{i + 1}. </span>
                {h}
              </p>
            ))}
          </div>
        )}

        {lauf.art === 'sqlfehler' && (
          <div className="verdikt" data-art="fehler" role="status">
            <span className="verdikt-zeichen">!</span>
            <div>
              <div className="verdikt-kopf">Postgres nimmt die Query nicht an.</div>
              <pre>{lauf.text}</pre>
            </div>
          </div>
        )}

        {lauf.art === 'geprueft' && (
          <div
            className="verdikt"
            data-art={lauf.urteil.korrekt ? 'korrekt' : 'falsch'}
            role="status"
          >
            <span className="verdikt-zeichen">{lauf.urteil.korrekt ? '✓' : '✗'}</span>
            <div>
              <div className="verdikt-kopf">{lauf.urteil.meldung}</div>
              {lauf.urteil.details && (
                <ul>
                  {lauf.urteil.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {loesungOffen && (
          <div className="loesungsblock">
            <div className="kappe">Musterlösung – eine von mehreren möglichen</div>
            <pre className="mono">{aufgabe.loesung.trim()}</pre>
          </div>
        )}

        {lauf.art === 'geprueft' && (
          <div className="tabellen">
            <Ergebnistabelle titel="Dein Ergebnis" ergebnis={lauf.eigene} />
            {!lauf.urteil.korrekt && (
              <Ergebnistabelle titel="Erwartet" ergebnis={lauf.erwartet} />
            )}
          </div>
        )}
      </main>

      <SchemaPanel tabellen={schema} level={aufgabe.level} />
    </div>
  );
}
