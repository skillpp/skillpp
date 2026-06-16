#!/usr/bin/env node
// skillpp-validate.mjs - Skill++ manifest and schema validator
// Usage: node scripts/validate-skillpp.mjs [--strict]
// Exits 0 on pass, 1 on warnings, 2 on errors.

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

let errors = 0;
let warnings = 0;

function err(msg) { console.error(`FAIL ${msg}`); errors++; }
function warn(msg) { console.warn(`WARN ${msg}`); warnings++; }
function ok(msg) { console.log(`PASS ${msg}`); }

// 1. Check manifest exists and is valid JSON
console.log('\n-- Manifest --');
const manifestPath = join(ROOT, 'skillpp.manifest.json');
if (!existsSync(manifestPath)) {
  err('skillpp.manifest.json not found');
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    ok(`manifest valid JSON (${manifest.skills.length} skills, ${manifest.pipelines.length} pipelines)`);

    // Check each skill path exists
    for (const skill of manifest.skills) {
      const skillPath = join(ROOT, skill.path, skill.entry);
      if (!existsSync(skillPath)) {
        err(`skill path not found: ${skill.path}${skill.entry}`);
      }
    }
  } catch (e) {
    err(`manifest parse error: ${e.message}`);
  }
}

// 2. Check all SKILL.md files for BOM and frontmatter
console.log('\n-- SKILL.md Checks --');
function walkDir(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      try {
        if (statSync(full).isDirectory()) {
          files.push(...walkDir(full));
        } else if (entry === 'SKILL.md') {
          files.push(full);
        }
      } catch {}
    }
  } catch {}
  return files;
}

const skillFiles = walkDir(join(ROOT, 'skills'));
// Also check root SKILL.md
if (existsSync(join(ROOT, 'SKILL.md'))) {
  skillFiles.push(join(ROOT, 'SKILL.md'));
}

for (const f of skillFiles) {
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  try {
    const raw = readFileSync(f);
    let buf = raw;
    if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
      buf = raw.subarray(3);
      err(`BOM detected: ${rel}`);
    }
    const text = buf.toString('utf-8');

    // Frontmatter check
    const fm = /^---\s*\n([\s\S]*?)\n---/.exec(text);
    if (!fm) {
      err(`no frontmatter: ${rel}`);
    } else {
      const frontmatter = fm[1];
      const hasName = /^name:\s*\S/m.test(frontmatter);
      const hasDesc = /^description:\s*\S/m.test(frontmatter);

      if (!hasName) err(`missing 'name' in frontmatter: ${rel}`);
      if (!hasDesc) err(`missing 'description' in frontmatter: ${rel}`);

      // Non-standard fields (official spec allows: name/description/license/allowed-tools/metadata)
      const nonStandard = ['version', 'category', 'capabilities', 'trigger'];
      for (const field of nonStandard) {
        if (new RegExp(`^${field}:`, 'm').test(frontmatter)) {
          if (STRICT) {
            err(`non-standard field '${field}' in frontmatter: ${rel}`);
          } else {
            warn(`non-standard field '${field}' in frontmatter: ${rel} (use --strict to error)`);
          }
        }
      }
    }
  } catch (e) {
    err(`read error ${rel}: ${e.message}`);
  }
}
ok(`${skillFiles.length} SKILL.md files checked`);

// 3. Check schemas directory
console.log('\n-- Schemas --');
const schemasDir = join(ROOT, 'schemas');
const requiredSchemas = ['handoff.schema.json', 'token.schema.json', 'audit.schema.json', 'checkpoint.schema.json'];
for (const s of requiredSchemas) {
  const sp = join(schemasDir, s);
  if (!existsSync(sp)) {
    err(`schema missing: ${s}`);
  } else {
    try {
      JSON.parse(readFileSync(sp, 'utf-8'));
      ok(`${s} valid`);
    } catch (e) {
      err(`${s} invalid JSON: ${e.message}`);
    }
  }
}

// 4. Summary
console.log(`\n-- Result --`);
console.log(`Errors: ${errors}, Warnings: ${warnings}`);
if (errors > 0) {
  console.log('STATUS: FAIL');
  process.exit(2);
} else if (warnings > 0) {
  console.log('STATUS: PASS WITH WARNINGS');
  process.exit(1);
} else {
  console.log('STATUS: PASS');
  process.exit(0);
}
