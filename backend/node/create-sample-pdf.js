const fs = require('fs');
const path = require('path');

// Create a simple PDF file with text content
const samplePdfContent = `%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 68 >>
stream
BT
/F1 24 Tf
100 700 Td
(Deep Learning - Introduction to Neural Networks) Tj
ET
BT
/F1 18 Tf
100 650 Td
(Week 1 - Lesson 1) Tj
ET
BT
/F1 12 Tf
100 600 Td
(This is a sample PDF for the curriculum system.) Tj
ET
BT
/F1 12 Tf
100 570 Td
(In a real implementation, this would contain actual lesson content.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000216 00000 n
0000000299 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
417
%%EOF`;

// Paths
const samplesDir = path.join(__dirname, 'samples');
const uploadDir = path.join(__dirname, 'uploads');

// Create directories if they don't exist
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Write the sample PDF
fs.writeFileSync(path.join(samplesDir, 'sample.pdf'), samplePdfContent);
console.log('Sample PDF created at:', path.join(samplesDir, 'sample.pdf'));

// Copy the sample to uploads with a predictable name
const uploadedPdfPath = path.join(uploadDir, 'neural-networks-intro.pdf');
fs.writeFileSync(uploadedPdfPath, samplePdfContent);
console.log('Sample PDF copied to uploads as:', uploadedPdfPath);

console.log('Done creating sample PDFs!'); 