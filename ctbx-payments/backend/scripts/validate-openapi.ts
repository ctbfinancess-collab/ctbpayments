import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const file = resolve(process.cwd(), '../docs/backend/openapi.yaml');
const document = parse(await readFile(file, 'utf8')) as Record<string, unknown>;
if (!String(document.openapi ?? '').startsWith('3.')) throw new Error('OpenAPI 3.x is required');
if (!document.paths || !document.components) throw new Error('OpenAPI must define paths and components');

const references = new Set<string>();
function walk(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && child.startsWith('#/')) references.add(child);
    walk(child);
  }
}
walk(document);

for (const reference of references) {
  const parts = reference.slice(2).split('/');
  let cursor: unknown = document;
  for (const part of parts) cursor = cursor && typeof cursor === 'object' ? (cursor as Record<string, unknown>)[part] : undefined;
  if (cursor === undefined) throw new Error(`Unresolved OpenAPI reference: ${reference}`);
}
console.log(`OpenAPI valid: ${references.size} internal references resolved`);
