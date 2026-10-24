// Validates content/ before it is published to the static host.
// Usage: npm run content:validate
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'content');
// Lock screen banner shows ~3 lines; longer text gets truncated.
const MAX_FACT_LENGTH = 160;

const errors = [];
const seenTexts = new Map();
const readJSON = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

const manifest = readJSON('index.json');
if (manifest.schemaVersion !== 1) errors.push('index.json: schemaVersion must be 1');

const topicIds = new Set();
for (const topic of manifest.topics) {
  const where = `index.json → ${topic.id}`;
  for (const key of ['id', 'title', 'description', 'symbol', 'file']) {
    if (typeof topic[key] !== 'string' || !topic[key]) errors.push(`${where}: missing "${key}"`);
  }
  if (!Number.isInteger(topic.version) || topic.version < 1) errors.push(`${where}: version must be a positive integer`);
  if (topicIds.has(topic.id)) errors.push(`${where}: duplicate topic id`);
  topicIds.add(topic.id);

  let pack;
  try {
    pack = readJSON(topic.file);
  } catch (e) {
    errors.push(`${where}: cannot read ${topic.file} (${e.message})`);
    continue;
  }
  if (pack.id !== topic.id) errors.push(`${topic.file}: id "${pack.id}" does not match manifest "${topic.id}"`);
  if (pack.version !== topic.version) errors.push(`${topic.file}: version ${pack.version} does not match manifest ${topic.version}`);
  if (pack.title !== topic.title || pack.symbol !== topic.symbol) errors.push(`${topic.file}: title/symbol must match manifest`);
  if (pack.facts.length !== topic.count) errors.push(`${topic.file}: has ${pack.facts.length} facts, manifest says ${topic.count}`);

  const factIds = new Set();
  for (const fact of pack.facts) {
    if (factIds.has(fact.id)) errors.push(`${topic.file}: duplicate fact id ${fact.id}`);
    factIds.add(fact.id);
    const key = typeof fact.text === 'string' ? fact.text.trim().toLowerCase() : '';
    if (key && seenTexts.has(key)) errors.push(`${topic.file}: ${fact.id} duplicates ${seenTexts.get(key)}`);
    else if (key) seenTexts.set(key, fact.id);
    if (typeof fact.text !== 'string' || !fact.text.trim()) errors.push(`${topic.file}: ${fact.id} has empty text`);
    else if (fact.text.length > MAX_FACT_LENGTH) errors.push(`${topic.file}: ${fact.id} is ${fact.text.length} chars (max ${MAX_FACT_LENGTH})`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${manifest.topics.length} topics valid`);

// The legal pages are public App Store documents: shout (without blocking content deploys)
// if the developer/contact placeholders were never filled in.
import { readdirSync as listDir, readFileSync as readFile } from 'node:fs';
const legalDir = new URL('../content/legal/', import.meta.url);
for (const file of listDir(legalDir).filter((f) => f.endsWith('.html'))) {
  if (/\[(İLETİŞİM E-POSTASI|GELİŞTİRİCİ ADI[^\]]*)\]/.test(readFile(new URL(file, legalDir), 'utf8'))) {
    console.warn(`! legal/${file} still has [placeholders]: fill in the developer name and contact e-mail before the App Store release`);
  }
}
