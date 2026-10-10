import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE_DIR = path.join(ROOT, 'data', 'ocr-cache');

const MAX_OCR_PAGES_PER_PDF = Number(process.env.MAX_OCR_PAGES || 10);
const OCR_PAGE_BUDGET = Number(process.env.OCR_PAGE_BUDGET || 60);
const MIN_TEXT_FOR_NO_OCR = Number(process.env.OCR_TEXT_THRESHOLD || 800);
const OCR_SCALE = Number(process.env.OCR_SCALE || 2);
const OCR_LANGS = process.env.OCR_LANGS || 'eng+hin';

let pageBudgetUsed = 0;
let ocrPagesUsed = 0;
let workerPromise = null;
let pdfParseModule = null;

export function ensurePdfGlobals() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor(init) {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        if (init && typeof init === 'object') Object.assign(this, init);
      }
      static fromMatrix() { return new globalThis.DOMMatrix(); }
      multiplySelf() { return this; }
      preMultiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      rotateSelf() { return this; }
      invertSelf() { return this; }
      inverse() { return new globalThis.DOMMatrix(); }
      toFloat32Array() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
    };
  }
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {
      constructor(width, height, data) {
        this.width = width;
        this.height = height;
        this.data = data || new Uint8ClampedArray(width * height * 4);
      }
    };
  }
  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {
      constructor() {}
      addPath() {}
      moveTo() {}
      lineTo() {}
      closePath() {}
      rect() {}
      arc() {}
      bezierCurveTo() {}
    };
  }
}

async function getPdfParse() {
  if (!pdfParseModule) {
    ensurePdfGlobals();
    pdfParseModule = await import('pdf-parse');
  }
  return pdfParseModule;
}

export function ocrBudgetLeft() {
  return Math.max(0, OCR_PAGE_BUDGET - pageBudgetUsed);
}

export function ocrStats() {
  return { pages: ocrPagesUsed, budgetUsed: pageBudgetUsed, budget: OCR_PAGE_BUDGET };
}

export async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(OCR_LANGS);
      return worker;
    })();
  }
  return workerPromise;
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;
}

export async function renderPdfPages(buf, { first } = {}) {
  const { PDFParse } = await getPdfParse();
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getScreenshot({
      first,
      scale: OCR_SCALE,
      imageDataUrl: false,
      imageBuffer: true,
    });
    return (result?.pages || []).map((p) => p.data).filter((d) => d && d.length > 0);
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

async function ocrImages(images) {
  const worker = await getOcrWorker();
  const parts = [];
  for (const image of images) {
    const { data } = await worker.recognize(image);
    parts.push(`-- ocr page ${parts.length + 1} --\n${(data?.text || '').trim()}`);
    pageBudgetUsed += 1;
    ocrPagesUsed += 1;
  }
  return parts.join('\n');
}

function ocrCacheFile(url) {
  const key = crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
  return path.join(CACHE_DIR, `${key}.txt`);
}

export async function extractPdfText(buf, { url = '', ocr = true } = {}) {
  const { PDFParse } = await getPdfParse();
  const parser = new PDFParse({ data: buf });
  let text = '';
  try {
    const result = await parser.getText();
    text = result?.text || '';
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
  if (!ocr || text.length >= MIN_TEXT_FOR_NO_OCR) return { text, mode: 'text' };

  const cacheFile = url ? ocrCacheFile(url) : '';
  if (cacheFile) {
    try {
      const cached = fs.readFileSync(cacheFile, 'utf8');
      if (cached.length > 200) return { text: cached, mode: 'ocr-cache', pages: 0 };
    } catch {
      /* miss */
    }
  }

  const budget = Math.min(MAX_OCR_PAGES_PER_PDF, ocrBudgetLeft());
  if (budget <= 0) return { text, mode: 'text', ocrSkipped: 'budget' };

  const lead = Math.max(1, budget - 2);
  const tail = budget - lead;
  const images = [
    ...(await renderPdfPages(buf, { first: lead })),
    ...(tail > 0 ? await renderPdfPages(buf, { last: tail }) : []),
  ];
  if (images.length === 0) return { text, mode: 'text', ocrSkipped: 'no-pages' };

  const ocrText = await ocrImages(images);
  if (cacheFile && ocrText.length > 200) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFile, ocrText);
    } catch {
      /* cache is best effort */
    }
  }

  return { text: `${text}\n${ocrText}`.trim(), mode: 'ocr', pages: images.length };
}
