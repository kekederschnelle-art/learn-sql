'use client';

import type { QueryResult } from '@/lib/compare';

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

type Props = {
  titel: string;
  ergebnis: QueryResult;
  maxZeilen?: number;
};

export default function Ergebnistabelle({ titel, ergebnis, maxZeilen = 200 }: Props) {
  const { felder, zeilen } = ergebnis;
  const sichtbar = zeilen.slice(0, maxZeilen);

  return (
    <section className="tabellenblock">
      <div className="kappe">
        <span>{titel}</span>
        <span className="zaehlung">
          {zeilen.length} {zeilen.length === 1 ? 'Zeile' : 'Zeilen'} · {felder.length}{' '}
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
          <table className="ergebnis">
            <thead>
              <tr>
                {felder.map((f, i) => (
                  <th key={`${f}-${i}`}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((z, i) => (
                <tr key={i}>
                  {felder.map((f, j) => {
                    const wert = z[f];
                    const leer = wert === null || wert === undefined;
                    return (
                      <td
                        key={`${f}-${j}`}
                        className={leer ? 'null' : istZahl(wert) ? 'zahl' : undefined}
                      >
                        {zeige(wert)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {zeilen.length > sichtbar.length && (
            <p className="leer">
              … {zeilen.length - sichtbar.length} weitere Zeilen werden nicht angezeigt.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
