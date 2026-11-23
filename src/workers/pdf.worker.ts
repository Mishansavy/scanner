import { buildPdf } from '../lib/pdf';
import type { PdfJob, PdfWorkerMessage } from '../lib/pdfWorkerMessages';

function send(message: PdfWorkerMessage, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

self.onmessage = async (event: MessageEvent<PdfJob>) => {
  const { pages, fit, quality } = event.data;
  try {
    const saved = await buildPdf(pages, fit, quality, (completed) =>
      send({ type: 'progress', completed }),
    );
    const bytes = new Uint8Array(saved);
    send({ type: 'done', bytes }, [bytes.buffer]);
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
