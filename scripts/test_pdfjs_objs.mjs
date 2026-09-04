import fs from 'fs';
import { getDocumentProxy } from 'unpdf';

async function testImages() {
  const buf6 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/6_scanned_image_resume.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf6));
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  console.log('PDF.js ops:', ops.fnArray.slice(0, 10));
  console.log('PDF.js args:', ops.argsArray.slice(0, 10));
  for (let i = 0; i < ops.fnArray.length; i++) {
    // 82 is paintImageXObject, 83 is paintInlineImageXObject
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    console.log('Op', i, 'fn:', fn, 'args:', args);
    if (args && args[0] && typeof args[0] === 'string' && (args[0].startsWith('g_') || args[0].startsWith('img_') || args[0].startsWith('Im'))) {
      const imgName = args[0];
      page.objs.get(imgName, (img) => {
        console.log('Got page obj:', imgName, img ? Object.keys(img) : 'null');
      });
    }
  }
}
testImages();
