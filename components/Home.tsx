'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { lektionen } from '@/lib/lektionen';
import { migrations } from '@/lib/migrations';
import { tasks } from '@/lib/tasks';
import {
  ladeGeloest,
  ladeGelesen,
  ladeEntwuerfe,
  ladeLog,
  allesZuruecksetzen,
  sicherungHerunterladen,
  standEinlesen,
} from '@/lib/fortschritt';

export default function Home() {
  const [geloest, setGeloest] = useState<string[]>([]);
  const [gelesen, setGelesen] = useState<number[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [meldung, setMeldung] = useState<{ ton: 'ok' | 'fehler'; text: string } | null>(
    null,
  );
  // V7.1: Zwei Schritte statt eines Browser-Dialogs. Ein confirm() klickt man
  // reflexhaft weg; diese Abfrage steht auf der Seite und sagt, was weg ist.
  const [loeschenOffen, setLoeschenOffen] = useState(false);
  const [bestand, setBestand] = useState({ entwuerfe: 0, laeufe: 0 });
  const dateiFeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGeloest(ladeGeloest());
    setGelesen(ladeGelesen());
    setBestand({
      entwuerfe: Object.keys(ladeEntwuerfe()).length,
      laeufe: ladeLog().length,
    });
    setGeladen(true);
  }, []);

  const stufen = useMemo(
    () =>
      lektionen.map((l) => {
        const eigene = tasks.filter((t) => t.level === l.level);
        const fertig = eigene.filter((t) => geloest.includes(t.id)).length;
        return {
          lektion: l,
          migration: migrations.find((m) => m.level === l.level),
          gesamt: eigene.length,
          fertig,
          gelesen: gelesen.includes(l.level),
        };
      }),
    [geloest, gelesen],
  );

  // Empfehlung: die erste Stufe, die noch nicht vollstaendig geloest ist.
  const empfohlen = stufen.find((s) => s.fertig < s.gesamt)?.lektion.level ?? null;
  const gesamtGeloest = geloest.length;
  const alleFertig = gesamtGeloest >= tasks.length;

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = ''; // damit dieselbe Datei erneut gewählt werden kann
    if (!datei) return;
    const ergebnis = standEinlesen(await datei.text());
    if (!ergebnis.ok) {
      setMeldung({ ton: 'fehler', text: ergebnis.fehler });
      return;
    }
    setGeloest(ladeGeloest());
    setGelesen(ladeGelesen());
    setBestand({
      entwuerfe: Object.keys(ladeEntwuerfe()).length,
      laeufe: ladeLog().length,
    });

    const teile: string[] = [];
    if (ergebnis.geloestDazu)
      teile.push(
        `${ergebnis.geloestDazu} gelöste ${
          ergebnis.geloestDazu === 1 ? 'Aufgabe' : 'Aufgaben'
        }`,
      );
    if (ergebnis.entwuerfeDazu)
      teile.push(
        `${ergebnis.entwuerfeDazu} ${ergebnis.entwuerfeDazu === 1 ? 'Entwurf' : 'Entwürfe'}`,
      );
    if (ergebnis.laeufeDazu)
      teile.push(
        `${ergebnis.laeufeDazu} ${
          ergebnis.laeufeDazu === 1 ? 'Prüfungsdurchgang' : 'Prüfungsdurchgänge'
        }`,
      );

    setMeldung({
      ton: 'ok',
      text: teile.length
        ? `Eingelesen: ${teile.join(', ')} dazugekommen.`
        : 'Eingelesen – es war nichts Neues dabei.',
    });
  }

  return (
    <div className="start">
      <header className="start-kopf">
        <Link href="/" className="zurueck">
          ← Start
        </Link>
        <h1>Alle Stufen</h1>
        <p className="lead">
          SQL an einem Gebrauchtwagen-Marktplatz lernen. Neun Stufen, jede mit einer
          Einführung und acht Aufgaben. Der Datensatz wächst mit: Was du auf Stufe 1
          gelernt hast, brauchst du auf Stufe 7 noch.
        </p>
        <p className="lead leise">
          Die Datenbank läuft in deinem Browser. Nichts wird hochgeladen, nichts kann
          kaputtgehen.
        </p>
      </header>

      {/* V7.1: Die beiden Modi stehen nebeneinander über die volle Breite,
          zwischen Einleitung und Fortschritt - statt schmal in der rechten Spalte. */}
      <div className="modus-karten">
        <aside className="frei-karte">
          <h2>Prüfung</h2>
          <p>
            Zufällige Aufgaben quer über die Stufen, auf Wunsch mit Zeitlimit. Keine
            Hinweise, keine Lösung – die Auswertung kommt erst am Ende. Die Ergebnisse
            landen im Prüfungslog.
          </p>
          <Link href="/pruefung" className="knopf knopf-primaer">
            Prüfung starten
          </Link>
        </aside>

        <aside className="frei-karte">
          <h2>Freier Modus</h2>
          <p>
            Leerer Editor ohne Aufgabe und Prüfung. Datenstand frei wählbar, schreiben
            erlaubt – ein Knopf baut alles wieder auf.
          </p>
          <Link href="/frei" className="knopf">
            Editor öffnen
          </Link>
        </aside>
      </div>

      {geladen && (
        <div className="start-stand">
          <span className="mono">
            {gesamtGeloest} / {tasks.length} Aufgaben gelöst
          </span>
          {alleFertig ? (
            <span className="fertig-hinweis">Alle durch. Respekt.</span>
          ) : empfohlen && gesamtGeloest > 0 ? (
            <span className="leise">Weiter bei Stufe {empfohlen}.</span>
          ) : (
            <span className="leise">Fang bei Stufe 1 an, wenn du neu bist.</span>
          )}
        </div>
      )}

      <ol className="karten">
        {stufen.map(({ lektion, migration, gesamt, fertig, gelesen: gl }) => {
          const komplett = fertig === gesamt && gesamt > 0;
          const istEmpfehlung = lektion.level === empfohlen && geladen;
          return (
            <li key={lektion.level}>
              <article className="karte" data-empfohlen={istEmpfehlung}>
                <div className="karte-zeile">
                  <span className="karte-nr mono">Stufe {lektion.level}</span>
                  {geladen && komplett && <span className="karte-haken">✓ durch</span>}
                  {istEmpfehlung && !komplett && (
                    <span className="karte-marke">hier weitermachen</span>
                  )}
                </div>

                <h2>{lektion.titel}</h2>
                <p className="karte-kurz">{lektion.kurz}</p>

                <ul className="begriffe">
                  {lektion.begriffe.map((b) => (
                    <li key={b} className="mono">
                      {b}
                    </li>
                  ))}
                </ul>

                <p className="karte-daten mono">
                  + {migration?.label}
                  {geladen && (
                    <>
                      {' · '}
                      {fertig} / {gesamt} gelöst
                    </>
                  )}
                </p>

                <div className="karte-knoepfe">
                  <Link
                    href={`/lektion/${lektion.level}`}
                    className={`knopf ${gl ? '' : 'knopf-primaer'}`}
                  >
                    {gl ? 'Einführung nochmal' : 'Einführung lesen'}
                  </Link>
                  <Link
                    href={`/uebung/${lektion.level}`}
                    className={`knopf ${gl ? 'knopf-primaer' : ''}`}
                  >
                    Zu den Aufgaben
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      {geladen && (
        <footer className="start-fuss">
          <div className="sicherung">
            <p className="leise">
              Dein Fortschritt liegt nur in diesem Browser. Eine Sicherung nimmst du mit
              auf ein anderes Gerät – beim Einlesen wird zusammengeführt, nichts
              überschrieben. Der Prüfungslog ist mit dabei.
            </p>
            <div className="sicherung-knoepfe">
              <button
                className="knopf"
                onClick={sicherungHerunterladen}
                disabled={gesamtGeloest === 0 && gelesen.length === 0}
              >
                Fortschritt sichern
              </button>
              <button className="knopf" onClick={() => dateiFeld.current?.click()}>
                Sicherung einlesen
              </button>
              <input
                ref={dateiFeld}
                type="file"
                accept="application/json,.json"
                onChange={dateiGewaehlt}
                hidden
              />
              {gesamtGeloest > 0 && !loeschenOffen && (
                <button
                  className="knopf knopf-still"
                  onClick={() => {
                    setLoeschenOffen(true);
                    setMeldung(null);
                  }}
                >
                  Fortschritt zurücksetzen
                </button>
              )}
            </div>

            {/* Zweiter Schritt: benennt, was verschwindet, und trennt den
                gefährlichen Knopf räumlich vom harmlosen darüber. */}
            {loeschenOffen && (
              <div className="gefahr" role="alertdialog" aria-label="Fortschritt löschen">
                <p className="gefahr-frage">Wirklich alles löschen?</p>
                <p className="gefahr-was">
                  Weg sind dann {gesamtGeloest}{' '}
                  {gesamtGeloest === 1 ? 'gelöste Aufgabe' : 'gelöste Aufgaben'}
                  {bestand.entwuerfe > 0 &&
                    `, ${bestand.entwuerfe} ${
                      bestand.entwuerfe === 1 ? 'gespeicherte Query' : 'gespeicherte Queries'
                    }`}
                  {bestand.laeufe > 0 &&
                    `, ${bestand.laeufe} ${
                      bestand.laeufe === 1 ? 'Prüfungsdurchgang' : 'Prüfungsdurchgänge'
                    }`}{' '}
                  und die gelesenen Einführungen. Das lässt sich nicht rückgängig machen.
                </p>
                <p className="gefahr-was leise">
                  Sicher dir den Stand vorher, wenn du ihn vielleicht doch noch brauchst.
                </p>
                <div className="gefahr-knoepfe">
                  <button className="knopf" onClick={() => setLoeschenOffen(false)}>
                    Abbrechen
                  </button>
                  <button
                    className="knopf knopf-gefahr"
                    onClick={() => {
                      allesZuruecksetzen();
                      setGeloest([]);
                      setGelesen([]);
                      setBestand({ entwuerfe: 0, laeufe: 0 });
                      setLoeschenOffen(false);
                      setMeldung({ ton: 'ok', text: 'Alles gelöscht. Du fängst neu an.' });
                    }}
                  >
                    Ja, alles löschen
                  </button>
                </div>
              </div>
            )}

            {meldung && (
              <p className="sicherung-meldung" data-ton={meldung.ton}>
                {meldung.text}
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
