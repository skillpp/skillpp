#!/usr/bin/env node
// Skill++ compatibility contract checker.
// Usage: node scripts/compatibility-check.mjs [baseline-json]

import { existsSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const baselineRel = process.argv[2] || 'tests/compatibility/v0.1.0.json';
const baselinePath = join(ROOT, baselineRel);

let passed = 0;
let failed = 0;

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf-8'));
}

function ok(message) {
  passed++;
  console.log(`  PASS ${message}`);
}

function fail(message) {
  failed++;
  console.error(`  FAIL ${message}`);
}

function assert(message, condition) {
  if (condition) ok(message);
  else fail(message);
}

function major(version) {
  return Number(String(version || '').split('.')[0]);
}

function includesInOrder(actual, required) {
  let cursor = 0;
  for (const item of actual) {
    if (item === required[cursor]) cursor++;
    if (cursor === required.length) return true;
  }
  return required.length === 0;
}

function runNodeScript(args) {
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 10000,
    windowsHide: true,
  });
}

console.log('Skill++ Compatibility Check\n');

if (!existsSync(baselinePath)) {
  console.error(`Baseline not found: ${baselineRel}`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
const pkg = readJson('package.json');
const manifest = readJson('skillpp.manifest.json');

console.log('1. Package contract');
assert('package major matches baseline', major(pkg.version) === baseline.major);
assert('package name is stable', pkg.name === baseline.package.name);
assert('CLI bin name is stable', Boolean(pkg.bin?.[baseline.package.bin]));
assert('CLI bin path is stable', pkg.bin?.[baseline.package.bin] === baseline.package.binPath);
for (const required of baseline.package.requiredFiles) {
  assert(`package files include ${required}`, pkg.files?.includes(required));
}

console.log('\n2. Manifest contract');
assert('manifest protocol is stable', manifest.protocol === baseline.manifest.protocol);
assert('manifest major matches baseline', major(manifest.version) === baseline.major);
for (const schemaFile of baseline.manifest.requiredSchemaFiles) {
  assert(`schema exists: ${schemaFile}`, existsSync(join(ROOT, 'schemas', schemaFile)));
}
for (const required of baseline.manifest.requiredSkills) {
  const current = manifest.skills.find(skill => skill.name === required.name);
  assert(`skill exists: ${required.name}`, Boolean(current));
  if (!current) continue;
  assert(`${required.name} group is stable`, current.group === required.group);
  assert(`${required.name} readOnly boundary is stable`, current.readOnly === required.readOnly);
}

console.log('\n3. Pipeline contract');
for (const required of baseline.manifest.pipelines) {
  const current = manifest.pipelines.find(pipeline => pipeline.id === required.id);
  assert(`pipeline exists: ${required.id}`, Boolean(current));
  if (!current) continue;
  assert(`${required.id} keeps required skill order`, includesInOrder(current.skills, required.requiredSkillsInOrder));
  for (const checkpoint of required.requiredCheckpoints) {
    assert(`${required.id} keeps checkpoint ${checkpoint}`, current.checkpoints?.includes(checkpoint));
  }
}

console.log('\n4. Checkpoint contract');
for (const required of baseline.manifest.checkpoints) {
  const current = manifest.checkpoints?.find(checkpoint => checkpoint.id === required.id);
  assert(`checkpoint exists: ${required.id}`, Boolean(current));
  if (!current) continue;
  assert(`${required.id} security level is stable`, current.securityLevel === required.securityLevel);
  assert(`${required.id} bypass policy is stable`, current.canBypass === required.canBypass);
}

console.log('\n5. CLI contract');
const help = runNodeScript(['scripts/skillpp.mjs', '--help']);
assert('help exits successfully', help.status === 0);
for (const command of baseline.cli.commands) {
  assert(`help lists ${command}`, help.stdout.includes(command));
}
for (const route of baseline.cli.routes) {
  const out = runNodeScript(['scripts/skillpp.mjs', route.command, route.input, '--dry-run']);
  assert(`${route.command} route exits successfully`, out.status === 0);
  assert(`${route.command} routes to ${route.pipeline}`, out.stdout.includes(route.pipeline));
}
const blocking = runNodeScript(['scripts/skillpp.mjs', 'trade', baseline.cli.routes.find(route => route.command === 'trade').input]);
assert('blocking checkpoint exits with baseline code', blocking.status === baseline.cli.checkpointExitCode);
assert('blocking checkpoint emits STOP_AND_WAIT', blocking.stdout.includes('STOP_AND_WAIT'));

console.log('\nResult');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
