import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test_resume.pdf'));
doc.fontSize(25).text('John Doe', 100, 100);
doc.fontSize(12).text('Software Engineer with experience in React, Node.js, and AWS.', 100, 150);
doc.end();
