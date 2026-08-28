import { defineModule } from '$lib/engine/module';
import { EditorSchema, createEditor, EDITOR_VERSION } from './state';

export default defineModule({
  id: 'editor',
  title: 'Editor',
  summary: 'Vereine und Spieler umbenennen, Wappen tauschen, Werte setzen.',
  nav: { group: 'Verein', icon: '✎', order: 90 },

  state: { schema: EditorSchema, create: createEditor, version: EDITOR_VERSION },

  // No hooks. The editor changes what things are CALLED and what their numbers
  // are; it does not advance anything. Overrides are resolved at read time by
  // whoever displays a club or a player, which is why there is nothing to tick.
});

export * from './rules';
export { type ClubOverride, type PlayerOverride, type EditorState } from './state';
