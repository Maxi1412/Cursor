import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Same directory as the media file, exact title + a language-tagged `.th.srt` (spec §8). */
export function subtitleFileName(title: string): string {
  return `${title}.th.srt`;
}

export async function writeSubtitle(dir: string, title: string, content: string): Promise<string> {
  const dest = join(dir, subtitleFileName(title));
  await writeFile(dest, content, 'utf8');
  return dest;
}
