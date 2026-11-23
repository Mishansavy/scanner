import type { Page } from '../types';
import type { PageFit } from './pdf';
import type { QualityPreset } from './render';

export type PdfJob = { pages: Page[]; fit: PageFit; quality: QualityPreset };

export type PdfWorkerMessage =
  | { type: 'progress'; completed: number }
  | { type: 'done'; bytes: Uint8Array<ArrayBuffer> }
  | { type: 'error'; message: string };
