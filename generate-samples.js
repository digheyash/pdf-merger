// Clean generator for valid standard PDF 1.4 documents without circular references
const fs = require('fs');
const path = require('path');

function createSimplePdf(title, subtitle, pagesCount) {
  const objects = [];
  function add(str) {
    objects.push(str);
    return objects.length;
  }

  // Object 1: Catalog
  const catalogId = add(`<< /Type /Catalog /Pages 2 0 R >>`); // 1

  // Object 2: Pages root
  // We reserve slot 2 and fill it in later
  objects.push(''); // placeholder for Pages (slot index 1, object 2)
  const pagesId = 2;

  // Object 3: Font
  const fontId = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`); // 3

  const pageIds = [];

  for (let i = 1; i <= pagesCount; i++) {
    const textStream = `BT
/F1 18 Tf
50 740 Td
(${title} - Page ${i}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
0 -22 Td
(Sample page ${i} of ${pagesCount} for testing PDF merging & page numbering.) Tj
0 -18 Td
(This document was generated locally with 100% compliant PDF 1.4 specifications.) Tj
ET`;

    const streamLen = Buffer.byteLength(textStream, 'utf8');
    const contentId = add(`<< /Length ${streamLen} >>\nstream\n${textStream}\nendstream`);

    const pageId = add(`<<
  /Type /Page
  /Parent ${pagesId} 0 R
  /MediaBox [0 0 612 792]
  /Contents ${contentId} 0 R
  /Resources <<
    /Font << /F1 ${fontId} 0 R >>
  >>
>>`);
    pageIds.push(pageId);
  }

  // Now fill in Object 2 (Pages root)
  objects[1] = `<<
  /Type /Pages
  /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}]
  /Count ${pagesCount}
>>`;

  // Assemble PDF binary
  let pdf = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (let i = 0; i < objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdf += `${offStr} 00000 n \n`;
  }

  pdf += `trailer\n<<
  /Size ${objects.length + 1}
  /Root ${catalogId} 0 R
>>
startxref
${xrefOffset}
%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

const sampleDir = path.join(__dirname, 'sample-pdfs');
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

fs.writeFileSync(
  path.join(sampleDir, 'DocA-Introduction.pdf'),
  createSimplePdf('Document A: Introduction', 'Project Overview and Executive Brief', 2)
);

fs.writeFileSync(
  path.join(sampleDir, 'DocB-Technical-Report.pdf'),
  createSimplePdf('Document B: Technical Report', 'Architecture and System Specifications', 3)
);

fs.writeFileSync(
  path.join(sampleDir, 'DocC-Appendix.pdf'),
  createSimplePdf('Document C: Appendix', 'Reference Materials & Data Tables', 1)
);

console.log('Sample PDFs re-generated with perfect linear page trees.');
