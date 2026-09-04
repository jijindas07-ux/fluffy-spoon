import fs from 'fs';
import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import Tesseract from 'tesseract.js';

async function testOcr() {
  const buf6 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/6_scanned_image_resume.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf6));
  console.log('PDF 6 numPages:', pdf.numPages);
  
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  console.log('Operator list fnArray length:', ops.fnArray.length);

  // Check objects on page
  const objs = page.objs;
  console.log('Page objs keys:', Object.keys(objs || {}));

  // Test renderPageAsImage
  try {
    const imgData = await renderPageAsImage(new Uint8Array(buf6), 1, { canvas: () => import('@napi-rs/canvas') });
    console.log('renderPageAsImage output:', typeof imgData);
  } catch (e) {
    console.log('renderPageAsImage error:', e.message);
  }
}
testOcr();
