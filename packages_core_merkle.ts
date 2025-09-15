// Simple Merkle tree root (SHA-256) using binary tree, deterministic: sort leaves by hex, pairwise hash
import { sha256 } from './hash';

function hashPair(a: string, b: string) {
  // deterministic concatenation: smaller first
  const [x, y] = a <= b ? [a, b] : [b, a];
  const buf = Buffer.from(x + y, 'utf8');
  return sha256(buf);
}

export function merkleRootHex(leaves: string[]): string {
  if (!leaves || leaves.length === 0) return sha256(Buffer.from(''));
  // deterministic ordering: sort leaves bytewise (they are hex strings)
  let level = [...leaves].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) {
        // duplicate last to make even
        next.push(hashPair(level[i], level[i]));
      } else {
        next.push(hashPair(level[i], level[i + 1]));
      }
    }
    level = next;
  }
  return level[0];
}