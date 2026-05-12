import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExportWorkerRequest, ExportWorkerResponse } from '@/workers/exportProtocol';

type WorkerSelf = {
  onmessage?: (event: MessageEvent<ExportWorkerRequest>) => Promise<void>;
  postMessage: (message: ExportWorkerResponse) => void;
  process: NodeJS.Process;
};

async function loadWorker() {
  vi.resetModules();

  const workerSelf: WorkerSelf = {
    postMessage: vi.fn(),
    process,
  };

  vi.stubGlobal('self', workerSelf);
  await import('@/workers/export.worker');

  if (!workerSelf.onmessage) {
    throw new Error('Worker message handler was not registered');
  }

  return workerSelf as Required<WorkerSelf>;
}

const sendMessage = async (
  workerSelf: Required<WorkerSelf>,
  message: ExportWorkerRequest,
) => {
  await workerSelf.onmessage({ data: message } as MessageEvent<ExportWorkerRequest>);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('export worker', () => {
  it('reports an error when generating a zip before init', async () => {
    const workerSelf = await loadWorker();

    await sendMessage(workerSelf, {
      type: 'GENERATE_ZIP',
      payload: { filename: 'photobook.zip' },
    });

    expect(workerSelf.postMessage).toHaveBeenCalledWith({
      type: 'ERROR',
      payload: { message: 'Worker not initialized' },
    });
  });

  it('reports a clear error when add file payload is missing', async () => {
    const workerSelf = await loadWorker();

    await sendMessage(workerSelf, { type: 'INIT' });
    await sendMessage(workerSelf, { type: 'ADD_FILE' } as ExportWorkerRequest);

    expect(workerSelf.postMessage).toHaveBeenLastCalledWith({
      type: 'ERROR',
      payload: { message: 'ADD_FILE payload is missing' },
    });
  });

  it('reports a clear error when generate zip payload is missing', async () => {
    const workerSelf = await loadWorker();

    await sendMessage(workerSelf, { type: 'INIT' });
    await sendMessage(workerSelf, { type: 'GENERATE_ZIP' } as ExportWorkerRequest);

    expect(workerSelf.postMessage).toHaveBeenLastCalledWith({
      type: 'ERROR',
      payload: { message: 'GENERATE_ZIP payload is missing' },
    });
  });
});
