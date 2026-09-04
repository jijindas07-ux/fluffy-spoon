import fs from 'fs';
import { getDocumentProxy } from 'unpdf';
import Tesseract from 'tesseract.js';

async function testObjs() {
  const buf6 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/6_scanned_image_resume.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf6));
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    const args = ops.argsArray[i];
    if (args && args[0] && typeof args[0] === 'string' && args[0].startsWith('img_')) {
      const imgName = args[0];
      const img = await new Promise((resolve) => page.objs.get(imgName, resolve));
      console.log('Resolved img:', imgName, img ? { width: img.width, height: img.height, kind: img.kind, dataLen: img.data?.length } : null);
      
      if (img && img.data && img.width > 50 && img.height > 50) {
        const width = img.width;
        const height = img.height;
        const channels = (img.kind === 1 || img.kind === 0) ? 1 : 3;
        const rowSize = Math.floor((channels * width * 8 + 31) / 32) * 4;
        const pixelArraySize = rowSize * height;
        const fileSize = 54 + pixelArraySize;
        const bmpBuf = Buffer.alloc(fileSize);

        bmpBuf.write('BM', 0);
        bmpBuf.writeUInt32LE(fileSize, 2);
        bmpBuf.writeUInt32LE(54, 10);
        bmpBuf.writeUInt32LE(40, 14);
        bmpBuf.writeInt32LE(width, 18);
        bmpBuf.writeInt32LE(height, 22);
        bmpBuf.writeUInt16LE(1, 26);
        bmpBuf.writeUInt16LE(channels * 8, 28);
        bmpBuf.writeUInt32LE(0, 30);
        bmpBuf.writeUInt32LE(pixelArraySize, 34);

        const srcData = img.data;
        for (let y = 0; y < height; y++) {
          const srcY = height - 1 - y;
          const dstRowOffset = 54 + y * rowSize;
          const srcRowOffset = srcY * width * channels;
          for (let x = 0; x < width; x++) {
            if (channels === 3) {
              bmpBuf[dstRowOffset + x * 3] = srcData[srcRowOffset + x * 3 + 2]; // B
              bmpBuf[dstRowOffset + x * 3 + 1] = srcData[srcRowOffset + x * 3 + 1]; // G
              bmpBuf[dstRowOffset + x * 3 + 2] = srcData[srcRowOffset + x * 3]; // R
            } else {
              bmpBuf[dstRowOffset + x] = srcData[srcRowOffset + x];
            }
          }
        }

        console.log('Sending to Tesseract...');
        const ocr = await Tesseract.recognize(bmpBuf, 'eng');
        console.log('=== OCR TEXT ===');
        console.log(ocr.data.text);
      }
    }
  }
}
testObjs().then(() => console.log('Done testObjs')).catch(console.error);
