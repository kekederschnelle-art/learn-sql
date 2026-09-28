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
  /**
   * V7: Postgres-Typ-OID je Spalte, so wie sie aus `fields[].dataTypeID`
   * kommt. Optional, damit aeltere Aufrufer weiter funktionieren.
   */
  typen?: number[];
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
const TIE_TRENNER = '\u0003';

/**
 * V7: Welche Typ-OIDs Postgres als Zahl liefert. numeric und bigint kommen
 * als String an, int4 als number - deshalb muessen beide auf dieselbe Form.
 * int2 21 · int8 20 · int4 23 · oid 26 · float4 700 · float8 701 · numeric 1700
 */
const NUMERISCHE_TYPEN = new Set([20, 21, 23, 26, 700, 701, 1700]);

const ZAHL_MUSTER = /^-?\d+(\.\d+)?$/;

function rundeZahl(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return (Math.round(n * 1e6) / 1e6).toString();
}

/**
 * V7: Pro Spalte entscheiden, ob numerisch verglichen wird - anhand des
 * Postgres-Typs, nicht anhand des Aussehens des Werts.
 *
 * Vorher wurde jeder String, der wie eine Zahl aussieht, zur Zahl gemacht.
 * Damit galten '007' und 7 als gleich, und eine Postleitzahl '01234' als
 * 1234. Das war ein Falsch-POSITIV: eine falsche Loesung ging als richtig
 * durch.
 *
 * Numerisch verglichen wird nur, wenn BEIDE Seiten eine Zahlenspalte
 * liefern. Das deckt den tolerierten Fall ab (int4 kommt als number,
 * numeric und int8 als String - "12900.00" und 12900 sind dieselbe Zahl),
 * schliesst aber den Fall aus, der vorher durchrutschte: eine Textspalte
 * mit '007' gegen eine Zahlenspalte mit 7. Das sind zwei verschiedene
 * Ergebnisse, und die Aufgabe hat nach einem davon gefragt.
 *
 * Fehlt auf einer Seite die Typangabe, gilt die alte Heuristik - besser
 * als ein Vergleich, der an fehlenden Metadaten scheitert.
 */
function numerischeSpalten(
  a: QueryResult,
  b: QueryResult,
  breite: number,
): (boolean | undefined)[] {
  return Array.from({ length: breite }, (_, i) => {
    const ta = a.typen?.[i];
    const tb = b.typen?.[i];
    if (ta === undefined || tb === undefined) return undefined;
    return NUMERISCHE_TYPEN.has(ta) && NUMERISCHE_TYPEN.has(tb);
  });
}

/**
 * Bringt einen einzelnen Zellwert auf eine vergleichbare Textform.
 * `numerisch`: true = Spalte ist eine Zahlenspalte, false = ist sie nicht,
 * undefined = unbekannt, dann die alte Heuristik.
 */
function normWert(v: unknown, numerisch?: boolean): string {
  if (v === null || v === undefined) return NULL_MARKER;
  if (typeof v === 'boolean') return v ? 'b:true' : 'b:false';
  if (typeof v === 'bigint') return 'n:' + v.toString();
  if (typeof v === 'number') return 'n:' + rundeZahl(v);
  if (v instanceof Date) return 'd:' + v.toISOString();
  if (typeof v === 'string') {
    const roh = v.trim();
    if (numerisch === false) return 's:' + v;
    if (ZAHL_MUSTER.test(roh)) return 'n:' + rundeZahl(Number(roh));
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
 *
 * Zaehlt die Zeilenreihenfolge nicht, werden die Zeilen kanonisch sortiert -
 * und zwar nach ihren *sortierten* Werten, damit das Ergebnis unabhaengig
 * davon ist, in welcher Reihenfolge die Spalten stehen.
 *
 * V7: Dieser Schluessel allein war nicht eindeutig. Zwei Zeilen mit derselben
 * Wertemenge in unterschiedlicher Verteilung - ('Munich','Berlin') und
 * ('Berlin','Munich') - bekamen denselben Schluessel. Bei Gleichstand behaelt
 * sort() die Ursprungsreihenfolge bei, und die war zwischen Musterloesung und
 * Eingabe verschieden. Ergebnis: "Die Werte stimmen nicht", obwohl alles
 * richtig war. Deshalb jetzt ein zweiter Schluessel in Spaltenreihenfolge.
 *
 * Preis dafuer: Sind gleichzeitig Spalten vertauscht UND Zeilen gleichstaendig,
 * wird das nicht mehr als reiner Spaltenfehler erkannt, sondern generisch
 * gemeldet. Der haeufige Fall wird richtig, der seltene unschaerfer.
 */
function zeilenMatrix(
  res: QueryResult,
  reihenfolgeZaehlt: boolean,
  numerisch: (boolean | undefined)[],
): string[][] {
  const matrix = res.zeilen.map((z) =>
    res.felder.map((f, i) => normWert(z[f], numerisch[i])),
  );
  if (reihenfolgeZaehlt) return matrix;
  const schluessel = (z: string[]) =>
    [...z].sort().join(ZELL_TRENNER) + TIE_TRENNER + z.join(ZELL_TRENNER);
  return [...matrix].sort((a, b) => {
    const ka = schluessel(a);
    const kb = schluessel(b);
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
  const numerisch = numerischeSpalten(erwartet, tatsaechlich, breite);
  const mErwartet = zeilenMatrix(erwartet, reihenfolgeZaehlt, numerisch);
  const mIst = zeilenMatrix(tatsaechlich, reihenfolgeZaehlt, numerisch);

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
    const oErwartet = spaltenVektoren(zeilenMatrix(erwartet, false, numerisch), breite);
    const oIst = spaltenVektoren(zeilenMatrix(tatsaechlich, false, numerisch), breite);
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

// ═════════════════════════════════════════ V6: Abweichungen markieren ══

/**
 * Was in einer der beiden Tabellen hervorgehoben wird.
 * `ton`: 'ist' = deine Ausgabe (rot), 'soll' = die erwartete Ausgabe (grün).
 */
export type TabellenMarkierung = {
  ton: 'ist' | 'soll';
  /** Abweichende Zellen. Schluessel `${zeile}:${spalte}`, Wert = Gegenstueck der anderen Seite. */
  zellen: Map<string, unknown>;
  /** Ganze Zeilen: zu viel, fehlt, oder an falscher Position. */
  zeilen: Map<number, 'extra' | 'fehlt' | 'verschoben'>;
  /** Spalten, die inhaltlich an anderer Stelle stehen. */
  spalten: Set<number>;
};

export type Abweichungen = {
  eigene: TabellenMarkierung;
  erwartet: TabellenMarkierung;
};

const zeilenText = (z: string[]) => z.join(ZELL_TRENNER);

function leereMarkierung(ton: 'ist' | 'soll'): TabellenMarkierung {
  return { ton, zellen: new Map(), zeilen: new Map(), spalten: new Set() };
}

/**
 * Ermittelt, welche Zellen/Zeilen/Spalten sich zwischen beiden Ergebnissen
 * unterscheiden. Die Indizes beziehen sich auf die Zeilen so, wie sie
 * angezeigt werden - nicht auf eine sortierte Fassung.
 *
 * Gibt null zurueck, wenn sich nichts sinnvoll markieren laesst
 * (unterschiedliche Spaltenanzahl: dann passt keine Zelle zur anderen).
 */
export function abweichungen(
  erwartet: QueryResult,
  tatsaechlich: QueryResult,
  reihenfolgeZaehlt: boolean,
): Abweichungen | null {
  const breite = erwartet.felder.length;
  if (breite === 0 || breite !== tatsaechlich.felder.length) return null;

  const numerisch = numerischeSpalten(erwartet, tatsaechlich, breite);
  const mE = erwartet.zeilen.map((z) =>
    erwartet.felder.map((f, i) => normWert(z[f], numerisch[i])),
  );
  const mI = tatsaechlich.zeilen.map((z) =>
    tatsaechlich.felder.map((f, i) => normWert(z[f], numerisch[i])),
  );
  const roh = (res: QueryResult, zeile: number, spalte: number) =>
    res.zeilen[zeile]?.[res.felder[spalte]];

  const out: Abweichungen = { eigene: leereMarkierung('ist'), erwartet: leereMarkierung('soll') };

  // Fall: Spalten vertauscht. Jede Spalte als Multimenge ihrer Werte - stimmen
  // die Mengen ueberein, nur an anderer Position, werden die Spalten markiert.
  if (mE.length === mI.length) {
    const sig = (m: string[][], j: number) => m.map((z) => z[j]).sort().join(ZELL_TRENNER);
    const sE = Array.from({ length: breite }, (_, j) => sig(mE, j));
    const sI = Array.from({ length: breite }, (_, j) => sig(mI, j));
    const falschPlatziert = sI.map((s, j) => s !== sE[j]);
    if (
      falschPlatziert.some(Boolean) &&
      [...sE].sort().join(SPALT_TRENNER) === [...sI].sort().join(SPALT_TRENNER)
    ) {
      falschPlatziert.forEach((f, j) => {
        if (f) {
          out.eigene.spalten.add(j);
          out.erwartet.spalten.add(j);
        }
      });
      return out;
    }
  }

  // Fall: dieselben Zeilen, andere Reihenfolge. Markiert wird jede Zeile,
  // die nicht an ihrer erwarteten Position steht.
  const alsMenge = (m: string[][]) => m.map(zeilenText).sort().join(SPALT_TRENNER);
  if (reihenfolgeZaehlt && mE.length === mI.length && alsMenge(mE) === alsMenge(mI)) {
    mI.forEach((z, i) => {
      if (zeilenText(z) !== zeilenText(mE[i])) out.eigene.zeilen.set(i, 'verschoben');
    });
    return out;
  }

  // Fall: Reihenfolge zaehlt, gleiche Zeilenzahl -> Zeile i gegen Zeile i.
  if (reihenfolgeZaehlt && mE.length === mI.length) {
    mI.forEach((z, i) => {
      z.forEach((w, j) => {
        if (w !== mE[i][j]) {
          out.eigene.zellen.set(`${i}:${j}`, roh(erwartet, i, j));
          out.erwartet.zellen.set(`${i}:${j}`, roh(tatsaechlich, i, j));
        }
      });
    });
    return out;
  }

  // Allgemeiner Fall: Zeilen einander zuordnen.
  // 1. Identische Zeilen paaren - die sind in Ordnung.
  const frei = new Map<string, number[]>();
  mE.forEach((z, i) => {
    const k = zeilenText(z);
    if (!frei.has(k)) frei.set(k, []);
    frei.get(k)!.push(i);
  });
  const offenIst: number[] = [];
  mI.forEach((z, i) => {
    const liste = frei.get(zeilenText(z));
    if (liste && liste.length) liste.shift();
    else offenIst.push(i);
  });
  const offenSoll = [...frei.values()].flat().sort((a, b) => a - b);

  // 2. Uebrige Zeilen der aehnlichsten zuordnen - aber nur, wenn mindestens
  //    die Haelfte der Spalten uebereinstimmt. Sonst ist es keine "leicht
  //    falsche" Zeile, sondern eine, die gar nicht hingehoert.
  const vergeben = new Set<number>();
  const mindestens = Math.max(1, Math.ceil(breite / 2));
  for (const i of offenIst) {
    let beste = -1;
    let besteTreffer = -1;
    for (const e of offenSoll) {
      if (vergeben.has(e)) continue;
      let treffer = 0;
      for (let j = 0; j < breite; j++) if (mI[i][j] === mE[e][j]) treffer++;
      if (treffer > besteTreffer) {
        besteTreffer = treffer;
        beste = e;
      }
    }
    if (beste >= 0 && breite > 1 && besteTreffer >= mindestens) {
      vergeben.add(beste);
      for (let j = 0; j < breite; j++) {
        if (mI[i][j] !== mE[beste][j]) {
          out.eigene.zellen.set(`${i}:${j}`, roh(erwartet, beste, j));
          out.erwartet.zellen.set(`${beste}:${j}`, roh(tatsaechlich, i, j));
        }
      }
    } else {
      out.eigene.zeilen.set(i, 'extra');
    }
  }
  for (const e of offenSoll) {
    if (!vergeben.has(e)) out.erwartet.zeilen.set(e, 'fehlt');
  }
  return out;
}

/** Kurzfassung fuer die Legende ueber den Tabellen. */
export function abweichungsText(a: Abweichungen): string | null {
  const zellen = a.eigene.zellen.size;
  const extra = [...a.eigene.zeilen.values()].filter((v) => v === 'extra').length;
  const verschoben = [...a.eigene.zeilen.values()].filter((v) => v === 'verschoben').length;
  const fehlt = a.erwartet.zeilen.size;
  const spalten = a.eigene.spalten.size;
  const teile: string[] = [];
  if (spalten) teile.push(`${spalten} ${spalten === 1 ? 'Spalte' : 'Spalten'} an falscher Stelle`);
  if (zellen) teile.push(`${zellen} ${zellen === 1 ? 'Zelle weicht' : 'Zellen weichen'} ab`);
  if (verschoben)
    teile.push(`${verschoben} ${verschoben === 1 ? 'Zeile steht' : 'Zeilen stehen'} an falscher Position`);
  if (extra) teile.push(`${extra} ${extra === 1 ? 'Zeile' : 'Zeilen'} zu viel`);
  if (fehlt) teile.push(`${fehlt} ${fehlt === 1 ? 'Zeile fehlt' : 'Zeilen fehlen'}`);
  return teile.length ? teile.join(' · ') : null;
}
