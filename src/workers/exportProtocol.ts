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
