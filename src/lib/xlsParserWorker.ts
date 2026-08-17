import * as ExcelJS from 'exceljs';

export interface ParseXlsPayload {
  fileId: string;
  fileBuffer: ArrayBuffer;
}

self.onmessage = async (e: MessageEvent<ParseXlsPayload>) => {
  try {
    const { fileId, fileBuffer } = e.data;
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const sheets = workbook.worksheets.map(ws => ({
      id: ws.id,
      name: ws.name,
    }));

    self.postMessage({ success: true, fileId, sheets });
  } catch (error) {
    console.error('Error parsing Excel sheets:', error);
    self.postMessage({ success: false, fileId: e.data.fileId, error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
