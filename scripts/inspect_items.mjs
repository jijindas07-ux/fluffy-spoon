import fs from 'fs';
import { getDocumentProxy } from 'unpdf';

async function inspectItems() {
  const buf7 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/7_tech_stack_resume.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf7));
  const page = await pdf.getPage(1);
  const tc = await page.getTextContent();
  console.log('Items in PDF 7:');
  for (const item of tc.items) {
    if (item.str) console.log(JSON.stringify(item.str), 'at x:', item.transform[4], 'y:', item.transform[5]);
  }
}
inspectItems();
