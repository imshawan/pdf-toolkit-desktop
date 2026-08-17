import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';

export interface BuildXlsPdfPayload {
  file: File;
  pageSize: 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid';
  orientation: 'portrait' | 'landscape';
  marginMm: number;
  selectedSheets?: string[]; // If undefined, process all sheets
  exportMode?: 'combined' | 'split';
  scaleToFit?: boolean;
}

// Helper to convert ARGB (FFRRGGBB) to RGB array
const argbToRgb = (argb?: string): [number, number, number] | undefined => {
  if (!argb || argb.length !== 8) return undefined;
  // Ignore alpha channel at the start (indices 0, 1)
  const r = parseInt(argb.substring(2, 4), 16);
  const g = parseInt(argb.substring(4, 6), 16);
  const b = parseInt(argb.substring(6, 8), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return undefined;
  return [r, g, b];
};

self.onmessage = async (e: MessageEvent<BuildXlsPdfPayload>) => {
  try {
    const { file, pageSize, orientation, marginMm, selectedSheets, exportMode = 'combined', scaleToFit = false } = e.data;

    // 1. Read the Excel file into an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 2. Parse it with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Filter worksheets
    const worksheetsToProcess = workbook.worksheets.filter(ws => 
      !selectedSheets || selectedSheets.length === 0 || selectedSheets.includes(ws.name)
    );

    if (worksheetsToProcess.length === 0) {
      throw new Error('No sheets selected to process.');
    }

    const outputPdfs: { filename: string, pdfData: Uint8Array }[] = [];
    
    let combinedDoc: jsPDF | null = null;

    // 4. Iterate over selected sheets
    for (let sheetIdx = 0; sheetIdx < worksheetsToProcess.length; sheetIdx++) {
      const worksheet = worksheetsToProcess[sheetIdx];
      const sheetName = worksheet.name;
      
      const rowCount = worksheet.rowCount;
      const colCount = worksheet.columnCount;
      
      // Build data matrix and style map
      const styleMap: any[][] = [];
      const bodyData: string[][] = [];

      for (let r = 1; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const rowData: string[] = [];
        const rowStyles: any[] = [];
        
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c);
          const val = cell.value;
          
          let text = '';
          if (val !== null && val !== undefined) {
             if (typeof val === 'object') {
               if ('richText' in val) {
                 text = (val as any).richText.map((rt: any) => rt.text).join('');
               } else if ('hyperlink' in val && 'text' in val) {
                 text = String((val as any).text);
               } else if ('result' in val) {
                 text = String((val as any).result);
               } else if (val instanceof Date) {
                 text = val.toLocaleDateString();
               } else {
                 try {
                   text = JSON.stringify(val);
                 } catch {
                   text = String(val);
                 }
               }
             } else {
               text = String(val);
             }
          }
          
          rowData.push(text);

          const cellStyle: any = {};
          if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor && cell.fill.fgColor.argb) {
            const rgb = argbToRgb(cell.fill.fgColor.argb);
            if (rgb) cellStyle.fillColor = rgb;
          }
          if (cell.font) {
            if (cell.font.bold) cellStyle.fontStyle = 'bold';
            if (cell.font.italic) cellStyle.fontStyle = cellStyle.fontStyle ? 'bolditalic' : 'italic';
            if (cell.font.color && cell.font.color.argb) {
               const rgb = argbToRgb(cell.font.color.argb);
               if (rgb) cellStyle.textColor = rgb;
            }
          }
          rowStyles.push(cellStyle);
        }
        bodyData.push(rowData);
        styleMap.push(rowStyles);
      }

      const head = bodyData.length > 0 ? [bodyData[0]] : [];
      const body = bodyData.length > 1 ? bodyData.slice(1) : [];

      // Determine standard page dimensions
      const tempDoc = new jsPDF({ orientation, unit: 'mm', format: pageSize });
      const standardWidth = tempDoc.internal.pageSize.getWidth();
      const standardHeight = tempDoc.internal.pageSize.getHeight();
      
      const availableWidth = standardWidth - (marginMm * 2);

      let dynamicFontSize = 10;
      let dynamicCellPadding = 3;
      
      if (scaleToFit && colCount > 0 && rowCount > 0) {
        // Measure natural table width at 10pt font
        const dummyDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [10000, 10000] });
        let naturalTableWidth = 0;
        
        autoTable(dummyDoc, {
          head: head,
          body: body,
          theme: 'grid',
          tableWidth: 'wrap', // Forces single line
          styles: { 
            fontSize: 10, 
            cellPadding: 3,
            overflow: 'visible',
            cellWidth: 'auto'
          },
          didDrawPage: (data) => {
             if (data.table) {
                naturalTableWidth = (data.table as any).width || ((data.table as any).getWidth ? (data.table as any).getWidth() : 0);
             }
          }
        });
        
        if (naturalTableWidth > availableWidth) {
          // Calculate the exact linear scaling factor needed to fit the table into the available width
          // We apply a 2% safety margin to ensure it doesn't accidentally trigger a wrap or bleed
          const scaleFactor = (availableWidth / naturalTableWidth) * 0.98;
          
          dynamicFontSize = 10 * scaleFactor;
          dynamicCellPadding = 3 * scaleFactor;
        }
      }

      let doc: jsPDF;
      if (exportMode === 'split') {
        doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });
      } else {
        if (!combinedDoc) {
          combinedDoc = new jsPDF({ orientation, unit: 'mm', format: pageSize });
          doc = combinedDoc;
        } else {
          doc = combinedDoc;
          doc.addPage(pageSize, orientation);
        }
      }

      if (rowCount === 0 || colCount === 0) {
        if (exportMode === 'split') {
          outputPdfs.push({ filename: `${sheetName}.pdf`, pdfData: new Uint8Array(doc.output('arraybuffer')) });
        }
        continue;
      }

      doc.setFontSize(14);
      doc.text(sheetName, marginMm, marginMm + 5);

      autoTable(doc, {
        head: head,
        body: body,
        startY: marginMm + 10,
        margin: { top: marginMm, right: marginMm, bottom: marginMm, left: marginMm },
        horizontalPageBreak: scaleToFit ? false : true,
        horizontalPageBreakBehaviour: 'afterAllRows',
        theme: 'grid',
        tableWidth: scaleToFit ? 'wrap' : 'auto', 
        styles: {
          fontSize: dynamicFontSize,
          cellPadding: dynamicCellPadding,
          overflow: scaleToFit ? 'visible' : 'linebreak',
          cellWidth: scaleToFit ? 'auto' : undefined,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        didParseCell: (data) => {
          let actualRowIdx = data.row.index;
          if (data.section === 'body') {
            actualRowIdx += head.length;
          }
          const actualColIdx = data.column.index;
          
          if (styleMap[actualRowIdx] && styleMap[actualRowIdx][actualColIdx]) {
            const style = styleMap[actualRowIdx][actualColIdx];
            if (style.fillColor) data.cell.styles.fillColor = style.fillColor;
            if (style.textColor) data.cell.styles.textColor = style.textColor;
            if (style.fontStyle) data.cell.styles.fontStyle = style.fontStyle;
          }
        }
      });

      if (exportMode === 'split') {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        outputPdfs.push({ filename: `${baseName} - ${sheetName}.pdf`, pdfData: new Uint8Array(doc.output('arraybuffer')) });
      }
    }

    if (exportMode === 'combined' && combinedDoc) {
      outputPdfs.push({ filename: file.name.replace(/\.[^/.]+$/, '.pdf'), pdfData: new Uint8Array(combinedDoc.output('arraybuffer')) });
    }

    self.postMessage({ success: true, pdfFiles: outputPdfs });
  } catch (error) {
    console.error('xls2pdfWorker error:', error);
    self.postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
