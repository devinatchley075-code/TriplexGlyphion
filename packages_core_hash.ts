// Simple, tested SHA-256 helper for buffers/streams
import { createHash } from 'crypto';
import { Readable } from 'stream';

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function sha256Stream(stream: Readable): Promise<string> {
  return await new Promise((resolve, reject) => {
    const h = createHash('sha256');
    stream.on('data', (c) => h.update(c));
    stream.on('end', () => resolve(h.digest('hex')));
    stream.on('error', reject);
  });
}
export const HASH_ALG = 'sha256';