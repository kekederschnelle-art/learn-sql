'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import SchemaPanel, { type SchemaTabelle } from './SchemaPanel';
import { tasks, type Task } from '@/lib/tasks';
import { lektionFuerLevel } from '@/lib/lektionen';
import { migrations } from '@/lib/migrations';
import {
  dbFuerLevel,
  fuehreAus,
  fuehreAusUndLiesZustand,
  schemaLesen,
} from '@/lib/db';
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

export default function Uebung({ level }: { level: number }) {
  const stufenTasks = useMemo(() => tasks.filter((t) => t.level === level), [level]);
  const lektion = lektionFuerLevel(level);
  const migration = migrations.find((m) => m.level === level);

  const [aktiveId, setAktiveId] = useState(stufenTasks[0]?.id ?? '');
  const aufgabe: Task | undefined = useMemo(
    () => stufenTasks.find((t) => t.id === aktiveId) ?? stufenTasks[0],
    [aktiveId, stufenTasks],
  );

  const [entwuerfe, setEntwuerfe] = useState<Record<string, string>>({});
  const [geloest, setGeloest] = useState<string[]>([]);
  const [geladen, setGeladen] = useState(false);

  const [lauf, setLauf] = useState<Lauf>({ art: 'nichts' });
  const [hinweiseOffen, setHinweiseOffen] = useState(0);
  const [loesungOffen, setLoesungOffen] = useState(false);
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);

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

  useEffect(() => {
    setLauf({ art: 'nichts' });
    setHinweiseOffen(0);
    setLoesungOffen(false);
  }, [aktiveId]);

  const sql = aufgabe ? (entwuerfe[aufgabe.id] ?? START_SQL) : '';
  const setSql = useCallback(
    (wert: string) => {
      if (!aufgabe) return;
      setEntwuerfe((e) => ({ ...e, [aufgabe.id]: wert }));
    },
    [aufgabe],
  );

  const pruefen = useCallback(async () => {
    if (!aufgabe) return;
    if (!sql.replace(/--[^\n]*/g, '').trim()) return;
    setLauf({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(level);
      const zustandsaufgabe = aufgabe.art === 'zustand' && !!aufgabe.pruefung;

      // Die Musterloesung laeuft gegen denselben Datenstand wie die Eingabe.
      // Bei Zustandsaufgaben wird nicht die Ausgabe verglichen, sondern das,
      // was die Pruefabfrage nach den Anweisungen vorfindet.
      const erwartet = zustandsaufgabe
        ? await fuehreAusUndLiesZustand(db, aufgabe.loesung, aufgabe.pruefung!)
        : await fuehreAus(db, aufgabe.loesung);

      let eigene: QueryResult;
      try {
        eigene = zustandsaufgabe
          ? await fuehreAusUndLiesZustand(db, sql, aufgabe.pruefung!)
          : await fuehreAus(db, sql);
      } catch (f) {
        setLauf({ art: 'sqlfehler', text: (f as Error).message });
        return;
      }
      const urteil = vergleiche(erwartet, eigene, aufgabe.reihenfolgeZaehlt);
      setLauf({ art: 'geprueft', urteil, eigene, erwartet });
      if (urteil.korrekt) {
        setGeloest((g) => (g.includes(aufgabe.id) ? g : [...g, aufgabe.id]));
      }
    } catch (f) {
      setLauf({ art: 'sqlfehler', text: (f as Error).message });
    }
  }, [aufgabe, sql, level]);

  pruefenRef.current = pruefen;
  const pruefenStabil = useCallback(() => pruefenRef.current(), []);

  if (!aufgabe) {
    return (
      <div className="buehne">
        <p>Für diese Stufe gibt es keine Aufgaben.</p>
        <Link className="knopf" href="/">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  const fertig = stufenTasks.filter((t) => geloest.includes(t.id)).length;
  const nummerInStufe = stufenTasks.findIndex((t) => t.id === aufgabe.id) + 1;
  const alleDurch = fertig === stufenTasks.length;
  const naechsteStufe = level + 1;

  return (
    <div className="huelle">
      <header className="kopf">
        <Link href="/" className="zurueck">
          ← Übersicht
        </Link>
        <h1>
          Stufe {level} · {lektion?.titel}
        </h1>
        <span className="stand mono">
          {fertig} / {stufenTasks.length} gelöst
        </span>
      </header>

      <nav className="rail" aria-label="Aufgaben dieser Stufe">
        <div className="stufe">
          <div className="stufe-kopf">
            <span className="nr">Stufe {level}</span>
            <span>+ {migration?.label}</span>
          </div>
          <p className="stufe-was">{migration?.freischaltet}</p>
        </div>

        {stufenTasks.map((t, i) => (
          <button
            key={t.id}
            className="aufgabe-knopf"
            data-aktiv={t.id === aufgabe.id}
            onClick={() => setAktiveId(t.id)}
          >
            <span className="zahl mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="titel">{t.titel}</span>
            <span className="haken">{geloest.includes(t.id) ? '✓' : ''}</span>
          </button>
        ))}

        <div className="rail-fuss">
          <Link href={`/lektion/${level}`} className="rail-link">
            Einführung nochmal lesen
          </Link>
          {alleDurch && lektionFuerLevel(naechsteStufe) && (
            <Link href={`/lektion/${naechsteStufe}`} className="rail-link stark">
              Stufe {naechsteStufe} beginnen →
            </Link>
          )}
        </div>
      </nav>

      <main className="buehne">
        <div className="aufgabenkopf">
          <div className="marke mono">
            Aufgabe {nummerInStufe} von {stufenTasks.length}
          </div>
          <h2>{aufgabe.titel}</h2>
          <p className="aufgabentext">{aufgabe.aufgabe}</p>
          <div className="sortierfahne mono">
            {aufgabe.art === 'zustand'
              ? 'Geprüft wird der Zustand danach, nicht deine Ausgabe · alles wird zurückgerollt'
              : `${
                  aufgabe.reihenfolgeZaehlt
                    ? 'Zeilenreihenfolge wird geprüft'
                    : 'Zeilenreihenfolge ist egal'
                } · Spaltenreihenfolge wie oben genannt · Aliase egal`}
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

          <span className="tastenhinweis mono">⌘/Strg + ⏎</span>
        </div>

        {hinweiseOffen > 0 && (
          <div className="hinweisliste">
            {aufgabe.hinweise.slice(0, hinweiseOffen).map((h, i) => (
              <p key={i}>
                <span className="zaehler mono">{i + 1}. </span>
                {h}
              </p>
            ))}
          </div>
        )}

        {lauf.art === 'sqlfehler' && (
          <div className="verdikt" data-art="fehler" role="status">
            <span className="verdikt-zeichen mono">!</span>
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
            <span className="verdikt-zeichen mono">
              {lauf.urteil.korrekt ? '✓' : '✗'}
            </span>
            <div>
              <div className="verdikt-kopf">{lauf.urteil.meldung}</div>
              {lauf.urteil.details && (
                <ul>
                  {lauf.urteil.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
              {lauf.urteil.korrekt && nummerInStufe < stufenTasks.length && (
                <button
                  className="knopf knopf-still weiter"
                  onClick={() => setAktiveId(stufenTasks[nummerInStufe].id)}
                >
                  Nächste Aufgabe →
                </button>
              )}
              {lauf.urteil.korrekt &&
                nummerInStufe === stufenTasks.length &&
                lektionFuerLevel(naechsteStufe) && (
                  <Link href={`/lektion/${naechsteStufe}`} className="knopf knopf-still weiter">
                    Stufe {naechsteStufe} beginnen →
                  </Link>
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
            <Ergebnistabelle
              titel={
                aufgabe.art === 'zustand' ? 'Zustand nach deinen Anweisungen' : 'Dein Ergebnis'
              }
              ergebnis={lauf.eigene}
            />
            {!lauf.urteil.korrekt && (
              <Ergebnistabelle
                titel={aufgabe.art === 'zustand' ? 'Erwarteter Zustand' : 'Erwartet'}
                ergebnis={lauf.erwartet}
              />
            )}
          </div>
        )}
      </main>

      <SchemaPanel tabellen={schema} level={level} />
    </div>
  );
}
