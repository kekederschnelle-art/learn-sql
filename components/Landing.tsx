'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SqlEditor from './SqlEditor';
import Ergebnistabelle from './Ergebnistabelle';
import type { SchemaTabelle } from './SchemaPanel';
import { lektionen } from '@/lib/lektionen';
import { migrations } from '@/lib/migrations';
import { tasks } from '@/lib/tasks';
import {
  abbrechen,
  dbFuerLevel,
  fehlerKopf,
  fuehreAus,
  schemaLesen,
  type RohErgebnis,
} from '@/lib/db';
import { ladeGeloest } from '@/lib/fortschritt';

const DEMO = `select brand, model, price
from cars
where price < 12000
order by price;`;

type Demo =
  | { art: 'nichts' }
  | { art: 'laeuft'; erstesMal: boolean }
  | { art: 'fehler'; text: string; kopf: string }
  | { art: 'ergebnis'; daten: RohErgebnis };

/**
 * Zaehlt die Tabellen je Stufe direkt aus den Migrationen, statt sie fest
 * hinzuschreiben. Kommt eine Stufe dazu, stimmt die Grafik von selbst.
 */
function wachstum() {
  let bisher = 0;
  return migrations.map((m) => {
    const neu = (m.sql.match(/\bcreate\s+table\b/gi) ?? []).length;
    const eintrag = { level: m.level, label: m.label, konzept: m.freischaltet, alt: bisher, neu };
    bisher += neu;
    return eintrag;
  });
}

export default function Landing() {
  const [sql, setSql] = useState(DEMO);
  const [demo, setDemo] = useState<Demo>({ art: 'nichts' });
  const [dbBereit, setDbBereit] = useState(false);
  const [geloest, setGeloest] = useState<string[]>([]);
  const [schema, setSchema] = useState<SchemaTabelle[]>([]);

  useEffect(() => setGeloest(ladeGeloest()), []);

  const stufen = useMemo(wachstum, []);
  const abschnitte = useMemo(
    () => lektionen.reduce((n, l) => n + l.abschnitte.length, 0),
    [],
  );

  // Wo weitermachen: erste Stufe, die noch nicht vollstaendig geloest ist.
  const weiter = useMemo(() => {
    if (geloest.length === 0) return null;
    for (const l of lektionen) {
      const eigene = tasks.filter((t) => t.level === l.level);
      if (eigene.some((t) => !geloest.includes(t.id))) return l.level;
    }
    return null;
  }, [geloest]);

  // Die Datenbank (rund 3 MB WebAssembly) wird erst beim ersten Klick geladen,
  // nicht beim Seitenaufruf. Wer nur liest, laedt sie nie.
  const ausfuehren = useCallback(async () => {
    if (!sql.trim()) return;
    setDemo({ art: 'laeuft', erstesMal: !dbBereit });
    try {
      const db = await dbFuerLevel(1);
      setDbBereit(true);
      setDemo({ art: 'ergebnis', daten: await fuehreAus(db, sql) });
      // Ab jetzt kennt die Autovervollständigung im Demo-Editor die Tabellen.
      if (!schema.length) setSchema(await schemaLesen(db));
    } catch (f) {
      setDemo({ art: 'fehler', text: (f as Error).message, kopf: fehlerKopf(f) });
    }
  }, [sql, dbBereit, schema.length]);

  const maxTabellen = Math.max(...stufen.map((s) => s.alt + s.neu));

  return (
    <div className="landing">
      <nav className="land-nav">
        <Link href="/" className="land-logo">
          SQL-Prüfstand
        </Link>
        <div className="land-links">
          <Link href="/lektionen">Lektionen</Link>
          <Link href="/pruefung">Prüfung</Link>
          <Link href="/frei">Freier Modus</Link>
          <Link
            href={weiter ? `/uebung/${weiter}` : '/lektion/1'}
            className="knopf knopf-primaer"
          >
            {weiter ? 'Weitermachen' : 'Loslegen'}
          </Link>
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────── Hero ── */}
      <header className="land-hero">
        <div className="land-hero-text">
          <p className="land-eyebrow mono">Ein Datensatz · {stufen.length} Stufen</p>
          <h1>
            SQL lernen, das
            <br />
            aufeinander aufbaut.
            <span className="land-h1-zweit">Von SELECT bis CREATE TABLE.</span>
          </h1>
          <p className="land-lead">
            Du arbeitest die ganze Zeit am selben Gebrauchtwagen-Marktplatz. Mit jeder
            Stufe kommen Tabellen dazu – und was du auf Stufe 1 lernst, brauchst du auf
            Stufe {stufen.length} noch.
          </p>

          <dl className="land-zahlen">
            <div>
              <dt className="mono">Stufen</dt>
              <dd>{lektionen.length}</dd>
            </div>
            <div>
              <dt className="mono">Aufgaben</dt>
              <dd>{tasks.length}</dd>
            </div>
            <div>
              <dt className="mono">Lektionsabschnitte</dt>
              <dd>{abschnitte}</dd>
            </div>
            <div>
              <dt className="mono">Anmeldung</dt>
              <dd>keine</dd>
            </div>
          </dl>

          <div className="land-cta">
            {weiter ? (
              <>
                <Link href={`/uebung/${weiter}`} className="knopf knopf-primaer knopf-gross">
                  Weiter bei Stufe {weiter}
                </Link>
                <Link href="/lektionen" className="knopf knopf-gross">
                  Alle Stufen
                </Link>
              </>
            ) : (
              <>
                <Link href="/lektion/1" className="knopf knopf-primaer knopf-gross">
                  Mit Stufe 1 anfangen
                </Link>
                <Link href="/lektionen" className="knopf knopf-gross">
                  Alle Stufen ansehen
                </Link>
              </>
            )}
          </div>
        </div>

        <section className="land-demo" aria-label="SQL direkt ausprobieren">
          <div className="land-demo-kopf">
            <span>Direkt ausprobieren</span>
            <span className="mono leise">Datenstand: Stufe 1</span>
          </div>
          <SqlEditor
            wert={sql}
            onChange={setSql}
            onAusfuehren={ausfuehren}
            schema={schema}
          />
          <div className="land-demo-fuss">
            <button
              className="knopf knopf-primaer"
              onClick={ausfuehren}
              disabled={demo.art === 'laeuft'}
            >
              {demo.art === 'laeuft'
                ? demo.erstesMal
                  ? 'Postgres startet …'
                  : 'Läuft …'
                : 'Ausführen'}
            </button>
            {demo.art === 'laeuft' && (
              <button className="knopf knopf-gefahr" onClick={abbrechen}>
                Abbrechen
              </button>
            )}
            <span className="leise">Die Abfrage darfst du ändern.</span>
          </div>

          {demo.art === 'fehler' && (
            <div className="verdikt" data-art="fehler" role="status">
              <span className="verdikt-zeichen mono">!</span>
              <div>
                <div className="verdikt-kopf">{demo.kopf}</div>
                <pre>{demo.text}</pre>
              </div>
            </div>
          )}
          {demo.art === 'ergebnis' && (
            <Ergebnistabelle titel="Ergebnis" ergebnis={demo.daten} maxZeilen={8} />
          )}
        </section>
      </header>

      {/* ──────────────────────────────────────────── Das Kernargument ── */}
      <section className="land-block">
        <h2>Alles baut aufeinander auf</h2>
        <p className="land-block-lead">
          Keine neue Spielzeugtabelle pro Aufgabe. Ein einziger Datensatz, der mit dir
          wächst – deshalb kennst du ihn auf Stufe {stufen.length} in- und auswendig.
        </p>

        <ol className="wachstum" style={{ ['--max' as string]: maxTabellen }}>
          {stufen.map((s) => (
            <li key={s.level} className="wachstum-stufe">
              <div className="stapel" aria-hidden="true">
                {s.level === stufen.length && s.neu === 0 && (
                  <span className="block block-eigen" title="deine eigenen Tabellen" />
                )}
                {Array.from({ length: s.neu }).map((_, i) => (
                  <span key={`n${i}`} className="block block-neu" />
                ))}
                {Array.from({ length: s.alt }).map((_, i) => (
                  <span key={`a${i}`} className="block" />
                ))}
              </div>
              <div className="wachstum-text">
                <span className="mono wachstum-nr">Stufe {s.level}</span>
                <span className="wachstum-label mono">+ {s.label}</span>
                <span className="wachstum-konzept">{s.konzept}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="wachstum-legende leise">
          <span className="block block-neu" aria-hidden="true" /> neu in dieser Stufe
          <span className="block" aria-hidden="true" /> schon da
          <span className="block block-eigen" aria-hidden="true" /> baust du selbst
        </p>
      </section>

      {/* ──────────────────────────────────────────── So lernst du ── */}
      <section className="land-block">
        <h2>So läuft eine Stufe ab</h2>
        <div className="ablauf">
          <article>
            <span className="mono ablauf-nr">01</span>
            <h3>Erst verstehen</h3>
            <p>
              Jede Stufe beginnt mit einer Einführung in kurzen Abschnitten. Jedes
              Beispiel läuft echt gegen den Datensatz – und du kannst es ändern.
            </p>
            <div className="ablauf-probe falle">
              <span className="falle-marke mono">Typische Falle</span>
              <p>
                <code>where count(*) &gt;= 2</code> lehnt Postgres ab.{' '}
                <code>where</code> filtert Zeilen, <code>having</code> filtert Gruppen.
              </p>
            </div>
          </article>

          <article>
            <span className="mono ablauf-nr">02</span>
            <h3>Dann selbst schreiben</h3>
            <p>
              Acht Aufgaben pro Stufe. Wer hängt, holt sich Hinweise – einen nach dem
              anderen, vom groben Stups bis zur fast fertigen Lösung.
            </p>
            <div className="ablauf-probe hinweisliste">
              <p>
                <span className="zaehler mono">1. </span>Nach der Gruppierung filtern
                heißt HAVING, nicht WHERE.
              </p>
            </div>
          </article>

          <article>
            <span className="mono ablauf-nr">03</span>
            <h3>Genaues Feedback</h3>
            <p>
              Deine Abfrage wird gegen eine Musterlösung geprüft. Statt nur „falsch"
              erfährst du, was genau nicht stimmt.
            </p>
            <div className="ablauf-probe verdikt" data-art="falsch">
              <span className="verdikt-zeichen mono">✗</span>
              <div>
                <div className="verdikt-kopf">Richtige Daten, falsche Sortierung.</div>
                <ul>
                  <li>Alle Zeilen stimmen – nur das ORDER BY passt noch nicht.</li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ──────────────────────────────────────────── Prüfungsmodus ── */}
      <section className="land-block">
        <h2>Und dann: Prüfung</h2>
        <p className="land-block-lead">
          Aufgaben in der Reihenfolge zu lösen, in der sie erklärt wurden, ist etwas
          anderes, als sie zu können. Der Prüfungsmodus zieht zufällig quer über die
          Stufen – da hilft dir nicht mehr, dass gerade das Kapitel über JOINs oben steht.
        </p>

        <div className="pruef-merkmale">
          <article>
            <h3>Du stellst sie dir selbst zusammen</h3>
            <p>
              Fünf bis zwanzig Aufgaben, Stufenbereich frei wählbar, Zeitlimit an oder
              aus. Vor der Klausur nimmst du genau die Stufen, die drankommen.
            </p>
          </article>
          <article>
            <h3>Kein Feedback zwischendurch</h3>
            <p>
              Keine Hinweise, keine Musterlösung, kein Häkchen. Du darfst deine Query
              ausführen und dir das Ergebnis ansehen – ob es das richtige ist, erfährst
              du nicht. Zwischen den Aufgaben springen geht jederzeit.
            </p>
          </article>
          <article>
            <h3>Auswertung am Ende</h3>
            <p>
              Erst nach dem Abgeben läuft alles gegen die Musterlösungen: was stimmt,
              was nicht, und woran es lag – aufklappbar pro Aufgabe, mit deiner Antwort
              und der Lösung nebeneinander. Was du richtig hattest, zählt zum Fortschritt.
            </p>
          </article>
        </div>

        <div className="land-cta">
          <Link href="/pruefung" className="knopf knopf-primaer">
            Prüfung zusammenstellen
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────── Schluss ── */}
      <section className="land-schluss">
        <div>
          <h2>Fang bei Stufe 1 an – oder dort, wo du stehst.</h2>
          <p className="leise">
            Postgres läuft per WebAssembly in deinem Browser. Nichts wird hochgeladen,
            dein Fortschritt bleibt auf deinem Gerät.
          </p>
        </div>
        <div className="land-cta">
          <Link href="/lektion/1" className="knopf knopf-primaer knopf-gross">
            Mit Stufe 1 anfangen
          </Link>
          <Link href="/pruefung" className="knopf knopf-gross">
            Prüfung
          </Link>
          <Link href="/frei" className="knopf knopf-gross">
            Freier Modus
          </Link>
        </div>
      </section>
    </div>
  );
}
