/**
 * Column descriptor for DataTable.
 *
 * The caller declares MEANING; the component decides PRESENTATION. No caller
 * ever names a breakpoint — the same principle the colour system runs on.
 *
 * There used to be a `hideBelow: number` here. It never worked (no CSS matched
 * it), and the naive implementation would have been worse than nothing: hiding
 * a header while the caller's cells stayed produces a misaligned table, which
 * in a game about reading numbers is a data-integrity failure rather than a
 * cosmetic one. A nine-column squad table cannot be rescued at 375px by
 * removing columns — you either lose data the player needs or keep columns so
 * narrow the numbers wrap. A row list loses nothing and reads better.
 */
export interface Column {
  key: string;
  label: string;
  /**
   * - `primary`   — line one on a phone; the thing you scan for.
   * - `secondary` — line two on a phone; context you want without a tap.
   * - `detail`    — behind a tap on a phone; present but not competing.
   *
   * All three render as ordinary columns on a wide screen.
   */
  role: 'primary' | 'secondary' | 'detail';
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  /**
   * How this column sorts. Omit to make the column unsortable.
   *
   * A function rather than a flag, because the value a cell RENDERS is rarely
   * the value it should sort by: "34 J." sorts as text, `p.age` sorts as a
   * number, and "Vertrag läuft aus" has no order at all until you sort by the
   * matchdays behind it. The caller knows which number is underneath; the
   * component only knows what it was handed to draw.
   */
  sort?: (row: never) => number | string;
  /**
   * Which way the FIRST click sorts. Defaults to ascending for text and
   * descending for numbers — because "best first" is what anyone wants from a
   * strength column, and "A first" is what anyone wants from a name.
   */
  firstClick?: 'asc' | 'desc';
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

/**
 * Order rows by a column. Stable, and undefined-safe.
 *
 * Sorting happens HERE rather than in each screen so that every table in the
 * game sorts the same way — and so a screen cannot accidentally sort the array
 * it was handed, which would reorder the squad itself rather than the view of
 * it.
 */
export function sortRows<T>(rows: readonly T[], columns: Column[], state: SortState): T[] {
  if (!state) return [...rows];
  const column = columns.find((c) => c.key === state.key);
  if (!column?.sort) return [...rows];

  const value = column.sort as (row: T) => number | string;
  const factor = state.dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
    return String(x).localeCompare(String(y), 'de') * factor;
  });
}

/** What clicking a header should do next, given where it is now. */
export function nextSort(column: Column, current: SortState): SortState {
  const preferred = column.firstClick ?? (column.numeric ? 'desc' : 'asc');
  if (current?.key !== column.key) return { key: column.key, dir: preferred };
  // Second click reverses. A third does NOT clear it: a table that silently
  // returns to an unnamed default order is a table you cannot trust twice.
  return { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}
