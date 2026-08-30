/**
 * Editor copy.
 *
 * The tone here is deliberately different from the rest of the game. Everywhere
 * else the parody is done TO the player — the brands, the mail, the agent who
 * signs off from his boat. Here the player is doing something to the game, and
 * the game's job is to hand them the pencil without a lecture.
 *
 * So: no warnings, no "are you sure", no language that frames editing as
 * cheating. The old team editors were magic precisely because nobody asked you
 * to justify renaming the club to your own. The one thing the copy DOES do is
 * be honest that the change is yours and reversible, because that is what makes
 * people brave enough to try it.
 */

export const editorContent = {
  intro:
    'Der Verein heißt, wie du ihn nennst. Die Elf ist, wen du willst. Was du hier änderst, gilt sofort im ganzen Spiel — in der Tabelle, im Spielbericht, auf dem Platz. Und alles lässt sich jederzeit zurücksetzen.',

  clubIntro:
    'Name, Stadt, Farben. Das Wappen wird aus den beiden Farben erzeugt, solange du keins hochlädst.',

  playerIntro:
    'Fünf Werte, eine Form. Was die Position tatsächlich belohnt, zeigt die gestrichelte Linie.',

  /** Shown once nothing has been changed yet. */
  emptyState:
    'Noch nichts geändert. Das hier ist der Teil, in dem aus einem erfundenen Verein deiner wird.',

  /** The reset affordance, phrased as the safe act it is. */
  resetHint:
    'Zurücksetzen entfernt deine Änderung und stellt den Originalwert wieder her. Es kann nichts verloren gehen.',

  /** Acknowledgement when a player is maxed. Dry, not congratulatory. */
  maxedNote: 'Alle fünf auf 99. Der Verband wird Fragen stellen.',

  /** Import/export framing — this is the community half of the feature. */
  packIntro:
    'Ein Änderungspaket enthält nur deine Bearbeitungen, nicht den Spielstand. Weitergeben, einlesen, fertig.',

  packImportPartial:
    'Einträge, die nicht passen, werden übersprungen und benannt. Der Rest wird übernommen.'
} as const;

/**
 * How far a single edit may move a value in one gesture.
 *
 * Not a limit on the value — 99 is reachable and should be. A step size, so a
 * drag feels like a decision rather than a scrub, and so tapping the stepper
 * eleven times is not the only way to make a point.
 */
export const ATTRIBUTE_STEP = 1;
export const ATTRIBUTE_STEP_COARSE = 10;

/** The value at which the game acknowledges what you have done. */
export const MAXED = 99;
