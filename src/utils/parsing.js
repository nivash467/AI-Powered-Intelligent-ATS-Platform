import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker precisely for Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker();

export const extractTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    try {
        if (extension === 'pdf') {
            return await extractTextFromPDF(file);
        } else if (extension === 'docx') {
            return await extractTextFromDOCX(file);
        } else {
            throw new Error("Unsupported file format. Please upload PDF or DOCX.");
        }
    } catch (err) {
        console.error("Error extracting text:", err);
        throw err;
    }
};

const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    // We need to pass the typed array or arrayBuffer
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = '';
    const extractedUrls = new Set();

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Extract visible text
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        text += pageText + '\n';

        // Extract URLs from hyperlink annotations (clickable links in the PDF)
        try {
            const annotations = await page.getAnnotations();
            annotations.forEach(annot => {
                if (annot.url && typeof annot.url === 'string') {
                    extractedUrls.add(annot.url);
                }
                // Some PDFs store the URI in annot.unsafeUrl
                if (annot.unsafeUrl && typeof annot.unsafeUrl === 'string') {
                    extractedUrls.add(annot.unsafeUrl);
                }
            });
        } catch (e) {
            // Silently skip if annotations fail
            console.warn('Could not extract PDF annotations from page', i, e);
        }
    }

    // Append all extracted hyperlink URLs to the text so downstream regex can find them
    if (extractedUrls.size > 0) {
        console.log('🔗 Extracted hyperlink URLs from PDF:', Array.from(extractedUrls));
        text += '\n--- Extracted Links ---\n';
        text += Array.from(extractedUrls).join('\n');
    }

    return text;
};

const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};
