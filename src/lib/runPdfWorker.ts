import type { PdfJob, PdfWorkerMessage } from './pdfWorkerMessages';

export function runPdfWorker(
  job: PdfJob,
  onProgress: (completed: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<PdfWorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') return onProgress(message.completed);
      worker.terminate();
      if (message.type === 'done') resolve(message.bytes);
      else reject(new Error(message.message));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'PDF worker crashed'));
    };

    worker.postMessage(job);
  });
}
