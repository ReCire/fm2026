/** Column descriptor for DataTable. Lives outside the component because a
    Svelte instance script cannot export types. */
export interface Column {
  key: string;
  header: string;
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  /** Hide below this viewport width, so phone tables stay readable. */
  hideBelow?: number;
}
