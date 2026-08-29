import { game } from './game.svelte';
import { applyNarrative } from '$lib/features/progression/rules';
import { adoptClub } from '$lib/features/league/rules';
import type { Narrative } from '$lib/features/progression/content';
import type { StartClub } from '$lib/features/onboarding/content';

/**
 * Turn the choices made at career start into an actual career.
 *
 * This exists because the onboarding choices used to reach a confirm screen and
 * stop. The player picked a club, saw a toast welcoming them to it, and then
 * played the whole game as a hardcoded "FC Anstoß Pro" — the carousel, the
 * crests and the flavour lines were decoration on a decision the game never
 * read.
 *
 * One function so there is one place the start of a career is defined, and so
 * the surface can call it without knowing which modules have to be told.
 */
export function startCareer(setup: { club: StartClub; narrative: Narrative }): void {
  const { club, narrative } = setup;

  applyNarrative(game.modules.progression, narrative);
  game.modules.progression.started = true;

  game.modules.finance.money = narrative.startingMoney;
  game.modules.finance.transferBudget = narrative.startingTransferBudget;

  // The chosen club becomes OUR club in the league, at the narrative's level.
  adoptClub(game.modules.league, { id: club.id, name: club.name }, narrative.leagueLevel);
}
