/**
 * Generates a unique kelas code in the format `abc-def-ghi`.
 *
 * The code consists of 3 segments of 3 lowercase alphanumeric characters
 * joined by hyphens, producing an 11-character string (3+1+3+1+3).
 *
 * **Validates: Requirements 2.14**
 * Canonical shared helper — replaces verbatim duplicates in
 * `/api/kelas/route.ts` and `/api/admin/kelas/route.ts`.
 */

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SEGMENT_COUNT = 3;
const SEGMENT_LENGTH = 3;

export function generateKodeKelas(): string {
  const segments: string[] = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    let segment = '';
    for (let j = 0; j < SEGMENT_LENGTH; j++) {
      segment += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}
