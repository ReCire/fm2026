import { defineModule } from '$lib/engine/module';
import { OnboardingSchema, createOnboarding, ONBOARDING_VERSION } from './state';
import { onboardingDocs } from './docs';

export default defineModule({
  id: 'onboarding',
  title: 'Neue Karriere',
  summary: 'Name, Porträt, Verein und Startgeschichte — der Einstieg ins Spiel.',

  state: {
    schema: OnboardingSchema,
    create: createOnboarding,
    version: ONBOARDING_VERSION
  },

  // No nav entry and no hooks: onboarding happens once, before the clock
  // starts, and then gets out of the way. It stays a module rather than living
  // in the shell so that its state saves, migrates and documents like anything
  // else — and so it can be deleted in one folder if the flow is ever replaced.

  screen: () => import('./Screen.svelte'),
  docs: onboardingDocs
});

export * from './rules';
export { onboardingContent, clubById, type StartClub } from './content';
