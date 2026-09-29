'use client';

import { zeilenAnzahl, type QueryResult, type TabellenMarkierung } from '@/lib/compare';

function istZahl(v: unknown) {
  if (typeof v === 'number' || typeof v === 'bigint') return true;
  return typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim());
}

function zeige(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) return v.toISOString().replace('T', ' ').replace('.000Z', '');
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const ZEILEN_TITEL = {
  extra: 'Diese Zeile gehört nicht ins Ergebnis',
  fehlt: 'Diese Zeile fehlt in deinem Ergebnis',
  verschoben: 'Richtige Zeile, aber an falscher Position',
} as const;

type Props = {
  titel: string;
  ergebnis: QueryResult;
  maxZeilen?: number;
  /** V6: Abweichungen zur anderen Tabelle, die hervorgehoben werden. */
  markierung?: TabellenMarkierung | null;
};

export default function Ergebnistabelle({ titel, ergebnis, maxZeilen = 200, markierung }: Props) {
  const { felder, zeilen } = ergebnis;
  const sichtbar = zeilen.slice(0, maxZeilen);
  const gesamt = zeilenAnzahl(ergebnis);
  const gegenseite = markierung?.ton === 'ist' ? 'Erwartet' : 'Deins';

  return (
    <section className="tabellenblock">
      <div className="kappe">
        <span>{titel}</span>
        <span className="zaehlung">
          {gesamt.toLocaleString('de-DE')} {gesamt === 1 ? 'Zeile' : 'Zeilen'} · {felder.length}{' '}
          {felder.length === 1 ? 'Spalte' : 'Spalten'}
        </span>
      </div>

      {felder.length === 0 ? (
        <div className="tabellenhuelle">
          <p className="leer">
            Kein Ergebnis mit Spalten. Die Aufgaben erwarten alle ein SELECT.
          </p>
        </div>
      ) : (
        <div className="tabellenhuelle">
          <table className="ergebnis" data-ton={markierung?.ton}>
            <thead>
              <tr>
                {felder.map((f, j) => (
                  <th
                    key={`${f}-${j}`}
                    className={markierung?.spalten.has(j) ? 'abw-spalte' : undefined}
                  >
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((z, i) => {
                const zeilenArt = markierung?.zeilen.get(i);
                return (
                  <tr
                    key={i}
                    data-abw={zeilenArt}
                    title={zeilenArt ? ZEILEN_TITEL[zeilenArt] : undefined}
                  >
                    {felder.map((f, j) => {
                      const wert = z[f];
                      const leer = wert === null || wert === undefined;
                      const schluessel = `${i}:${j}`;
                      const abw = markierung?.zellen.has(schluessel) ?? false;
                      const klassen = [
                        leer ? 'null' : istZahl(wert) ? 'zahl' : '',
                        abw ? 'abw' : '',
                        markierung?.spalten.has(j) ? 'abw-spalte' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <td
                          key={`${f}-${j}`}
                          className={klassen || undefined}
                          title={
                            abw
                              ? `${gegenseite}: ${zeige(markierung!.zellen.get(schluessel))}`
                              : undefined
                          }
                        >
                          {zeige(wert)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gesamt > sichtbar.length && (
            <p className="leer">
              … {(gesamt - sichtbar.length).toLocaleString('de-DE')} weitere Zeilen werden
              nicht angezeigt.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
