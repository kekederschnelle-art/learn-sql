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
  abbrechen,
  dbFuerLevel,
  fehlerKopf,
  fuehreAus,
  fuehreAusUndLiesZustand,
  schemaLesen,
  type RohErgebnis,
} from '@/lib/db';
import {
  abweichungen,
  abweichungsText,
  vergleiche,
  type QueryResult,
  type VergleichsErgebnis,
} from '@/lib/compare';
import {
  ladeEntwuerfe,
  ladeGeloest,
  speichereEntwuerfe,
  speichereGeloest,
} from '@/lib/fortschritt';

type Lauf =
  | { art: 'nichts' }
  | { art: 'laeuft' }
  | { art: 'sqlfehler'; text: string; kopf: string }
  // V7: Ausgefuehrt, aber absichtlich nicht geprueft.
  | { art: 'roh'; daten: RohErgebnis }
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
  const nurAusfuehrenRef = useRef<() => void>(() => {});

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

  /** Gibt es ueberhaupt etwas auszufuehren, oder steht da nur ein Kommentar? */
  const hatInhalt = !!sql.replace(/--[^\n]*/g, '').trim();

  const fehlerAnzeigen = useCallback((f: unknown) => {
    setLauf({ art: 'sqlfehler', text: (f as Error).message, kopf: fehlerKopf(f) });
  }, []);

  const pruefen = useCallback(async () => {
    if (!aufgabe || !hatInhalt) return;
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
        fehlerAnzeigen(f);
        return;
      }
      const urteil = vergleiche(erwartet, eigene, aufgabe.reihenfolgeZaehlt);
      setLauf({ art: 'geprueft', urteil, eigene, erwartet });
      if (urteil.korrekt) {
        setGeloest((g) => (g.includes(aufgabe.id) ? g : [...g, aufgabe.id]));
      }
    } catch (f) {
      fehlerAnzeigen(f);
    }
  }, [aufgabe, sql, level, hatInhalt, fehlerAnzeigen]);

  /**
   * V7: Ausfuehren, ohne mit der Musterloesung zu vergleichen.
   *
   * Beim SQL-Lernen schaut man sich staendig erst die Daten an
   * ("select * from inquiries limit 5"). Vorher gab es darauf ein rotes
   * Kreuz und die Erwartet-Tabelle daneben hat die Loesung verraten.
   */
  const nurAusfuehren = useCallback(async () => {
    if (!aufgabe || !hatInhalt) return;
    setLauf({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(level);
      setLauf({ art: 'roh', daten: await fuehreAus(db, sql) });
    } catch (f) {
      fehlerAnzeigen(f);
    }
  }, [aufgabe, sql, level, hatInhalt, fehlerAnzeigen]);

  pruefenRef.current = pruefen;
  nurAusfuehrenRef.current = nurAusfuehren;
  const pruefenStabil = useCallback(() => pruefenRef.current(), []);
  const nurAusfuehrenStabil = useCallback(() => nurAusfuehrenRef.current(), []);

  // V6: Bei falscher Loesung die abweichenden Zellen/Zeilen bestimmen.
  const abw = useMemo(() => {
    if (lauf.art !== 'geprueft' || lauf.urteil.korrekt || !aufgabe) return null;
    return abweichungen(lauf.erwartet, lauf.eigene, aufgabe.reihenfolgeZaehlt);
  }, [lauf, aufgabe]);
  const abwText = abw ? abweichungsText(abw) : null;

  if (!aufgabe) {
    return (
      <div className="buehne">
        <p>Für diese Stufe gibt es keine Aufgaben.</p>
        <Link className="knopf" href="/lektionen">
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
        <Link href="/lektionen" className="zurueck">
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

        <SqlEditor
          wert={sql}
          onChange={setSql}
          onAusfuehren={pruefenStabil}
          onNurAusfuehren={nurAusfuehrenStabil}
          schema={schema}
        />

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
            onClick={nurAusfuehren}
            disabled={lauf.art === 'laeuft'}
            title="Zeigt nur das Ergebnis deiner Query – ohne Vergleich mit der Lösung"
          >
            Nur ausführen
          </button>

          {lauf.art === 'laeuft' && (
            <button className="knopf knopf-gefahr" onClick={abbrechen}>
              Abbrechen
            </button>
          )}

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

          <span className="tastenhinweis mono">⌘/Strg + ⏎ · mit ⇧ nur ausführen</span>
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
              <div className="verdikt-kopf">{lauf.kopf}</div>
              <pre>{lauf.text}</pre>
            </div>
          </div>
        )}

        {lauf.art === 'roh' && (
          <div className="verdikt" data-art="neutral" role="status">
            <span className="verdikt-zeichen mono">›</span>
            <div>
              <div className="verdikt-kopf">
                Ausgeführt, nicht geprüft.
                {lauf.daten.felder.length === 0 &&
                  (lauf.daten.anweisungen === 1
                    ? ' Anweisung lief durch, kein Ergebnis mit Spalten.'
                    : ` ${lauf.daten.anweisungen} Anweisungen liefen durch.`)}
              </div>
              <ul>
                <li>
                  Zum Vergleichen mit der Musterlösung „Ausführen und prüfen“ nehmen.
                </li>
              </ul>
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

        {lauf.art === 'roh' && lauf.daten.felder.length > 0 && (
          <div className="tabellen">
            <Ergebnistabelle titel="Ergebnis (ungeprüft)" ergebnis={lauf.daten} />
          </div>
        )}

        {lauf.art === 'geprueft' && (
          <div className="tabellen">
            {abwText && (
              <div className="abw-legende mono">
                <span>{abwText}</span>
                <span className="abw-legende-hilfe">
                  <span className="abw-muster abw-muster-ist" aria-hidden="true" /> deins
                  <span className="abw-muster abw-muster-soll" aria-hidden="true" /> erwartet
                  · Maus über eine markierte Zelle zeigt den Gegenwert
                </span>
              </div>
            )}
            <Ergebnistabelle
              titel={
                aufgabe.art === 'zustand' ? 'Zustand nach deinen Anweisungen' : 'Dein Ergebnis'
              }
              ergebnis={lauf.eigene}
              markierung={abw?.eigene}
            />
            {!lauf.urteil.korrekt && (
              <Ergebnistabelle
                titel={aufgabe.art === 'zustand' ? 'Erwarteter Zustand' : 'Erwartet'}
                ergebnis={lauf.erwartet}
                markierung={abw?.erwartet}
              />
            )}
          </div>
        )}
      </main>

      <SchemaPanel tabellen={schema} level={level} />
    </div>
  );
}
