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
}
