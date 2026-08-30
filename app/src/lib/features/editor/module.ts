import { defineModule } from '$lib/engine/module';
import { EditorSchema, createEditor, EDITOR_VERSION, migrateEditor } from './state';
import { applyAll } from './rules';
import { allTeams } from '../league/rules';

export default defineModule({
  id: 'editor',
  title: 'Editor',
  summary: 'Vereine und Spieler umbenennen, Wappen tauschen, Werte setzen.',
  nav: { group: 'Verein', icon: '✎', order: 90 },
  requires: ['league', 'squad'],

  state: {
    schema: EditorSchema,
    create: createEditor,
    version: EDITOR_VERSION,
    migrate: migrateEditor
  },

  /*
   * One hook, and only for old saves.
   *
   * The editor changes what things are CALLED and what their numbers are; it
   * does not advance anything, so it has nothing to do on a normal tick. But a
   * v1 save holds an edit set that was never written onto any club or player —
   * v1 resolved edits at read time, and almost nobody called the resolver. The
   * migration cannot reach the league or the squad, so the work lands here on
   * the first tick after loading, and the flag is cleared.
   */
  hooks: {
    week: {
      phase: 'pre',
      order: 0,
      run({ state, emit }) {
        const editor = state.modules.editor;
        if (!editor.pendingApply) return;

        const clubs = allTeams(state.modules.league).map((t) => t.team);
        const applied = applyAll(editor, clubs, state.modules.squad.players);
        editor.pendingApply = false;

        if (applied.clubs + applied.players > 0) {
          emit({
            source: 'editor',
            severity: 'info',
            title: 'Eigene Daten übernommen',
            detail: `${applied.clubs} Vereine und ${applied.players} Spieler aus einem älteren Spielstand.`,
            goto: 'editor'
          });
        }
      }
    }
  }
});

export * from './rules';
export { type ClubEdit, type PlayerEdit, type EditorState } from './state';
