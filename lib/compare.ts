/**
 * Vergleicht das Ergebnis der Nutzer-Query mit dem der Musterloesung.
 *
 * Tolerant gegenueber:
 *   - Spaltennamen / Aliasen   (preis vs. p vs. "Preis")  - Namen werden nie verglichen
 *   - Zahlformat               ("12900.00" numeric-String vs. 12900)
 *   - Zeilenreihenfolge        nur wenn die Aufgabe kein ORDER BY verlangt
 *
 * Streng gegenueber:
 *   - Spaltenanzahl und Spaltenreihenfolge
 *   - Zeilenanzahl
 *   - jedem einzelnen Wert
 *
 * Warum Spaltenreihenfolge streng: wuerde man Spalten anhand ihrer Werte
 * einander zuordnen, gingen vertauschte Spalten gleichen Typs als richtig
 * durch (name/stadt statt stadt/name). Stattdessen wird positionsweise
 * verglichen und der Reihenfolgefehler eigens gemeldet.
 */

export type QueryResult = {
  felder: string[];
  zeilen: Record<string, unknown>[];
};

export type VergleichsErgebnis = {
  korrekt: boolean;
  meldung: string;
  details?: string[];
};

const NULL_MARKER = '\u0000null';
const ZELL_TRENNER = '\u0001';
const SPALT_TRENNER = '\u0002';

function rundeZahl(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return (Math.round(n * 1e6) / 1e6).toString();
}

/** Bringt einen einzelnen Zellwert auf eine vergleichbare Textform. */
function normWert(v: unknown): string {
  if (v === null || v === undefined) return NULL_MARKER;
  if (typeof v === 'boolean') return v ? 'b:true' : 'b:false';
  if (typeof v === 'bigint') return 'n:' + v.toString();
  if (typeof v === 'number') return 'n:' + rundeZahl(v);
  if (v instanceof Date) return 'd:' + v.toISOString();
  if (typeof v === 'string') {
    // Postgres liefert numeric als String. "12900.00" und 12900 sind dasselbe.
    if (/^-?\d+(\.\d+)?$/.test(v.trim())) return 'n:' + rundeZahl(Number(v.trim()));
    return 's:' + v;
  }
  if (typeof v === 'object') {
    try {
      return 'j:' + JSON.stringify(v);
    } catch {
      return 'j:?';
    }
  }
  return 's:' + String(v);
}

/**
 * Zeilen als normalisierte Wertelisten, in Spaltenreihenfolge des Ergebnisses.
 * Zaehlt die Zeilenreihenfolge nicht, werden die Zeilen kanonisch sortiert -
 * und zwar nach ihren *sortierten* Werten, damit das Ergebnis unabhaengig
 * davon ist, in welcher Reihenfolge die Spalten stehen.
 */
function zeilenMatrix(res: QueryResult, reihenfolgeZaehlt: boolean): string[][] {
  const matrix = res.zeilen.map((z) => res.felder.map((f) => normWert(z[f])));
  if (reihenfolgeZaehlt) return matrix;
  return [...matrix].sort((a, b) => {
    const ka = [...a].sort().join(ZELL_TRENNER);
    const kb = [...b].sort().join(ZELL_TRENNER);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

function spaltenVektoren(matrix: string[][], breite: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < breite; i++) {
    out.push(matrix.map((z) => z[i]).join(ZELL_TRENNER));
  }
  return out;
}

const alsText = (v: string[]) => v.join(SPALT_TRENNER);

export function vergleiche(
  erwartet: QueryResult,
  tatsaechlich: QueryResult,
  reihenfolgeZaehlt: boolean,
): VergleichsErgebnis {
  if (erwartet.felder.length !== tatsaechlich.felder.length) {
    return {
      korrekt: false,
      meldung: `Falsche Spaltenanzahl: ${tatsaechlich.felder.length} statt ${erwartet.felder.length}.`,
      details: [
        tatsaechlich.felder.length > erwartet.felder.length
          ? 'Du wählst mehr Spalten aus, als die Aufgabe verlangt.'
          : 'Es fehlt mindestens eine Spalte im SELECT.',
      ],
    };
  }

  if (erwartet.zeilen.length !== tatsaechlich.zeilen.length) {
    const diff = tatsaechlich.zeilen.length - erwartet.zeilen.length;
    return {
      korrekt: false,
      meldung: `Falsche Zeilenanzahl: ${tatsaechlich.zeilen.length} statt ${erwartet.zeilen.length}.`,
      details: [
        diff > 0
          ? `${diff} Zeile(n) zu viel – prüf deine Filterbedingungen, ein fehlendes DISTINCT oder einen JOIN, der Zeilen vervielfacht.`
          : `${-diff} Zeile(n) fehlen – vielleicht filterst du zu streng, oder ein JOIN wirft die NULL-Fälle raus.`,
      ],
    };
  }

  const breite = erwartet.felder.length;
  const mErwartet = zeilenMatrix(erwartet, reihenfolgeZaehlt);
  const mIst = zeilenMatrix(tatsaechlich, reihenfolgeZaehlt);

  const vErwartet = spaltenVektoren(mErwartet, breite);
  const vIst = spaltenVektoren(mIst, breite);

  if (alsText(vErwartet) === alsText(vIst)) {
    return { korrekt: true, meldung: 'Stimmt.' };
  }

  // Ab hier ist etwas falsch. Die Frage ist nur noch: was genau?

  // Fall 1: Alle Spalten sind inhaltlich da, stehen aber woanders.
  if (alsText([...vErwartet].sort()) === alsText([...vIst].sort())) {
    return {
      korrekt: false,
      meldung: 'Richtige Werte, falsche Spaltenreihenfolge.',
      details: [
        'Inhaltlich hast du alles – die Spalten stehen nur nicht in der Reihenfolge, die die Aufgabe vorgibt.',
        'Zieh die Spalten im SELECT in die verlangte Reihenfolge.',
      ],
    };
  }

  // Fall 2: Nur das ORDER BY passt nicht.
  if (reihenfolgeZaehlt) {
    const oErwartet = spaltenVektoren(zeilenMatrix(erwartet, false), breite);
    const oIst = spaltenVektoren(zeilenMatrix(tatsaechlich, false), breite);
    if (alsText(oErwartet) === alsText(oIst)) {
      return {
        korrekt: false,
        meldung: 'Richtige Daten, falsche Sortierung.',
        details: ['Alle Zeilen stimmen – nur das ORDER BY passt noch nicht.'],
      };
    }
  }

  // Fall 3: echte Wertabweichung. Sag, in welcher Spalte.
  const abweichend: number[] = [];
  for (let i = 0; i < breite; i++) {
    if (vErwartet[i] !== vIst[i]) abweichend.push(i + 1);
  }
  const details = ['Zeilen- und Spaltenanzahl stimmen, aber die Werte nicht.'];
  if (abweichend.length && abweichend.length < breite) {
    details.push(
      abweichend.length === 1
        ? `Abweichung in Spalte ${abweichend[0]}.`
        : `Abweichungen in den Spalten ${abweichend.join(', ')}.`,
    );
  }

  return { korrekt: false, meldung: 'Die Werte stimmen nicht.', details };
}
