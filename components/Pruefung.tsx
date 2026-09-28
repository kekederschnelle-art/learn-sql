'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import SchemaPanel, { type SchemaTabelle } from './SchemaPanel';
import { tasks, type Task } from '@/lib/tasks';
import { lektionFuerLevel } from '@/lib/lektionen';
import { MAX_LEVEL } from '@/lib/migrations';
import {
  dbFuerLevel,
  fuehreAus,
  fuehreAusUndLiesZustand,
  schemaLesen,
  TransaktionsFehler,
  type RohErgebnis,
} from '@/lib/db';
import { vergleiche, type QueryResult, type VergleichsErgebnis } from '@/lib/compare';
import {
  ladeGeloest,
  ladeLog,
  logLeeren,
  schwacheStufen,
  speichereGeloest,
  speichereLauf,
  type AufgabenStand,
  type PruefungsLauf,
} from '@/lib/fortschritt';
import {
  ANZAHL_OPTIONEN,
  MINUTEN_OPTIONEN,
  STANDARD_KONFIG,
  alsUhrzeit,
  einordnung,
  verfuegbar,
  waehleAufgaben,
  type PruefungsKonfig,
} from '@/lib/pruefung';

const START_SQL = '-- Deine Query hier\n';

type Ergebnis = {
  task: Task;
  sql: string;
  /** null = nicht bearbeitet oder gar nicht erst gelaufen. */
  urteil: VergleichsErgebnis | null;
  fehler?: string;
  eigene?: QueryResult;
  erwartet?: QueryResult;
};

type Probe =
  | { art: 'nichts' }
  | { art: 'laeuft' }
  | { art: 'fehler'; text: string; kopf: string }
  | { art: 'ergebnis'; daten: RohErgebnis };

type Phase = 'konfig' | 'laeuft' | 'wertet' | 'fertig';

const MARKE = { korrekt: '✓', falsch: '✗', leer: '–' } as const;

function standVon(e: Ergebnis): AufgabenStand['stand'] {
  if (e.urteil?.korrekt) return 'korrekt';
  return e.sql ? 'falsch' : 'leer';
}

/** Ton für den Rand eines Log-Eintrags – dieselbe Skala wie die Auswertung. */
function tonVon(lauf: PruefungsLauf): 'gut' | 'mittel' | 'schwach' {
  const richtig = lauf.ergebnisse.filter((e) => e.stand === 'korrekt').length;
  return einordnung(richtig, lauf.ergebnisse.length).ton;
}

export default function Pruefung() {
  const [phase, setPhase] = useState<Phase>('konfig');
  const [konfig, setKonfig] = useState<PruefungsKonfig>(STANDARD_KONFIG);
  const [aufgaben, setAufgaben] = useState<Task[]>([]);
  const [aktiv, setAktiv] = useState(0);
  const [antworten, setAntworten] = useState<Record<string, string>>({});
  const [probe, setProbe] = useState<Probe>({ art: 'nichts' });
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);
  const [schemaLevel, setSchemaLevel] = useState<number | null>(null);

  const [startZeit, setStartZeit] = useState(0);
  const [endeBei, setEndeBei] = useState<number | null>(null);
  const [jetzt, setJetzt] = useState(0);

  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [dauer, setDauer] = useState(0);
  const [gutgeschrieben, setGutgeschrieben] = useState(0);
  const [log, setLog] = useState<PruefungsLauf[]>([]);

  // Beim ersten Laden den Bereich auf das setzen, was schon gelernt wurde.
  // Wer noch nichts gelöst hat, bekommt alles angeboten.
  useEffect(() => {
    const geloest = ladeGeloest();
    const hoechste = tasks
      .filter((t) => geloest.includes(t.id))
      .reduce((m, t) => Math.max(m, t.level), 0);
    setKonfig((k) => ({ ...k, bisLevel: hoechste > 0 ? hoechste : MAX_LEVEL }));
    setLog(ladeLog());
  }, []);

  const aufgabe = aufgaben[aktiv];

  // Datenstand der aktuellen Aufgabe laden. Die Aufgaben sind nach Stufe
  // sortiert, deshalb wird die Datenbank im Durchgang nur selten neu gebaut.
  useEffect(() => {
    if (phase !== 'laeuft' || !aufgabe) return;
    let weg = false;
    (async () => {
      const db = await dbFuerLevel(aufgabe.level);
      const t = await schemaLesen(db);
      if (weg) return;
      setSchema(t);
      setSchemaLevel(aufgabe.level);
    })();
    return () => {
      weg = true;
    };
  }, [phase, aufgabe]);

  useEffect(() => setProbe({ art: 'nichts' }), [aktiv]);

  // Uhr. Läuft nur während der Bearbeitung und nur mit Timer.
  useEffect(() => {
    if (phase !== 'laeuft') return;
    setJetzt(Date.now());
    const id = window.setInterval(() => setJetzt(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Versehentliches Schließen kostet den laufenden Durchgang - der Zustand
  // liegt bewusst nur im Speicher. Erst das Ergebnis landet im Log.
  useEffect(() => {
    if (phase !== 'laeuft') return;
    const warnen = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warnen);
    return () => window.removeEventListener('beforeunload', warnen);
  }, [phase]);

  const setSql = useCallback(
    (wert: string) => {
      if (!aufgabe) return;
      setAntworten((a) => ({ ...a, [aufgabe.id]: wert }));
    },
    [aufgabe],
  );

  const starten = useCallback(() => {
    const gezogen = waehleAufgaben(tasks, konfig);
    if (!gezogen.length) return;
    setAufgaben(gezogen);
    setAntworten({});
    setAktiv(0);
    setErgebnisse([]);
    const jetztMs = Date.now();
    setStartZeit(jetztMs);
    setEndeBei(konfig.mitTimer ? jetztMs + konfig.minuten * 60_000 : null);
    setPhase('laeuft');
  }, [konfig]);

  const abgeben = useCallback(async () => {
    setPhase('wertet');
    const gebraucht = Math.round((Date.now() - startZeit) / 1000);
    setDauer(gebraucht);

    const out: Ergebnis[] = [];
    for (const t of aufgaben) {
      const roh = antworten[t.id] ?? '';
      const hatInhalt = !!roh.replace(/--[^\n]*/g, '').trim();
      if (!hatInhalt) {
        out.push({ task: t, sql: '', urteil: null });
        continue;
      }
      try {
        const db = await dbFuerLevel(t.level);
        const zustand = t.art === 'zustand' && !!t.pruefung;
        const erwartet = zustand
          ? await fuehreAusUndLiesZustand(db, t.loesung, t.pruefung!)
          : await fuehreAus(db, t.loesung);
        let eigene: QueryResult;
        try {
          eigene = zustand
            ? await fuehreAusUndLiesZustand(db, roh, t.pruefung!)
            : await fuehreAus(db, roh);
        } catch (f) {
          out.push({ task: t, sql: roh, urteil: null, fehler: (f as Error).message });
          continue;
        }
        out.push({
          task: t,
          sql: roh,
          urteil: vergleiche(erwartet, eigene, t.reihenfolgeZaehlt),
          eigene,
          erwartet,
        });
      } catch (f) {
        out.push({ task: t, sql: roh, urteil: null, fehler: (f as Error).message });
      }
    }

    // Was hier richtig war, ist auch richtig gelöst - das zählt zum Fortschritt.
    const neuGeloest = out.filter((e) => e.urteil?.korrekt).map((e) => e.task.id);
    const vorher = ladeGeloest();
    const dazu = neuGeloest.filter((id) => !vorher.includes(id));
    if (dazu.length) speichereGeloest([...vorher, ...dazu]);
    setGutgeschrieben(dazu.length);

    // V7.1: Der Durchgang kommt in den Log - nur das Ergebnis, keine Queries.
    const jetztMs = Date.now();
    speichereLauf({
      id: String(jetztMs),
      erstellt: new Date(jetztMs).toISOString(),
      dauer: gebraucht,
      konfig: {
        anzahl: aufgaben.length,
        vonLevel: aufgaben[0]?.level ?? konfig.vonLevel,
        bisLevel: aufgaben[aufgaben.length - 1]?.level ?? konfig.bisLevel,
        minuten: konfig.mitTimer ? konfig.minuten : null,
      },
      ergebnisse: out.map((e) => {
        const stand = standVon(e);
        const eintrag: AufgabenStand = { id: e.task.id, level: e.task.level, stand };
        if (stand === 'falsch') {
          eintrag.meldung = e.fehler
            ? 'Die Query lief nicht durch.'
            : (e.urteil?.meldung ?? '');
        }
        return eintrag;
      }),
    });
    setLog(ladeLog());

    setErgebnisse(out);
    setPhase('fertig');
  }, [aufgaben, antworten, startZeit, konfig]);

  // Die Uhr darf die Prüfung beenden, ohne dass abgeben() neu gebunden wird.
  const abgebenRef = useRef(abgeben);
  abgebenRef.current = abgeben;
  useEffect(() => {
    if (phase !== 'laeuft' || endeBei === null) return;
    if (jetzt && jetzt >= endeBei) abgebenRef.current();
  }, [phase, endeBei, jetzt]);

  const nurAusfuehren = useCallback(async () => {
    if (!aufgabe) return;
    const roh = antworten[aufgabe.id] ?? '';
    if (!roh.replace(/--[^\n]*/g, '').trim()) return;
    setProbe({ art: 'laeuft' });
    try {
      const db = await dbFuerLevel(aufgabe.level);
      setProbe({ art: 'ergebnis', daten: await fuehreAus(db, roh) });
    } catch (f) {
      setProbe({
        art: 'fehler',
        kopf:
          f instanceof TransaktionsFehler
            ? 'Diese Anweisung ist in den Aufgaben gesperrt.'
            : 'Postgres nimmt die Query nicht an.',
        text: (f as Error).message,
      });
    }
  }, [aufgabe, antworten]);

  const nurAusfuehrenRef = useRef(nurAusfuehren);
  nurAusfuehrenRef.current = nurAusfuehren;
  const nurAusfuehrenStabil = useCallback(() => nurAusfuehrenRef.current(), []);

  const schwach = useMemo(() => schwacheStufen(log), [log]);

  // ════════════════════════════════════════════════════════════ Konfig ══

  if (phase === 'konfig') {
    const imBereich = verfuegbar(tasks, konfig.vonLevel, konfig.bisLevel);
    const stufen = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
    return (
      <div className="start">
        <header className="start-kopf">
          <Link href="/lektionen" className="zurueck">
            ← Übersicht
          </Link>
          <h1>Prüfung</h1>
          <p className="lead">
            Zufällige Aufgaben quer über die Stufen. Keine Hinweise, keine Musterlösung,
            kein Richtig-oder-falsch während der Bearbeitung – erst am Ende die
            Auswertung. Du darfst deine Query ausführen, um zu sehen, was sie liefert.
          </p>
          <p className="lead leise">
            Der laufende Durchgang liegt nur im Arbeitsspeicher. Schließt du den Tab, ist
            er weg – gespeichert wird erst das Ergebnis.
          </p>
        </header>

        <div className="pruef-konfig">
          <label className="pruef-feld">
            <span>Aufgaben</span>
            <select
              className="mono"
              value={konfig.anzahl}
              onChange={(e) => setKonfig((k) => ({ ...k, anzahl: Number(e.target.value) }))}
            >
              {ANZAHL_OPTIONEN.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="pruef-feld">
            <span>Von Stufe</span>
            <select
              className="mono"
              value={konfig.vonLevel}
              onChange={(e) => setKonfig((k) => ({ ...k, vonLevel: Number(e.target.value) }))}
            >
              {stufen.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="pruef-feld">
            <span>Bis Stufe</span>
            <select
              className="mono"
              value={konfig.bisLevel}
              onChange={(e) => setKonfig((k) => ({ ...k, bisLevel: Number(e.target.value) }))}
            >
              {stufen.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="pruef-feld pruef-feld-schalter">
            <input
              type="checkbox"
              checked={konfig.mitTimer}
              onChange={(e) => setKonfig((k) => ({ ...k, mitTimer: e.target.checked }))}
            />
            <span>Zeit begrenzen</span>
          </label>

          <label className="pruef-feld" data-aus={!konfig.mitTimer}>
            <span>Minuten</span>
            <select
              className="mono"
              value={konfig.minuten}
              disabled={!konfig.mitTimer}
              onChange={(e) => setKonfig((k) => ({ ...k, minuten: Number(e.target.value) }))}
            >
              {MINUTEN_OPTIONEN.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="leise pruef-verfuegbar">
          {imBereich === 0
            ? 'In diesem Bereich gibt es keine Aufgaben.'
            : `Im gewählten Bereich stehen ${imBereich} Aufgaben zur Auswahl; gezogen werden ${Math.min(
                konfig.anzahl,
                imBereich,
              )}, gleichmäßig über die Stufen verteilt.`}
        </p>

        <div className="land-cta">
          <button
            className="knopf knopf-primaer knopf-gross"
            onClick={starten}
            disabled={imBereich === 0}
          >
            Prüfung starten
          </button>
          <Link href="/lektionen" className="knopf knopf-gross">
            Lieber üben
          </Link>
        </div>

        {log.length > 0 && (
          <section className="pruef-log">
            <div className="pruef-log-kopf">
              <h2>Letzte Durchgänge</h2>
              <button
                className="knopf knopf-still"
                onClick={() => {
                  if (confirm('Den Prüfungslog löschen? Der Fortschritt bleibt.')) {
                    logLeeren();
                    setLog([]);
                  }
                }}
              >
                Log leeren
              </button>
            </div>

            {schwach.length > 0 && (
              <p className="leise pruef-log-lead">
                Am häufigsten danebengegangen:{' '}
                {schwach.slice(0, 3).map((s, i) => (
                  <span key={s.level}>
                    {i > 0 && ', '}
                    <Link href={`/uebung/${s.level}`}>Stufe {s.level}</Link> ({s.daneben}×)
                  </span>
                ))}
                . Gespeichert werden nur die Ergebnisse, nicht deine Eingaben.
              </p>
            )}

            <ol className="pruef-liste">
              {log.map((lauf) => {
                const richtig = lauf.ergebnisse.filter((e) => e.stand === 'korrekt').length;
                const datum = new Date(lauf.erstellt).toLocaleString('de-DE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });
                return (
                  <li key={lauf.id}>
                    <details className="pruef-zeile" data-ton={tonVon(lauf)}>
                      <summary>
                        <span className="mono pruef-log-score">
                          {richtig}/{lauf.ergebnisse.length}
                        </span>
                        <span className="pruef-punkte" aria-hidden="true">
                          {lauf.ergebnisse.map((e, i) => (
                            <span key={i} className="pruef-punkt" data-stand={e.stand} />
                          ))}
                        </span>
                        <span className="pruef-log-meta mono leise">
                          Stufe {lauf.konfig.vonLevel}
                          {lauf.konfig.bisLevel !== lauf.konfig.vonLevel &&
                            `–${lauf.konfig.bisLevel}`}{' '}
                          · {lauf.konfig.minuten ? `${lauf.konfig.minuten} min` : 'ohne Limit'} ·{' '}
                          {alsUhrzeit(lauf.dauer)}
                        </span>
                        <span className="mono leise pruef-log-datum">{datum}</span>
                      </summary>

                      <div className="pruef-zeile-inhalt">
                        <ol className="pruef-log-details">
                          {lauf.ergebnisse.map((e, i) => (
                            <li key={`${e.id}-${i}`} data-stand={e.stand}>
                              <span className="mono pruef-zeile-nr">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="pruef-log-titel">
                                {tasks.find((t) => t.id === e.id)?.titel ?? e.id}
                              </span>
                              <span className="mono leise">Stufe {e.level}</span>
                              <span className="pruef-zeile-marke">{MARKE[e.stand]}</span>
                              {e.meldung && (
                                <span className="pruef-log-grund leise">{e.meldung}</span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════ Auswertung ══

  if (phase === 'wertet') {
    return (
      <div className="start">
        <header className="start-kopf">
          <h1>Wird ausgewertet …</h1>
          <p className="lead leise">
            Jede Antwort läuft gegen den Datenstand ihrer Stufe. Bei mehreren Stufen
            dauert das einen Moment.
          </p>
        </header>
      </div>
    );
  }

  if (phase === 'fertig') {
    const bearbeitet = ergebnisse.filter((e) => e.sql).length;
    const richtig = ergebnisse.filter((e) => e.urteil?.korrekt).length;
    const note = einordnung(richtig, ergebnisse.length);
    const schwachJetzt = [
      ...new Set(ergebnisse.filter((e) => !e.urteil?.korrekt).map((e) => e.task.level)),
    ].sort((a, b) => a - b);

    return (
      <div className="start">
        <header className="start-kopf">
          <Link href="/lektionen" className="zurueck">
            ← Übersicht
          </Link>
          <h1>Auswertung</h1>
        </header>

        <div className="pruef-note" data-ton={note.ton}>
          <div className="pruef-note-zahl mono">
            {richtig} / {ergebnisse.length}
          </div>
          <div>
            <p className="pruef-note-text">{note.text}</p>
            <p className="leise mono">
              {bearbeitet} von {ergebnisse.length} bearbeitet · Dauer {alsUhrzeit(dauer)}
              {gutgeschrieben > 0 &&
                ` · ${gutgeschrieben} neu gelöste ${
                  gutgeschrieben === 1 ? 'Aufgabe' : 'Aufgaben'
                } im Fortschritt gutgeschrieben`}
            </p>
          </div>
        </div>

        {schwachJetzt.length > 0 && (
          <p className="lead">
            Nicht gesessen hat es bei{' '}
            {schwachJetzt.map((l, i) => (
              <span key={l}>
                {i > 0 && ', '}
                <Link href={`/uebung/${l}`}>Stufe {l}</Link>
              </span>
            ))}
            .
          </p>
        )}

        <ol className="pruef-liste">
          {ergebnisse.map((e, i) => {
            const zustand = standVon(e);
            return (
              <li key={e.task.id}>
                <details className="pruef-zeile" data-zustand={zustand}>
                  <summary>
                    <span className="mono pruef-zeile-nr">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="pruef-zeile-titel">{e.task.titel}</span>
                    <span className="mono leise">Stufe {e.task.level}</span>
                    <span className="pruef-zeile-marke">{MARKE[zustand]}</span>
                  </summary>

                  <div className="pruef-zeile-inhalt">
                    <p className="aufgabentext">{e.task.aufgabe}</p>

                    {!e.sql && <p className="leise">Nicht bearbeitet.</p>}

                    {e.fehler && (
                      <div className="verdikt" data-art="fehler">
                        <span className="verdikt-zeichen mono">!</span>
                        <div>
                          <div className="verdikt-kopf">Die Query lief nicht durch.</div>
                          <pre>{e.fehler}</pre>
                        </div>
                      </div>
                    )}

                    {e.urteil && (
                      <div
                        className="verdikt"
                        data-art={e.urteil.korrekt ? 'korrekt' : 'falsch'}
                      >
                        <span className="verdikt-zeichen mono">
                          {e.urteil.korrekt ? '✓' : '✗'}
                        </span>
                        <div>
                          <div className="verdikt-kopf">{e.urteil.meldung}</div>
                          {e.urteil.details && (
                            <ul>
                              {e.urteil.details.map((d, j) => (
                                <li key={j}>{d}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {e.sql && (
                      <div className="loesungsblock">
                        <div className="kappe">Deine Antwort</div>
                        <pre className="mono">{e.sql.trim()}</pre>
                      </div>
                    )}

                    <div className="loesungsblock">
                      <div className="kappe">Musterlösung – eine von mehreren möglichen</div>
                      <pre className="mono">{e.task.loesung.trim()}</pre>
                    </div>

                    <Link href={`/uebung/${e.task.level}`} className="knopf knopf-still">
                      Stufe {e.task.level} im Lernmodus öffnen →
                    </Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>

        <p className="leise pruef-log-lead">
          Im Log bleiben nur die Ergebnisse dieses Durchgangs stehen – deine Antworten
          oben siehst du nur jetzt.
        </p>

        <div className="land-cta">
          <button className="knopf knopf-primaer" onClick={() => setPhase('konfig')}>
            Noch eine Prüfung
          </button>
          <Link href="/lektionen" className="knopf">
            Zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════ Bearbeitung ══

  if (!aufgabe) return null;

  const restSekunden = endeBei ? Math.max(0, Math.round((endeBei - jetzt) / 1000)) : null;
  const knapp = restSekunden !== null && restSekunden <= 120;
  const bearbeitetAnzahl = aufgaben.filter((t) =>
    (antworten[t.id] ?? '').replace(/--[^\n]*/g, '').trim(),
  ).length;
  const sql = antworten[aufgabe.id] ?? START_SQL;
  const datenstandBereit = schemaLevel === aufgabe.level;

  return (
    <div className="huelle">
      <header className="kopf">
        <span className="zurueck mono">Prüfung läuft</span>
        <h1>
          Aufgabe {aktiv + 1} von {aufgaben.length} · Stufe {aufgabe.level}
        </h1>
        <div className="kopf-werkzeuge">
          {restSekunden !== null && (
            <span className="uhr mono" data-knapp={knapp}>
              {alsUhrzeit(restSekunden)}
            </span>
          )}
          <span className="stand mono">{bearbeitetAnzahl} bearbeitet</span>
          <button className="knopf" onClick={abgeben}>
            Abgeben
          </button>
        </div>
      </header>

      <nav className="rail" aria-label="Aufgaben dieser Prüfung">
        <div className="stufe">
          <div className="stufe-kopf">
            <span className="nr">Prüfung</span>
            <span>
              Stufe {aufgaben[0].level}–{aufgaben[aufgaben.length - 1].level}
            </span>
          </div>
          <p className="stufe-was">
            Keine Hinweise, keine Lösung. Auswertung erst nach dem Abgeben.
          </p>
        </div>

        {aufgaben.map((t, i) => (
          <button
            key={t.id}
            className="aufgabe-knopf"
            data-aktiv={i === aktiv}
            onClick={() => setAktiv(i)}
          >
            <span className="zahl mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="titel">{t.titel}</span>
            <span className="haken">
              {(antworten[t.id] ?? '').replace(/--[^\n]*/g, '').trim() ? '•' : ''}
            </span>
          </button>
        ))}
      </nav>

      <main className="buehne">
        <div className="aufgabenkopf">
          <div className="marke mono">
            Stufe {aufgabe.level} · {lektionFuerLevel(aufgabe.level)?.titel}
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
          onAusfuehren={nurAusfuehrenStabil}
          schema={datenstandBereit ? schema : []}
        />

        <div className="steuerung">
          <button
            className="knopf knopf-primaer"
            onClick={nurAusfuehren}
            disabled={probe.art === 'laeuft' || !datenstandBereit}
          >
            {probe.art === 'laeuft'
              ? 'Läuft …'
              : datenstandBereit
                ? 'Ausführen'
                : 'Datenstand wird gebaut …'}
          </button>
          <button
            className="knopf"
            onClick={() => setAktiv((i) => Math.max(0, i - 1))}
            disabled={aktiv === 0}
          >
            ← Zurück
          </button>
          <button
            className="knopf"
            onClick={() => setAktiv((i) => Math.min(aufgaben.length - 1, i + 1))}
            disabled={aktiv === aufgaben.length - 1}
          >
            Weiter →
          </button>
          <span className="tastenhinweis mono">⌘/Strg + ⏎</span>
        </div>

        {probe.art === 'fehler' && (
          <div className="verdikt" data-art="fehler" role="status">
            <span className="verdikt-zeichen mono">!</span>
            <div>
              <div className="verdikt-kopf">{probe.kopf}</div>
              <pre>{probe.text}</pre>
            </div>
          </div>
        )}

        {probe.art === 'ergebnis' && probe.daten.felder.length === 0 && (
          <div className="verdikt" data-art="neutral" role="status">
            <span className="verdikt-zeichen mono">›</span>
            <div>
              <div className="verdikt-kopf">
                {probe.daten.anweisungen === 1
                  ? 'Anweisung lief durch, kein Ergebnis mit Spalten.'
                  : `${probe.daten.anweisungen} Anweisungen liefen durch.`}
              </div>
            </div>
          </div>
        )}

        {probe.art === 'ergebnis' && probe.daten.felder.length > 0 && (
          <div className="tabellen">
            <Ergebnistabelle titel="Ergebnis (ungeprüft)" ergebnis={probe.daten} />
          </div>
        )}
      </main>

      <SchemaPanel tabellen={schema} level={aufgabe.level} />
    </div>
  );
}
