export type ImageKind = 'jpg' | 'png' | 'webp';

export async function detectImageKind(file: File): Promise<ImageKind | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const readAscii = (start: number, length: number) =>
    String.fromCharCode(...header.slice(start, start + length));

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'jpg';
  if (header[0] === 0x89 && readAscii(1, 3) === 'PNG') return 'png';
  if (readAscii(0, 4) === 'RIFF' && readAscii(8, 4) === 'WEBP') return 'webp';
  return null;
}