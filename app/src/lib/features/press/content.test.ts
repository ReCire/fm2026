import { describe, it, expect } from 'vitest';
import {
  bands, bandFor, headlines, CAUSES, WEIGHTED, pressContent, QUIET,
  INVESTIGATION_FROM, copy, suspicionCandidates, suspicionScale
} from './content';

describe('the meter', () => {
  it('reads at every value from 0 to 100', () => {
    for (let v = 0; v <= 100; v++) expect(bandFor(v), `no band at ${v}`).toBeDefined();
    expect(bandFor(0).id).toBe('sauber');
    expect(bandFor(100).id).toBe('razzia');
  });

  it('is separable without colour', () => {
    // The number a player checks in a hurry. Four shades of amber is not a
    // channel, so each band carries a distinct glyph and a distinct word.
    expect(new Set(bands.map((b) => b.mark)).size).toBe(bands.length);
    expect(new Set(bands.map((b) => b.label)).size).toBe(bands.length);
  });

  it('turns dangerous exactly where the copy says it does', () => {
    // The screen tells the player investigations start at 25 %. If the band
    // boundary and that sentence disagree, the screen is lying about a rule
    // the player is being punished by.
    expect(bandFor(INVESTIGATION_FROM - 1).id).toBe('sauber');
    expect(bandFor(INVESTIGATION_FROM).id).toBe('auffaellig');
    expect(copy.exposed).toContain(String(INVESTIGATION_FROM));
  });

  it('starts at nothing, not at a baseline', () => {
    // A media meter would idle above zero — everyone gets written about. This
    // is an investigation, and a club that has done nothing is not under one.
    expect(bandFor(0).id).toBe('sauber');
    expect(pressContent).not.toHaveProperty('baseline');
  });
});

describe('the feed', () => {
  it('only lets four causes move the needle', () => {
    /*
     * The meter is Ermittlungsdruck, not media temperature. A defeat is
     * written about and does not make the Verband curious; an envelope makes
     * it curious whether or not anybody writes about it.
     *
     * This is the assertion that would have caught the first draft of this
     * file, which weighted defeats and thrashings and would have had the
     * Verband raiding clubs for losing.
     */
    expect([...WEIGHTED].sort()).toEqual(['cleared', 'fine', 'raid', 'suspicion']);
    for (const h of headlines) {
      const football = !WEIGHTED.has(h.cause);
      if (football) expect(h.weight, `${h.cause} moves the meter`).toBe(0);
    }
  });

  it('has enough weightless colour to be worth opening when clean', () => {
    /*
     * A screen that is empty for most of a career is the mistake we have made
     * twice — badges nobody could earn, departments nobody could delegate. A
     * manager who never takes an envelope still gets a press page.
     */
    const colour = headlines.filter((h) => h.weight === 0);
    expect(colour.length).toBeGreaterThan(headlines.length / 2);
    for (const cause of ['defeat', 'streak', 'quiet'] as const) {
      expect(colour.filter((h) => h.cause === cause).length, cause).toBeGreaterThan(1);
    }
  });

  it('gives every cause at least one headline', () => {
    for (const cause of CAUSES) {
      expect(headlines.filter((h) => h.cause === cause).length, cause).toBeGreaterThan(0);
    }
  });

  it('makes a raid worse than the suspicion that led to it', () => {
    // The one moment the two consequences touch. BLÖD finding out has to cost
    // more than the file being opened, or the raid is an anticlimax.
    const worstSuspicion = Math.max(...headlines.filter((h) => h.cause === 'suspicion').map((h) => h.weight));
    const mildestRaid = Math.min(...headlines.filter((h) => h.cause === 'raid').map((h) => h.weight));
    expect(mildestRaid).toBeGreaterThan(worstSuspicion);
  });

  it('has exactly one way down that is not time', () => {
    // Being cleared. Everything else negative would make the meter something
    // you manage rather than something you carry.
    const down = headlines.filter((h) => h.weight < 0);
    expect(new Set(down.map((h) => h.cause))).toEqual(new Set(['cleared']));
  });

  it('never repeats a headline', () => {
    expect(new Set(headlines.map((h) => h.text)).size).toBe(headlines.length);
  });

  it('only uses placeholders the writer can fill', () => {
    const allowed = new Set(['club', 'opponent', 'n', 'sum']);
    for (const h of headlines) {
      for (const m of h.text.matchAll(/\{(\w+)\}/g)) {
        expect(allowed, `${h.text} uses {${m[1]}}`).toContain(m[1]);
      }
    }
  });
});

describe('the two kinds of quiet', () => {
  it('are described differently, because they are different purchases', () => {
    // Same modifier, opposite fictions: one is a story that does not run, the
    // other is a story that runs kindly. If the screen renders both as
    // "−3 Presse-Druck" the two doctrines are one doctrine with two icons.
    expect(QUIET.suppressed.note).not.toBe(QUIET.goodwill.note);
    expect(QUIET.suppressed.label).not.toBe(QUIET.goodwill.label);
    for (const q of Object.values(QUIET)) {
      expect(q.note.length).toBeGreaterThan(40);
      expect(q.note, 'the note restates the number instead of the fiction').not.toMatch(/\d+\s*%/);
    }
  });
});


describe('suspicion is a report, not an event', () => {
  const suspicion = headlines.filter((h) => h.cause === 'suspicion');

  it('never adds a weight of its own', () => {
    /*
     * The bug this file now guards against: a sabotage advertising +18
     * Ermittlungsdruck moved the needle 25, because press added the contributed
     * amount AND the headline's own content weight on top.
     *
     * A suspicion story REPORTS a number the player was already quoted — a
     * node's "+3", or the price of a sabotage. If the sentence carries a second
     * number, the tree and the needle disagree and the feed's whole promise
     * goes with it. Same failure as a target a manager was never shown, pointed
     * the other way.
     */
    for (const h of suspicion) expect(h.weight, h.text).toBe(0);
  });

  it('keeps severity and weight as separate fields', () => {
    // One field with two meanings is what we are fixing; reusing `weight` as a
    // severity hint would have rebuilt the same bug in a nicer costume.
    for (const h of suspicion) expect(h.severity, h.text).toBeGreaterThan(0);
    for (const h of headlines.filter((x) => x.cause !== 'suspicion')) {
      expect(h.severity, `${h.text} carries a severity it cannot use`).toBeUndefined();
    }
  });

  it('still counts as a cause that moves the needle', () => {
    // WEIGHTED is declared, not derived. Derived from the table it would now
    // drop suspicion — and the feed would stop marking the one line the player
    // actually paid for.
    expect(WEIGHTED.has('suspicion')).toBe(true);
  });

  it('matches the sentence to the size of the thing', () => {
    /*
     * A flat draw across all six made the loudest purchase in the game
     * announce itself as a filing query two thirds of the time.
     */
    const quiet = suspicionCandidates(3);
    const loud = suspicionCandidates(18);
    const worstQuiet = Math.max(...quiet.map((h) => h.severity ?? 0));
    const bestLoud = Math.min(...loud.map((h) => h.severity ?? 0));
    expect(worstQuiet).toBeLessThanOrEqual(bestLoud);
    expect(loud.some((h) => h.text.includes('Parkhaus'))).toBe(true);
  });

  it('can reach every sentence it owns', () => {
    // A headline no amount can draw is a headline that was never written.
    const reachable = new Set<string>();
    for (let amount = 1; amount <= 40; amount++) {
      for (const h of suspicionCandidates(amount)) reachable.add(h.text);
    }
    expect(reachable.size, 'a suspicion headline is unreachable').toBe(suspicion.length);
  });

  it('never gets milder as the amount grows', () => {
    let previous = 0;
    for (let amount = 1; amount <= 40; amount++) {
      const top = Math.max(...suspicionCandidates(amount).map((h) => h.severity ?? 0));
      expect(top, `severity dropped at ${amount}`).toBeGreaterThanOrEqual(previous);
      previous = top;
    }
    expect(suspicionScale.quiet).toBeLessThan(suspicionScale.loud);
  });
});
