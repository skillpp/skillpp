#!/usr/bin/env node
// Skill++ self-test runner.
// Usage: node scripts/selftest.mjs [--verbose] [--integration]

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
const INTEGRATION = process.argv.includes('--integration');

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    if (VERBOSE) console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}: ${e.message}`);
  }
}

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

function run(command) {
  return execSync(command, { encoding: 'utf-8', timeout: 5000, stdio: 'pipe' });
}

function walkTextFiles(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return [];
  const stat = statSync(abs);
  if (stat.isFile()) return [relPath];
  const files = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const childRel = `${relPath}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walkTextFiles(childRel));
    else if (/\.(md|mjs|json|yml|yaml)$/.test(entry.name)) files.push(childRel);
  }
  return files;
}

function assertIncludes(text, required, label) {
  for (const item of required) {
    if (!text.includes(item)) throw new Error(`${label} missing ${item}`);
  }
}

console.log('Skill++ Self-Test\n');

console.log('1. Structure');
test('root files exist', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'COMPATIBILITY.md', 'SKILL.md', 'registry.md', 'pipelines.md', 'rules.md', 'package.json', 'skillpp.manifest.json']) {
    if (!existsSync(join(ROOT, f))) throw new Error(`missing ${f}`);
  }
});
test('manifest is valid JSON', () => {
  JSON.parse(read('skillpp.manifest.json'));
});
test('root markdown files have no UTF-8 BOM', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'SKILL.md', 'registry.md', 'pipelines.md', 'rules.md']) {
    const raw = readFileSync(join(ROOT, f));
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) throw new Error(`BOM: ${f}`);
  }
});
test('schemas exist', () => {
  for (const s of ['handoff', 'token', 'audit', 'checkpoint']) {
    if (!existsSync(join(ROOT, 'schemas', `${s}.schema.json`))) throw new Error(`missing ${s}`);
  }
});

console.log('\n2. Runtime');
const ROUTE_TESTS = [
  { cmd: 'analyze', input: '0x55d398326f99059ff775485246999027b3197955', expectPipeline: 'P_TOKEN_ANALYSIS' },
  { cmd: 'scan', input: '56', expectPipeline: 'P_CHAIN_SCAN' },
  { cmd: 'trade', input: '0x55d398326f99059ff775485246999027b3197955', expectPipeline: 'P_TRADE_SAFETY' },
  { cmd: 'audit', input: '0x55d398326f99059ff775485246999027b3197955', expectPipeline: 'P_DEEP_AUDIT' },
  { cmd: 'wallet', input: '0x55d398326f99059ff775485246999027b3197955', expectPipeline: 'P_WALLET_XRAY' },
  { cmd: 'signals', input: '56', expectPipeline: 'P_SMART_MONEY' },
  { cmd: 'create', input: 'create a meme token on four.meme', expectPipeline: 'P_FOURMEME_CREATE' },
  { cmd: 'parse', input: 'https://bscscan.com/address/0x1234567890abcdef1234567890abcdef12345678#code', expectType: 'explorer_url' },
  { cmd: 'parse', input: 'CT_501', expectType: 'chain_id' },
];
for (const rt of ROUTE_TESTS) {
  test(`route ${rt.cmd}`, () => {
    const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" ${rt.cmd} "${rt.input}" --dry-run`);
    if (rt.expectType && !out.includes(`"type": "${rt.expectType}"`)) throw new Error(`expected type ${rt.expectType}`);
    if (rt.expectPipeline && !out.includes(rt.expectPipeline)) throw new Error(`expected pipeline ${rt.expectPipeline}`);
  });
}
test('scan dry-run includes full chain scan subflow', () => {
  const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" scan "56" --dry-run`);
  assertIncludes(out, ['meme-rush', 'topic-rush', 'token-rank', 'smart-money-inflow', 'risk-fusion', 'opportunity-board'], 'scan output');
});
test('doctor redacts local paths by default', () => {
  const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" doctor`);
  assertIncludes(out, ['"command": "doctor"', '"packageRoot"', '"skillsDir"', '"skills": 25', '"pipelines": 7', '"externalCli"', '"baw"', '"binance-cli"', '"fourmeme"'], 'doctor output');
  const report = JSON.parse(out);
  if (report.packageRoot !== '<redacted>') throw new Error('packageRoot must be redacted');
  if (!report.privacy?.includes('redacted')) throw new Error('missing redaction notice');
  if (report.checks.skillsDir.path !== 'skills') throw new Error('skillsDir must be relative');
  if ('absolutePath' in report.checks.skillsDir) throw new Error('absolute path leaked');
});
test('doctor shows local paths only with --show-paths', () => {
  const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" doctor --show-paths`);
  const report = JSON.parse(out);
  if (report.packageRoot !== ROOT) throw new Error('packageRoot mismatch');
  if (report.checks.skillsDir.absolutePath !== join(ROOT, 'skills')) throw new Error('skillsDir absolutePath mismatch');
});
test('skills command lists manifest skills', () => {
  const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" skills`);
  assertIncludes(out, ['"command": "skills"', '"count": 25', '"query-token-info"', '"risk-fusion"', '"opportunity-board"'], 'skills output');
});

console.log('\n3. Bundled CLIs');
const CLIS = [
  { name: 'query-token-info', help: ['search', 'meta', 'dynamic', 'kline'] },
  { name: 'meme-rush', help: ['meme-rush', 'topic-rush'] },
  { name: 'trading-signal', help: ['smart-money'] },
  { name: 'crypto-market-rank', help: ['social-hype', 'token-rank'] },
  { name: 'query-address-info', help: ['positions'] },
];
for (const cli of CLIS) {
  const p = join(ROOT, 'skills/binance-web3', cli.name, 'scripts/cli.mjs');
  test(`${cli.name} --help`, () => {
    const out = run(`node "${p}" --help`);
    assertIncludes(out, cli.help, `${cli.name} help`);
  });
  test(`${cli.name} invalid command`, () => {
    try {
      run(`node "${p}" __nonexistent__`);
      throw new Error('should fail');
    } catch (e) {
      if (!e.stderr && !e.stdout) throw new Error('no error output');
    }
  });
}

console.log('\n4. Manifest');
const manifest = JSON.parse(read('skillpp.manifest.json'));
test('manifest counts are current', () => {
  if (manifest.skills.length !== 25) throw new Error(`skills=${manifest.skills.length}`);
  if (manifest.pipelines.length !== 7) throw new Error(`pipelines=${manifest.pipelines.length}`);
});
test('pipeline skill order is stable', () => {
  const expected = {
    P_TOKEN_ANALYSIS: ['query-token-info', 'query-token-audit', 'trading-signal', 'risk-fusion'],
    P_CHAIN_SCAN: ['meme-rush', 'crypto-market-rank', 'risk-fusion', 'opportunity-board'],
    P_TRADE_SAFETY: ['query-token-audit', 'audit-plus', 'risk-fusion'],
    P_WALLET_XRAY: ['query-address-info', 'query-token-audit', 'wallet-doctor'],
    P_SMART_MONEY: ['trading-signal', 'query-token-audit', 'risk-fusion'],
    P_FOURMEME_CREATE: ['four-meme-integration'],
    P_DEEP_AUDIT: ['query-token-info', 'query-token-audit', 'contract-profiler', 'audit-plus', 'risk-fusion'],
  };
  for (const [id, skills] of Object.entries(expected)) {
    const pipeline = manifest.pipelines.find(p => p.id === id);
    if (!pipeline) throw new Error(`missing ${id}`);
    if (pipeline.skills.join(' -> ') !== skills.join(' -> ')) throw new Error(`${id} order drift`);
  }
});
test('blocking checkpoints are defined', () => {
  const blocking = manifest.checkpoints?.filter(c => c.securityLevel === 'BLOCKING') || [];
  if (blocking.length < 4) throw new Error(`only ${blocking.length}`);
});
test('execCommand scripts exist', () => {
  for (const s of manifest.skills) {
    if (!s.execCommand?.startsWith('node ')) continue;
    const rel = s.execCommand.replace('node ', '');
    if (!existsSync(join(ROOT, rel))) throw new Error(`${s.name}: ${rel}`);
  }
});
test('write-operation skills include install guidance', () => {
  for (const s of manifest.skills) {
    if (['npx fourmeme', 'baw', 'binance-cli'].includes(s.execCommand) && !s.installCmd) {
      throw new Error(`${s.name}: missing installCmd`);
    }
  }
});
test('skillpp modules all exist in manifest', () => {
  for (const n of ['contract-profiler', 'risk-fusion', 'wallet-doctor', 'newbie-tutor', 'watchtower', 'opportunity-board', 'scam-pattern-lab']) {
    if (!manifest.skills.find(s => s.name === n)) throw new Error(`missing ${n}`);
  }
});

console.log('\n5. Documentation');
test('README is English default and links Chinese version', () => {
  const r = read('README.md');
  assertIncludes(r, ['![Skill++ banner](assets/skillpp-banner.png)', '[简体中文](README.zh-CN.md)', 'Skill Plus Plus (Skill++)', 'img.shields.io/npm/v/skillpp', 'v0.1 public npm release', 'npm install -g skillpp', 'npm install -g github:skillpp/skillpp', 'protocol-first AI skill package', '25 coordinated skills', 'Privacy-Safe Doctor', '[MIT](LICENSE)'], 'README');
  if (r.includes('## Skill++ 是什么')) throw new Error('README default should be English');
});
test('Chinese README exists and links English version', () => {
  const r = read('README.zh-CN.md');
  assertIncludes(r, ['![Skill++ banner](assets/skillpp-banner.png)', '[English](README.md)', 'Skill Plus Plus（Skill++）', 'img.shields.io/npm/v/skillpp', 'v0.1 公开 npm 发布版', 'npm install -g skillpp', 'npm install -g github:skillpp/skillpp', '协议优先的 AI skill 包', '25 个 skill 协同工作', '[MIT](LICENSE)'], 'README.zh-CN');
});
test('README lists supported AI agents', () => {
  const r = read('README.md');
  assertIncludes(r, ['BinanceAI', 'Claude', 'Claude Opus', 'GPT', 'Gemini', 'Mimo', 'Kimi', 'OpenClaw', 'Codex'], 'README AI list');
});
test('README has minimal CLI examples', () => {
  const r = read('README.md');
  assertIncludes(r, ['skillpp parse', 'skillpp analyze', 'skillpp scan', 'skillpp trade', 'skillpp create', 'P_TOKEN_ANALYSIS', 'AUDIT_RESULT'], 'README examples');
});
test('README documents external write CLI boundary', () => {
  const r = read('README.md');
  assertIncludes(r, ['does not silently install wallet, exchange, or Four.meme write-operation tools', 'Write-operation flows are checkpointed handoffs', '@binance/agentic-wallet', '@binance/binance-cli', '@four-meme/four-meme-ai'], 'README external CLI');
});
test('root SKILL.md release counts are current', () => {
  const s = read('SKILL.md');
  assertIncludes(s, ['25', '7', 'skillpp doctor', 'skillpp skills'], 'SKILL.md');
});
test('registry includes all manifest skills', () => {
  const r = read('registry.md');
  for (const s of manifest.skills) {
    if (!r.includes(s.name)) throw new Error(`registry missing ${s.name}`);
  }
});

console.log('\n6. Release hygiene');
test('public files do not contain local private paths or secrets', () => {
  const files = [
    'README.md',
    'README.zh-CN.md',
    'COMPATIBILITY.md',
    'SKILL.md',
    'registry.md',
    'pipelines.md',
    'rules.md',
    'package.json',
    'skillpp.manifest.json',
    ...walkTextFiles('scripts'),
    ...walkTextFiles('adapters'),
    ...walkTextFiles('prompts'),
    ...walkTextFiles('examples'),
    ...walkTextFiles('.github'),
  ];
  const forbidden = [
    /(^|[^A-Za-z])[A-Za-z]:\\(?!\\?)/,
    /(^|[^A-Za-z])[A-Za-z]:\//,
    new RegExp('C:' + String.raw`\\Users\\`, 'i'),
    new RegExp('App' + String.raw`Data\\`, 'i'),
    new RegExp('Admin' + 'istrator', 'i'),
    /PRIVATE_KEY\s*=/i,
    /API_KEY\s*=/i,
    /0x[a-fA-F0-9]{64}/,
    new RegExp('mnemo' + 'nic', 'i'),
    new RegExp('seed' + ' phrase', 'i'),
  ];
  for (const f of files) {
    const c = read(f);
    for (const pattern of forbidden) {
      if (pattern.test(c)) throw new Error(`${f}: ${pattern}`);
    }
  }
});
test('public files do not contain placeholder repository URLs', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'package.json', 'skillpp.manifest.json', 'schemas/audit.schema.json', 'schemas/checkpoint.schema.json', 'schemas/handoff.schema.json', 'schemas/token.schema.json']) {
    const c = read(f);
    if (c.includes('github.com/' + '<owner>')) throw new Error(`${f}: placeholder owner URL`);
    if (c.includes('github.com/' + '<org>')) throw new Error(`${f}: placeholder org URL`);
    if (c.includes('skill-plus-plus.dev')) throw new Error(`${f}: stale domain`);
  }
});
test('public docs do not contain implementation-status artifacts', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'COMPATIBILITY.md', 'SKILL.md', 'registry.md', 'pipelines.md', 'rules.md']) {
    const c = read(f);
    const patterns = [
      new RegExp('P' + '0\\b'),
      new RegExp('P' + '1\\b'),
      new RegExp('P' + '2\\b'),
      new RegExp('P' + '3\\b'),
      new RegExp('f' + 'ix', 'i'),
      new RegExp('待' + '添加'),
      new RegExp('计划' + '用途'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(c)) throw new Error(`${f}: ${pattern}`);
    }
  }
});
test('repository layout examples use skillpp folder name', () => {
  for (const f of ['README.md', 'README.zh-CN.md', 'SKILL.md']) {
    const c = read(f);
    if (c.includes('skill-plus' + '-plus/')) throw new Error(`${f}: stale folder name`);
  }
});
test('no sports in public docs', () => {
  for (const f of ['README.md', 'README.zh-CN.md']) {
    if (/sports-ai|体育|足球|世界杯/i.test(read(f))) throw new Error(`${f}: sports reference`);
  }
});
test('no stale pipeline numbers', () => {
  for (const f of ['SKILL.md', 'pipelines.md', 'rules.md', 'registry.md', 'README.md', 'README.zh-CN.md', 'COMPATIBILITY.md']) {
    if (/PIPELINE [0-9]/.test(read(f))) throw new Error(`${f}: stale PIPELINE N`);
  }
});
test('no duplicate pipeline headings', () => {
  const headings = read('pipelines.md').match(/^## P_\w+:/gm) || [];
  const seen = new Set();
  for (const h of headings) {
    if (seen.has(h)) throw new Error(`duplicate ${h}`);
    seen.add(h);
  }
});
test('npm package exposes expected files', () => {
  const pkg = JSON.parse(read('package.json'));
  const manifest = JSON.parse(read('skillpp.manifest.json'));
  if (pkg.name !== 'skillpp') throw new Error('package name must be skillpp');
  if (!/^0\.1\.\d+$/.test(pkg.version)) throw new Error('package version must stay in the v0.1 compatibility line');
  if (pkg.version !== manifest.version) throw new Error('package and manifest versions diverged');
  if (pkg.type !== 'module') throw new Error('package type must be module');
  if (pkg.repository?.url !== 'git+https://github.com/skillpp/skillpp.git') throw new Error('missing repository URL');
  if (pkg.homepage !== 'https://skillpp.ai') throw new Error('missing homepage');
  if (pkg.bugs?.url !== 'https://github.com/skillpp/skillpp/issues') throw new Error('missing bugs URL');
  if (pkg.publishConfig?.registry !== 'https://registry.npmjs.org/') throw new Error('missing npmjs publish registry');
  if (pkg.publishConfig?.access !== 'public') throw new Error('missing public npm access');
  if (pkg.license !== 'MIT') throw new Error('missing MIT license');
  if (pkg.bin?.skillpp !== 'scripts/skillpp.mjs') throw new Error('missing bin.skillpp');
  if (pkg.scripts?.test !== 'node scripts/selftest.mjs') throw new Error('missing npm test');
  if (pkg.scripts?.validate !== 'node scripts/validate-skillpp.mjs --strict') throw new Error('missing npm validate');
  if (pkg.scripts?.compatibility !== 'node scripts/compatibility-check.mjs') throw new Error('missing npm compatibility');
  for (const f of ['README.md', 'README.zh-CN.md', 'COMPATIBILITY.md', 'SKILL.md', 'skills', 'adapters', 'prompts', 'schemas', 'examples', 'scripts', 'assets', 'tests']) {
    if (!pkg.files?.includes(f)) throw new Error(`package files missing ${f}`);
  }
});
test('compatibility baseline matches public package line', () => {
  const pkg = JSON.parse(read('package.json'));
  const manifest = JSON.parse(read('skillpp.manifest.json'));
  const baselinePath = 'tests/compatibility/v0.1.0.json';
  if (!existsSync(join(ROOT, baselinePath))) throw new Error(`missing ${baselinePath}`);
  const baseline = JSON.parse(read(baselinePath));
  if (baseline.major !== 0) throw new Error('baseline major must be 0');
  if (pkg.version !== manifest.version) throw new Error('package and manifest versions diverged');
  if (!read('COMPATIBILITY.md').includes(baselinePath)) throw new Error('COMPATIBILITY.md must name the active baseline');
});
test('GitHub Actions CI runs release checks', () => {
  const ci = read('.github/workflows/ci.yml');
  assertIncludes(ci, ['npm test', 'npm run validate', 'npm run compatibility', 'npm pack --dry-run'], 'CI');
  assertIncludes(ci, ['actions/checkout@v6', 'actions/setup-node@v6'], 'CI actions');
});
test('runtime avoids shell-quoted JSON params', () => {
  const s = read('scripts/skillpp.mjs');
  if (s.includes('execSync' + '(cmdLine')) throw new Error('runtime still uses shell command string');
  if (!s.includes('spawnSync')) throw new Error('runtime should use spawnSync argv');
});
test('public CLI scripts use ASCII-visible output', () => {
  for (const f of [
    'scripts/skillpp.mjs',
    'scripts/validate-skillpp.mjs',
    'scripts/compatibility-check.mjs',
    'skills/binance-web3/query-token-info/scripts/cli.mjs',
    'skills/binance-web3/query-address-info/scripts/cli.mjs',
    'skills/binance-web3/trading-signal/scripts/cli.mjs',
    'skills/binance-web3/crypto-market-rank/scripts/cli.mjs',
    'skills/binance-web3/meme-rush/scripts/cli.mjs',
  ]) {
    const c = read(f);
    if (/[^\x00-\x7F]/.test(c)) throw new Error(`${f}: non-ASCII runtime script text`);
  }
});

if (INTEGRATION) {
  console.log('\n7. Integration');
  test('analyze USDT on BSC dry-run route', () => {
    const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" analyze "0x55d398326f99059ff775485246999027b3197955" --dry-run`);
    if (!out.includes('P_TOKEN_ANALYSIS')) throw new Error('wrong pipeline');
  });
  test('parse BSCScan URL', () => {
    const out = run(`node "${join(ROOT, 'scripts/skillpp.mjs')}" parse "https://bscscan.com/address/0x1234567890abcdef1234567890abcdef12345678#code"`);
    assertIncludes(out, ['explorer_url', 'BSC', 'sourceAvailable'], 'parse output');
  });
} else {
  console.log('\n7. Integration skipped (use --integration to enable)');
}

console.log('\nResult');
console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);
process.exit(failed > 0 ? 1 : 0);
