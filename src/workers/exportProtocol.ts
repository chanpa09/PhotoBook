export type ExportWorkerRequest =
  | { type: 'INIT'; payload?: undefined }
  | { type: 'ADD_FILE'; payload: { filename: string; base64Data: string } }
  | { type: 'GENERATE_ZIP'; payload: { filename: string } };

export type ExportWorkerSuccessType = `${ExportWorkerRequest['type']}_SUCCESS`;

export type ExportWorkerSuccessPayload = {
  INIT: undefined;
  ADD_FILE: { filename: string };
  GENERATE_ZIP: { blob: Blob; filename: string };
};

export type ExportWorkerResponse =
  | { type: 'INIT_SUCCESS'; payload?: undefined }
  | { type: 'ADD_FILE_SUCCESS'; payload: { filename: string } }
  | { type: 'GENERATE_ZIP_SUCCESS'; payload: { blob: Blob; filename: string } }
  | { type: 'ERROR'; payload: { message: string } };

export const getExportWorkerSuccessType = <TType extends ExportWorkerRequest['type']>(
  type: TType,
) => `${type}_SUCCESS` as `${TType}_SUCCESS`;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const requireString = (
  payload: Record<string, unknown>,
  key: string,
  type: ExportWorkerRequest['type'],
) => {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${type} payload must include a non-empty ${key}`);
  }

  return value;
};

export const validateExportWorkerRequest = (message: unknown): ExportWorkerRequest => {
  if (!isRecord(message) || typeof message.type !== 'string') {
    throw new Error('Export worker message must include a type');
  }

  switch (message.type) {
    case 'INIT':
      if ('payload' in message && message.payload !== undefined) {
        throw new Error('INIT payload must be omitted');
      }

      return { type: 'INIT' };

    case 'ADD_FILE': {
      if (!isRecord(message.payload)) {
        throw new Error('ADD_FILE payload is missing');
      }

      return {
        type: 'ADD_FILE',
        payload: {
          filename: requireString(message.payload, 'filename', 'ADD_FILE'),
          base64Data: requireString(message.payload, 'base64Data', 'ADD_FILE'),
        },
      };
    }

    case 'GENERATE_ZIP': {
      if (!isRecord(message.payload)) {
        throw new Error('GENERATE_ZIP payload is missing');
      }

      return {
        type: 'GENERATE_ZIP',
        payload: {
          filename: requireString(message.payload, 'filename', 'GENERATE_ZIP'),
        },
      };
    }

    default:
      throw new Error(`Unknown export worker message type: ${message.type}`);
  }
};
