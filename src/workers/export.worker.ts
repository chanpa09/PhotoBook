import JSZip from 'jszip';
import { validateExportWorkerRequest } from '@/workers/exportProtocol';

let zip: JSZip | null = null;

self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const { type, payload } = validateExportWorkerRequest(event.data);

    switch (type) {
      case 'INIT':
        zip = new JSZip();
        self.postMessage({ type: 'INIT_SUCCESS' });
        break;

      case 'ADD_FILE': {
        if (!zip) throw new Error('Worker not initialized');
        const { filename, base64Data } = payload;
        zip.file(filename, base64Data, { base64: true });
        self.postMessage({ type: 'ADD_FILE_SUCCESS', payload: { filename } });
        break;
      }

      case 'GENERATE_ZIP': {
        if (!zip) throw new Error('Worker not initialized');
        const { filename: zipFilename } = payload;
        const blob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        self.postMessage({ type: 'GENERATE_ZIP_SUCCESS', payload: { blob, filename: zipFilename } });
        zip = null; // Reset
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { message: error instanceof Error ? error.message : String(error) }
    });
  }
};
