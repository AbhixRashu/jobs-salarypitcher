const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—',
  ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…',
};

const SECTION_HEADS = {
  dates: /^(important dates?|key dates?|dates? of (?:importance|events)|schedule(?: of events)?|timeline|salient dates?|exam date|important timeline|महत्वपूर्ण तिथि|समय सारणी|कार्यक्रम)/i,
  vacancy: /^(vacanc(?:y|ies)(?: details?| information| position| break-?up| distribution| strength)?|details? of vacanc|post[- ]wise|category[- ]wise vacanc|रिक्ति|पदवार|पदों का विवरण|कुल पद)/i,
  eligibility: /^(educational qualification(?:s)?|qualification(?: details?|s)?|eligibility criteria|essential qualification|शैक्षिक योग्यता|पात्रता|योग्यता)/i,
  age: /^(age (?:limit|criteria|relaxation|group)|upper age|minimum age|आयु सीमा|आयु अर्हता|आयु प्रतिबंध)/i,
  fee: /^(application fee|fee (?:details?|structure|payment|particulars)|exam(?:ination)? fee|शुल्क|आवेदन शुल्क|फीस)/i,
  pattern: /^(exam(?:ination)? pattern|test pattern|exam structure|scheme of examination|परीक्षा पैटर्न|परीक्षा की रूपरेखा)/i,
  syllabus: /^(syllabus|curriculum|subject(?:-wise)? syllabus|पाठ्यक्रम|सिलेबस)/i,
  selection: /^(selection (?:process|procedure|criteria|criterion|method|scheme)|mode of selection|चयन (?:प्रक्रिया|की विधि|विधि|नियम))/i,
  apply: /^(how to apply|procedure to apply|online application (?:procedure|process|system)|instructions? for (?:applying|application)|application procedure|आवेदन करने की विधि|आवेदन प्रक्रिया)/i,
  docs: /^(documents? (?:required|to be uploaded|needed|produced)|list of documents|enclosures? required|आवश्यक दस्तावेज|दस्तावेजों की सूची)/i,
  salary: /^(salary|pay (?:scale|matrix|details?|band)|remuneration|compensation|वेतन|वेतनमान|वेतन का ढाँचा)/i,
};

const HEAD_RULES = Object.values(SECTION_HEADS);

const QUAL_RE = /\b(10th pass|10th|matric(?:ulation)?|12th pass|12th|intermediate|higher secondary|senior secondary|graduation|graduate|bachelor(?:'s)?|master(?:'s)?|post-?graduate|diploma|it i\b|b\.?tech|b\.?e\b|m\.?b\.?b\.?s|\bmd\b|\bms\b|ph\.?d|nursing|polytechnic|recognized board|equivalent qualification|मैट्रिक|दसवीं|बारहवीं|स्नातक|स्नातकोत्तर|डिप्लोमा|मान्यता प्राप्त)/i;

const NOISE_RE = /buy books|flipkart|amazon|subscribe|subscription|advertis|bharatkosh|e-version|print version|click here|cookie|privacy policy|contact us|rate card|tender|empanel|deputation basis|panel of|for disposal|©|all rights reserved/i;

const CONTENT_RE = /recruit|vacanc|posts?|candidates?|examination|application|engagement|appointment|eligib|age limit|syllabus|pay scale|salary|notification|advertis|form|पद|अभ्यर्थी|परीक्षा|आवेदन|भर्ती/i;

function looksLikeContent(text) {
  const s = String(text || '').trim();
  if (s.length < 20 || s.length > 600) return false;
  if (NOISE_RE.test(s)) return false;
  if (/^\(?[a-z0-9]{1,2}\)?[).]\s/.test(s)) return false;
  if (/^[a-z]/.test(s)) return false;
  return true;
}


const SUBJECT_RE = /^(general (?:awareness|knowledge|science|studies|intelligence)|current affairs|quantitative aptitude|numerical ability|mathematics|maths|reasoning|logical reasoning|general (?:english|hindi)|english (?:language|comprehension|grammar)?|hindi|history|geography|polity|civics|economics|physics|chemistry|biology|science|computer (?:knowledge|awareness|fundamentals)?|data interpretation|banking awareness|इतिहास|भूगोल|राजव्यवस्था|अर्थशास्त्र|विज्ञान|कंप्यूटर|सामान्य ज्ञान|सामान्य अंग्रेजी|सामान्य हिंदी|तर्कशक्ति|गणित|हिंदी|अंग्रेजी|वर्तमान घटनाक्रम|विज्ञान)\s*[:\-–]?$/i;

const NUM_RE = /^\d{1,6}(?:[.,]\d+)?$/;

function decodeEntities(text) {
  return String(text).replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    const key = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : m;
  });
}

export function htmlToText(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<\/(tr|p|li|h[1-6]|div|table|ul|ol|section|article|dt|dd|caption)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  s = s.replace(/\r/g, '').replace(/[ \t ]+/g, ' ');
  return s
    .split('\n')
    .map((line) => line
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/(?:\|\s*){2,}/g, '| ')
      .replace(/^[\s|]+|[\s|]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter((line) => line.length > 0);
}

function parseDateValue(text) {
  const dotted = String(text).match(/\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})\b/);
  if (dotted) {
    const [, d, m, y] = dotted;
    const dd = Number(d);
    const mm = Number(m);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  const longForm = String(text).match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i
  );
  if (longForm) {
    const [, d, mon, y] = longForm;
    if (Number(d) >= 1 && Number(d) <= 31) return `${y}-${MONTHS[mon.toLowerCase()]}-${d.padStart(2, '0')}`;
  }
  const usForm = String(text).match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i
  );
  if (usForm) {
    const [, mon, d, y] = usForm;
    if (Number(d) >= 1 && Number(d) <= 31) return `${y}-${MONTHS[mon.toLowerCase()]}-${d.padStart(2, '0')}`;
  }
  return null;
}

function isHeadingLine(line) {
  if (line.length > 90) return false;
  return HEAD_RULES.some((re) => re.test(line));
}

function findSection(lines, sectionKey, maxLines = 40) {
  const headRe = SECTION_HEADS[sectionKey];
  if (!headRe) return [];
  const start = lines.findIndex((l) => l.length <= 90 && headRe.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length && out.length < maxLines; i += 1) {
    const line = lines[i];
    if (isHeadingLine(line) && out.length > 0) break;
    out.push(line);
  }
  return out;
}

function stripBullet(line) {
  return line.replace(/^\s*(?:[•\-*–]|\d{1,2}[.)])\s*/, '').trim();
}

function sentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;])\s+|\s+(?:\band\s+)?(?=(?:the\s+)?(?:candidate|applicant)\s)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

export function parseImportantDates(sectionLines) {
  const out = [];
  const seen = new Set();
  const dateRe = /\d{1,2}[./\-]\d{1,2}[./\-]\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i;
  for (const line of sectionLines) {
    const m = dateRe.exec(line);
    if (!m) continue;
    const date = parseDateValue(m[0]);
    if (!date) continue;
    let label = line.slice(0, m.index).replace(/[\s:;,.•\-–—]+$/, '').trim();
    if (label.length < 3) {
      label = line.slice(m.index + m[0].length).replace(/^[\s:;,.•\-–—]+/, '').trim().slice(0, 70);
    }
    label = label.replace(/\s{2,}/g, ' ').slice(0, 70);
    if (!/[\p{L}\p{N}]/u.test(label)) continue;
    const key = `${label.toLowerCase()}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, date });
    if (out.length >= 14) break;
  }
  return out;
}

export function parseVacancyBreakdown(sectionLines, fullText = '') {
  const rows = [];
  const seen = new Set();
  const push = (name, posts) => {
    const n = Number(posts);
    if (!Number.isInteger(n) || n <= 0 || n > 2_000_000) return;
    const clean = stripBullet(String(name)).replace(/\s{2,}/g, ' ').trim().replace(/[\s:|]+$/, '');
    if (clean.length < 3 || clean.length > 80 || /^\d+$/.test(clean)) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ post: clean, posts: n });
  };

  for (const line of sectionLines) {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const numeric = parts.filter((p) => NUM_RE.test(p));
      if (numeric.length >= 1 && parts.length <= 6) {
        const label = parts.find((p) => !NUM_RE.test(p) && /[\p{L}]/u.test(p));
        if (label) {
          push(label, numeric[0]);
          continue;
        }
      }
    }
    const forward = line.match(/^(.{3,70}?)\s*[:\-–|]\s*(\d{1,6})\s*(?:posts?|vacanc(?:y|ies)|openings|पद|पदों)?\b/i);
    if (forward) {
      push(forward[1], forward[2]);
      continue;
    }
    const reverse = line.match(/^(\d{1,6})\s*(?:posts?|vacanc(?:y|ies)|openings|पदों|पद)\s*(?:[:\-–|]\s*)?(.{3,70})$/i);
    if (reverse) push(reverse[2], reverse[1]);
  }

  if (rows.length === 0 && fullText) {
    const re = /([A-Za-z][A-Za-z0-9 ()/&.+-]{2,60}?)\s*[-–:]\s*(\d{2,6})\s*(?:posts?|vacanc(?:y|ies))/gi;
    let m;
    while ((m = re.exec(fullText)) && rows.length < 20) push(m[1], m[2]);
  }

  return rows.slice(0, 25);
}

export function parseEligibility(sectionLines, fullText = '') {
  const notes = [];
  const source = sectionLines.length ? sectionLines : [];
  const candidates = [...sentences(source.join(' ')), ...sentences(fullText)];
  for (const s of candidates) {
    if (!QUAL_RE.test(s)) continue;
    if (/placeholder|check official/i.test(s)) continue;
    const clean = s.replace(/\s{2,}/g, ' ').trim().slice(0, 400);
    if (clean.length < 25 || !looksLikeContent(clean)) continue;
    if (!notes.includes(clean)) notes.push(clean);
    if (notes.length >= 3) break;
  }
  return { qualify: notes[0] || null, qualificationNotes: notes };
}

export function parseAgeLimit(sectionLines) {
  if (!sectionLines.length) return null;
  const joined = sectionLines.join(' ');
  let min = null;
  let max = null;
  let m = joined.match(/(?:between\s*)?(\d{2})\s*(?:-|–|to|and|se|से)\s*(\d{2})\s*(?:years?|वर्ष)/i);
  if (m) {
    min = Number(m[1]);
    max = Number(m[2]);
  }
  if (min === null) {
    m = joined.match(/(?:not\s+)?(?:less|below|lower)\s+than\s+(\d{2})\s*(?:years?|वर्ष)?/i) || joined.match(/minimum\s+age[^0-9]{0,20}(\d{2})/i);
    if (m) min = Number(m[1]);
  }
  if (max === null) {
    m = joined.match(/(?:upper|maximum)\s+(?:age\s*)?(?:limit\s*)?(?:of\s*)?(\d{2})/i)
      || joined.match(/(?:max(?:imum)?)[^0-9]{0,15}(\d{2})\s*(?:years?|वर्ष)/i)
      || joined.match(/up\s+to\s+(\d{2})\s*(?:years?|वर्ष)/i);
    if (m) max = Number(m[1]);
  }
  if (min !== null && max !== null && max < min) {
    const t = min;
    min = max;
    max = t;
  }
  if (min === null && max === null) return null;

  const relaxation = [];
  const cats = [
    ['sc', 'SC'], ['st', 'ST'], ['obc', 'OBC'], ['ews', 'EWS'],
    ['p[_]?w[_]?d', 'PwD'], ['ph', 'PwD'], ['ex[_\\s-]?servicemen', 'Ex-servicemen'],
    ['women', 'Women'], ['female', 'Women'], ['general', 'General'],
  ];
  for (const [pattern, label] of cats) {
    const re = new RegExp(`\\b(?:${pattern})\\b[^\\d]{0,45}?(\\d{1,2})\\s*(?:years?|वर्ष)`, 'i');
    const hit = joined.match(re);
    if (hit) {
      const years = Number(hit[1]);
      if (years >= 1 && years <= 15 && !relaxation.some((r) => r.category === label)) {
        relaxation.push({ category: label, years });
      }
    }
  }

  const asOn = joined.match(/as\s+on\s+\d{1,2}[./\-]\d{1,2}[./\-]\d{4}/i);
  return {
    min,
    max,
    relaxation,
    asOn: asOn ? asOn[0] : null,
    note: null,
  };
}

export function parseFee(sectionLines) {
  const rows = [];
  const seen = new Set();
  const CAT = /(?:general|unreserved|reserved|ur\b|gen\b|obc|ews|sc\b|st\b|ph\b|p[_]?w[_]?d|female|women|ex[\s-]?servicemen|candidate|applicant|all other categories)/i;
  const push = (category, amount) => {
    const clean = stripBullet(String(category)).replace(/\s{2,}/g, ' ').replace(/[\s:|,]+$/, '').trim().slice(0, 45);
    if (clean.length < 2 || !/[\p{L}]/u.test(clean)) return;
    if (!CAT.test(clean)) return;
    const key = `${clean.toLowerCase()}|${amount}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ category: clean, amount });
  };

  for (const line of sectionLines) {
    const moneyRe = /([\p{L}\p{N}\s/,&()'-]{3,50}?)\s*[:\-–]?\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/giu;
    let m;
    while ((m = moneyRe.exec(line))) push(m[1], `₹${m[2]}`);

    const nilRe = /([\p{L}\p{N}\s/,&()'-]{3,50}?)\s*[:\-–]?\s*(?:(?:are|is|shall be)\s+)?(?:exempted|nil|no fee|free of cost|waived|छूट|शुल्क नहीं)/giu;
    let n;
    while ((n = nilRe.exec(line))) push(n[1], 'Nil');
  }
  return rows.slice(0, 12);
}

export function parseExamPattern(sectionLines) {
  const rows = [];
  const seen = new Set();
  for (const line of sectionLines) {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const nums = parts.filter((p) => NUM_RE.test(p));
      const label = parts.find((p) => !NUM_RE.test(p) && /[\p{L}]/u.test(p));
      if (label && nums.length >= 2 && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        rows.push({ stage: label.slice(0, 80), detail: parts.filter((p) => p !== label).join(' · ').slice(0, 140) });
        continue;
      }
    }
    if (/\d/.test(line) && /(marks?|questions?|minutes?|hours?|मिनट|घंटे|अंक)/i.test(line) && !isHeadingLine(line)) {
      const clean = line.replace(/\s*\|\s*/g, ' · ').replace(/\s{2,}/g, ' ').trim().slice(0, 160);
      if (clean.length > 12 && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        rows.push({ stage: clean.split('·')[0].trim().slice(0, 80), detail: clean });
      }
    }
    if (rows.length >= 12) break;
  }
  return rows;
}

export function parseSyllabus(sectionLines) {
  if (!sectionLines.length) return [];
  const groups = [];
  let current = null;
  for (const raw of sectionLines) {
    const line = stripBullet(raw);
    if (!line) continue;
    if (SUBJECT_RE.test(line.replace(/\s{2,}/g, ' ').trim())) {
      current = { section: line.replace(/[:\-–]+$/, '').trim().slice(0, 60), topics: [] };
      groups.push(current);
      continue;
    }
    if (isHeadingLine(line)) break;
    const topic = line.slice(0, 200);
    if (!current) {
      current = { section: 'Syllabus', topics: [] };
      groups.push(current);
    }
    if (!current.topics.includes(topic)) current.topics.push(topic);
    if (current.topics.length >= 25) break;
  }
  return groups.filter((g) => g.topics.length > 0).slice(0, 12);
}

export function parseSelection(sectionLines) {
  const stages = [];
  for (const raw of sectionLines) {
    if (isHeadingLine(raw)) break;
    let line = stripBullet(raw);
    line = line.replace(
      /^(?:the\s+)?(?:candidate\s+)?(?:selection\s+(?:will\s+be|is|has\s+been)\s+(?:based\s+on|done\s+through|made\s+through|conducted\s+as|carried\s+out\s+as)|selection\s+(?:process|procedure|scheme)\s+(?:consists?|comprises?)\s+of|the\s+selection\s+process\s+consists?\s+of|selection\s+will\s+be\s+made\s+on\s+the\s+basis\s+of)\s*/i,
      ''
    );
    const pieces = line
      .split(/\s*[;|]\s*|\s+and\s+|\s*,\s*/i)
      .map((p) => p.replace(/^[\s:.\-–]+|[\s.]+$/g, '').trim())
      .filter((p) => p.length >= 6 && p.length <= 220 && !isHeadingLine(p));
    for (const clean of pieces) {
      if (!stages.includes(clean)) stages.push(clean);
      if (stages.length >= 8) return stages;
    }
  }
  return stages;
}

export function parseSteps(sectionLines, max = 8) {
  const steps = [];
  for (const raw of sectionLines) {
    if (isHeadingLine(raw)) break;
    const clean = stripBullet(raw).replace(/\s{2,}/g, ' ').trim();
    if (clean.length < 8 || clean.length > 400) continue;
    if (NOISE_RE.test(clean)) continue;
    if (/^(?:click|visit|open|login|register)\b/i.test(clean) || /\d/.test(clean) || clean.length > 40) {
      if (!steps.includes(clean)) steps.push(clean);
    }
    if (steps.length >= max) break;
  }
  return steps;
}

export function parseDocuments(sectionLines) {
  const docs = [];
  for (const raw of sectionLines) {
    if (isHeadingLine(raw)) break;
    const clean = stripBullet(raw).replace(/\s{2,}/g, ' ').replace(/\s*[:.]+$/, '').trim();
    if (clean.length < 4 || clean.length > 120) continue;
    if (NOISE_RE.test(clean)) continue;
    if (!docs.includes(clean)) docs.push(clean);
    if (docs.length >= 12) break;
  }
  return docs;
}

export function parseSalary(sectionLines, fullText = '') {
  const source = [...sectionLines, ...sentences(fullText)];
  const parts = [];
  let payLevel = null;
  let salaryText = null;
  for (const raw of source) {
    const line = String(raw);
    if (NOISE_RE.test(line)) continue;
    if (!salaryText) {
      const m = line.match(/(?:rs\.?|₹|inr)\s*([\d,]+)\s*(?:-|–|to)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)[^.\n]{0,30}(?:month|annum|per m|p\.?m\.?|p\.?a\.?|मासिक|वार्षिक)/i)
        || line.match(/(?:rs\.?|₹|inr)\s*([\d,]+)[^.\n]{0,40}(?:per\s+(?:month|annum)|मासिक|वार्षिक)/i);
      if (m) salaryText = line.replace(/\s{2,}/g, ' ').trim().slice(0, 200);
    }
    if (!payLevel) {
      const lvl = line.match(/\b(?:pay matrix level|level)[-:\s]*(\d{1,2})\b/i) || line.match(/\blevel[-:\s]*(\d{1,2})\b/i);
      if (lvl && /(pay|level|matrix|वेतन)/i.test(line)) payLevel = `Level ${lvl[1]}`;
    }
    if (salaryText && payLevel) break;
  }
  if (!payLevel) {
    const cpc = fullText.match(/\b7th\s+(?:cpc|pay commission)\b/i);
    if (cpc) payLevel = '7th CPC';
  }
  return { salaryText, payLevel };
}

export function parseExamMeta(sectionLines, fullText = '') {
  let examDate = null;
  let examTiming = null;
  const joined = [...sectionLines, ...fullText.split('\n')];
  for (const line of joined) {
    if (!examDate && /(exam|test|परीक्षा)/i.test(line)) {
      const d = parseDateValue(line);
      if (d) examDate = d;
    }
    if (!examTiming) {
      const t = String(line).match(
        /\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)[^0-9]{0,40}(?:to|-|–|से)\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)/
      );
      if (t) examTiming = t[0];
    }
    if (examDate && examTiming) break;
  }
  return { examDate, examTiming };
}

function extractDescription(lines) {
  for (const line of lines) {
    if (line.length < 130 || line.length > 700) continue;
    if (line.includes('|')) continue;
    const words = line.split(/\s+/);
    if (words.length < 18) continue;
    if (isHeadingLine(line)) continue;
    if (!looksLikeContent(line)) continue;
    if (!CONTENT_RE.test(line)) continue;
    return line.slice(0, 500);
  }
  return null;
}

export function extractLinks(html, baseUrl) {
  const out = { applyUrl: null, notificationPdf: null };
  const anchorRe = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  const resolved = [];
  while ((m = anchorRe.exec(String(html)))) {
    let href = m[1].trim();
    if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const abs = new URL(href, baseUrl).href;
      if (!/^https?:/i.test(abs)) continue;
      resolved.push({ abs, text });
    } catch {
      continue;
    }
  }
  for (const { abs, text } of resolved) {
    if (!out.notificationPdf && /\.pdf(\?|#|$)/i.test(abs)) {
      const strong = /notification|advertisement|corrigendum|details|short notice|विज्ञापन|सूचना|pdf/i.test(text) || /\.pdf/i.test(abs);
      if (strong) out.notificationPdf = abs;
    }
  }
  for (const { abs, text } of resolved) {
    if (/\.pdf(\?|#|$)/i.test(abs)) continue;
    if (/(apply|registration|register|online[-_\s]?form|signup|applyonline|application)/i.test(`${abs} ${text}`)) {
      out.applyUrl = abs;
      break;
    }
  }
  if (!out.applyUrl && out.notificationPdf) out.applyUrl = out.notificationPdf;
  return out;
}

export function parseJobDetails(text, options = {}) {
  const lines = Array.isArray(text) ? text : String(text || '').split('\n');
  const cleanLines = lines.map((l) => l.trim()).filter(Boolean);
  const fullText = cleanLines.join('\n');

  const dateLines = findSection(cleanLines, 'dates', 30);
  const importantDates = parseImportantDates(dateLines);
  const vacancyBreakdown = parseVacancyBreakdown(findSection(cleanLines, 'vacancy', 40), fullText);
  const eligibility = parseEligibility(findSection(cleanLines, 'eligibility', 30), fullText);
  const ageLimit = parseAgeLimit(findSection(cleanLines, 'age', 30));
  const fee = parseFee(findSection(cleanLines, 'fee', 30));
  const examPattern = parseExamPattern(findSection(cleanLines, 'pattern', 30));
  const syllabus = parseSyllabus(findSection(cleanLines, 'syllabus', 60));
  const selectionProcess = parseSelection(findSection(cleanLines, 'selection', 30));
  const howToApply = parseSteps(findSection(cleanLines, 'apply', 30));
  const documents = parseDocuments(findSection(cleanLines, 'docs', 30));
  const { salaryText, payLevel } = parseSalary(findSection(cleanLines, 'salary', 20), fullText);
  const { examDate, examTiming } = parseExamMeta(dateLines, fullText);
  const description = options.description || extractDescription(cleanLines);

  const out = {};
  if (importantDates.length) out.importantDates = importantDates;
  if (vacancyBreakdown.length) out.vacancyBreakdown = vacancyBreakdown;
  if (eligibility.qualify) {
    out.qualify = eligibility.qualify;
    if (eligibility.qualificationNotes.length > 1) out.qualificationNotes = eligibility.qualificationNotes;
  }
  if (ageLimit) out.ageLimit = ageLimit;
  if (fee.length) out.fee = fee;
  if (examPattern.length) out.examPattern = examPattern;
  if (syllabus.length) out.syllabus = syllabus;
  if (selectionProcess.length) out.selectionProcess = selectionProcess;
  if (howToApply.length) out.howToApply = howToApply;
  if (documents.length) out.documents = documents;
  if (salaryText) out.salaryText = salaryText;
  if (payLevel) out.payLevel = payLevel;
  if (examDate) out.examDate = examDate;
  if (examTiming) out.examTiming = examTiming;
  if (description) out.description = description;
  return out;
}

export async function fetchPage(url, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-IN,en;q=0.9,hi;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function detailSectionCount(job) {
  let n = 0;
  if (job.importantDates?.length) n += 1;
  if (job.vacancyBreakdown?.length) n += 1;
  if (job.qualify) n += 1;
  if (job.ageLimit && (job.ageLimit.min !== null || job.ageLimit.max !== null)) n += 1;
  if (job.fee?.length) n += 1;
  if (job.examPattern?.length) n += 1;
  if (job.syllabus?.length) n += 1;
  if (job.selectionProcess?.length) n += 1;
  if (job.howToApply?.length) n += 1;
  if (job.documents?.length) n += 1;
  if (job.salaryText || job.payLevel) n += 1;
  return n;
}

export async function enrichJobFromPage(job) {
  if (!job.sourceUrl) return job;
  let html;
  try {
    html = await fetchPage(job.sourceUrl);
  } catch {
    return { ...job, extractionLevel: 'rss-title' };
  }
  const links = extractLinks(html, job.sourceUrl);
  const lines = htmlToText(html);
  const details = parseJobDetails(lines);
  const merged = { ...job };

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (merged[key] === undefined || merged[key] === null || (Array.isArray(merged[key]) && merged[key].length === 0)) {
      merged[key] = value;
    } else if (Array.isArray(merged[key]) && Array.isArray(value)) {
      merged[key] = [...merged[key], ...value.filter((v) => !merged[key].some((e) => JSON.stringify(e) === JSON.stringify(v)))];
    } else if (typeof merged[key] === 'string' && merged[key].length < value.length && typeof value === 'string') {
      merged[key] = value;
    }
  }

  if (!merged.applyUrl && links.applyUrl) merged.applyUrl = links.applyUrl;
  if (!merged.notificationPdf && links.notificationPdf) merged.notificationPdf = links.notificationPdf;
  merged.extractionLevel = detailSectionCount(merged) >= 2 ? 'page-detail' : 'page-basic';
  return merged;
}

export async function enrichCandidates(candidates, { concurrency = 4, max = Infinity, prefix = '[enrich]' } = {}) {
  const jobs = candidates.filter((c) => c.kind === 'job').slice(0, max);
  if (jobs.length === 0) return candidates;
  const workers = Math.min(concurrency, jobs.length);
  let index = 0;
  const run = async () => {
    while (index < jobs.length) {
      const job = jobs[index];
      index += 1;
      try {
        Object.assign(job, await enrichJobFromPage(job));
      } catch {
        job.extractionLevel = 'rss-title';
      }
      console.log(
        `${prefix} ${job.slug.slice(0, 55)} -> ${job.extractionLevel} (sections=${detailSectionCount(job)})`
      );
    }
  };
  await Promise.all(Array.from({ length: workers }, run));
  return candidates;
}
