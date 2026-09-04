import fs from 'fs';
import { extractTextFromPdfBuffer } from '../src/lib/engine/pdfParser.ts';

async function debug() {
  const buf4 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/4_table_resume.pdf');
  const text4 = await extractTextFromPdfBuffer(buf4);
  console.log('=== PDF 4 EXTRACTED TEXT ===');
  console.log(text4);

  const buf7 = fs.readFileSync('C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/7_tech_stack_resume.pdf');
  const text7 = await extractTextFromPdfBuffer(buf7);
  console.log('=== PDF 7 EXTRACTED TEXT ===');
  console.log(text7);
}
debug();
