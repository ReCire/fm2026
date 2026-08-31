/**
 * What to build next, ranked by how much of the tree it lights up.
 *
 * `npm run census`
 *
 * The dormancy gate can already tell you a node is not buyable, and the
 * knowledge screen shows you how many. Neither answers the question we were
 * actually arguing about, which is WHICH SYSTEM TO BUILD NEXT — sixty dormant
 * nodes read as sixty problems, and it is eighteen decisions, two of which are
 * worth twenty-four nodes between them.
 *
 * A tool rather than a screen because nobody playing the game needs it. It is
 * for whoever is deciding what the next feature is, which right now is three
 * sessions who were about to decide it by argument.
 */
import { Registry } from '../src/lib/engine/registry';
import { modules } from '../src/lib/modules';
import { blockers, census, SCREEN_READ } from '../src/lib/features/knowledge/rules';
import { knowledgeNodes, nodeById } from '../src/lib/features/knowledge/content';

const consumed = new Set([...new Registry(modules).consumedKeys(), ...SCREEN_READ]);
const counts = census(consumed);

console.log(`\n${knowledgeNodes.length} nodes: ${counts.live} live, ${counts.unmapped} unmapped, ${counts.unread} unread, ${counts.inert} inert\n`);

const rows = blockers(consumed);
const width = Math.max(...rows.map((b) => b.need.length));
for (const b of rows) {
  const doctrines = [...new Set(b.nodes.map((id) => nodeById.get(id)?.doctrine ?? '?'))];
  console.log(
    `${String(b.nodes.length).padStart(3)}  ${b.need.padEnd(width)}  ${b.kind.padEnd(8)}  ${doctrines.join(' ')}`
  );
}
console.log(
  '\nCounts overlap: a node blocked on two keys is counted under both, so\n' +
  'clearing the top row does not always make its nodes buyable on its own.\n'
);
