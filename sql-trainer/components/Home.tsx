'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { lektionen } from '@/lib/lektionen';
import { migrations } from '@/lib/migrations';
import { tasks } from '@/lib/tasks';
import { ladeGeloest, ladeGelesen, allesZuruecksetzen } from '@/lib/fortschritt';

export default function Home() {
  const [geloest, setGeloest] = useState<string[]>([]);
  const [gelesen, setGelesen] = useState<number[]>([]);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    setGeloest(ladeGeloest());
    setGelesen(ladeGelesen());
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

  return (
    <div className="start">
      <header className="start-kopf">
        <h1>SQL-Prüfstand</h1>
        <p className="lead">
          SQL an einem Gebrauchtwagen-Marktplatz lernen. Neun Stufen, jede mit
          einer Einführung und acht Aufgaben. Der Datensatz wächst mit: Was du auf
          Stufe 1 gelernt hast, brauchst du auf Stufe 7 noch.
        </p>
        <p className="lead leise">
          Die Datenbank läuft in deinem Browser. Nichts wird hochgeladen, nichts
          kann kaputtgehen.
        </p>
      </header>

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

      <section className="frei-karte">
        <div>
          <h2>Freier Modus</h2>
          <p>
            Ein leerer Editor auf demselben Datensatz – ohne Aufgabe, ohne Prüfung.
            Du wählst, welchen Datenstand du lädst, und darfst dort auch schreiben:
            INSERT, UPDATE, CREATE TABLE, alles. Ein Knopf baut jederzeit wieder auf.
          </p>
        </div>
        <Link href="/frei" className="knopf knopf-primaer">
          Editor öffnen
        </Link>
      </section>

      {geladen && gesamtGeloest > 0 && (
        <footer className="start-fuss">
          <button
            className="knopf knopf-still"
            onClick={() => {
              if (confirm('Gelöste Aufgaben und gespeicherte Queries löschen?')) {
                allesZuruecksetzen();
                setGeloest([]);
                setGelesen([]);
              }
            }}
          >
            Fortschritt zurücksetzen
          </button>
        </footer>
      )}
    </div>
  );
}
