#!/usr/bin/env node
// skillpp.mjs - Skill++ Unified Executor v0.1
// Usage: node scripts/skillpp.mjs <command> '<input>'
//
// Commands:
//   parse     Parse input only (no execution)
//   analyze   Full token analysis (P_TOKEN_ANALYSIS)
//   scan      Chain opportunity scan (P_CHAIN_SCAN)
//   audit     Deep contract audit (P_DEEP_AUDIT)
//   wallet    Wallet portfolio analysis (P_WALLET_XRAY)
//   signals   Smart money signals (P_SMART_MONEY)

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'skillpp.manifest.json'), 'utf-8'));

// Config
const CMD_PIPELINE_MAP = {
  analyze: 'P_TOKEN_ANALYSIS',
  scan:    'P_CHAIN_SCAN',
  trade:   'P_TRADE_SAFETY',
  audit:   'P_DEEP_AUDIT',
  wallet:  'P_WALLET_XRAY',
  signals: 'P_SMART_MONEY',
  create:  'P_FOURMEME_CREATE',
};
const DRY_RUN = process.argv.includes('--dry-run');
const SHOW_PATHS = process.argv.includes('--show-paths');

// Input Parser
function parseInput(raw) {
  const result = { raw, type: 'unknown' };
  const value = raw.trim();
  const chainAliases = {
    bsc: { chain: 'BSC', chainId: '56' },
    bnb: { chain: 'BSC', chainId: '56' },
    ethereum: { chain: 'Ethereum', chainId: '1' },
    eth: { chain: 'Ethereum', chainId: '1' },
    base: { chain: 'Base', chainId: '8453' },
    polygon: { chain: 'Polygon', chainId: '137' },
    matic: { chain: 'Polygon', chainId: '137' },
    solana: { chain: 'Solana', chainId: 'CT_501' },
    sol: { chain: 'Solana', chainId: 'CT_501' },
  };
  const explorerPatterns = [
    { regex: /bscscan\.com\/address\/(0x[a-fA-F0-9]{40})/, chain: 'BSC', chainId: '56' },
    { regex: /etherscan\.io\/address\/(0x[a-fA-F0-9]{40})/, chain: 'Ethereum', chainId: '1' },
    { regex: /basescan\.org\/address\/(0x[a-fA-F0-9]{40})/, chain: 'Base', chainId: '8453' },
    { regex: /polygonscan\.com\/address\/(0x[a-fA-F0-9]{40})/, chain: 'Polygon', chainId: '137' },
  ];
  for (const p of explorerPatterns) {
    const m = raw.match(p.regex);
    if (m) { result.type = 'explorer_url'; result.chain = p.chain; result.chainId = p.chainId; result.contractAddress = m[1]; result.sourceAvailable = raw.includes('#code'); return result; }
  }
  const alias = chainAliases[value.toLowerCase()];
  if (alias) { result.type = 'chain_id'; result.chain = alias.chain; result.chainId = alias.chainId; return result; }
  if (/^(1|56|8453|137|43114|42161|10|CT_501)$/.test(value)) { result.type = 'chain_id'; result.chainId = value; return result; }
  const addrMatch = raw.match(/(0x[a-fA-F0-9]{40})/);
  if (addrMatch) { result.type = 'address'; result.contractAddress = addrMatch[1]; return result; }
  if (/^[A-Za-z][A-Za-z0-9]{1,10}$/.test(value)) { result.type = 'token_symbol'; result.tokenSymbol = value; return result; }
  if (/\b(contract|pragma solidity|function)\b/.test(raw)) { result.type = 'source_code'; return result; }
  result.type = 'intent';
  return result;
}

// Checkpoint Engine
// Design: checkpoints pause execution with structured JSON.
// - BLOCKING checkpoints -> exit(10), AI must present to user, wait for confirmation
// - ADVISORY checkpoints -> inform only, continue execution
// - Resume support is intentionally explicit; blocking checkpoints stop execution until implemented
function emitCheckpoint(id, data) {
  const def = MANIFEST.checkpoints?.find(c => c.id === id);
  const output = {
    checkpoint: id,
    securityLevel: def?.securityLevel || 'ADVISORY',
    canBypass: def?.canBypass !== false,
    timestamp: Math.floor(Date.now() / 1000),
    data,
    action: def?.securityLevel === 'BLOCKING' ? 'STOP_AND_WAIT' : 'INFORM',
  };
  console.log(`\n[CHECKPOINT: ${id}] (${output.securityLevel})`);
  console.log(JSON.stringify(output, null, 2));
  if (output.securityLevel === 'BLOCKING' && !DRY_RUN) {
    console.log(`\nExecution paused. AI must present this to user and wait for confirmation.`);
    process.exit(10); // exit code 10 = checkpoint reached
  }
}

// CLI Runner
function runSkillCLI(skillName, command, paramsJson) {
  const skill = MANIFEST.skills.find(s => s.name === skillName);
  if (!skill) return { error: `skill not found: ${skillName}` };
  if (!skill.execCommand) return { error: `no execCommand for: ${skillName}`, skill: skillName };

  // Text-only skills (no CLI)
  if (skill.execCommand.startsWith('AI ') || skill.execCommand.startsWith('curl') || skill.execCommand.startsWith('read-only')) {
    return { note: `manual execution: ${skill.execCommand}`, skill: skillName };
  }

  // Node CLI skills
  if (skill.execCommand.startsWith('node ')) {
    const scriptRel = skill.execCommand.replace('node ', '');
    const scriptPath = join(ROOT, scriptRel);
    if (!existsSync(scriptPath)) return { error: `script not found: ${scriptPath}`, skill: skillName };

    if (DRY_RUN) return { note: `[DRY-RUN] node ${scriptRel} ${command}`, skill: skillName };

    const args = paramsJson ? [scriptPath, command, paramsJson] : [scriptPath, command];
    const child = spawnSync(process.execPath, args, {
      encoding: 'utf-8',
      timeout: 15000,
      windowsHide: true,
    });

    if (child.error) {
      return { error: child.error.message, skill: skillName, exitCode: child.status ?? 1 };
    }

    const stdout = (child.stdout || '').trim();
    const stderr = (child.stderr || '').trim();
    if (child.status !== 0) {
      return { error: stderr || stdout || `exit ${child.status}`, skill: skillName, exitCode: child.status };
    }

    try { return JSON.parse(stdout); } catch { return { raw: stdout, skill: skillName }; }
  }

  return { note: `manual: ${skill.execCommand}`, skill: skillName };
}

function commandExists(dep) {
  const checker = process.platform === 'win32'
    ? { file: 'where.exe', args: [dep] }
    : { file: 'which', args: [dep] };
  const result = spawnSync(checker.file, checker.args, { stdio: 'pipe', windowsHide: true });
  return result.status === 0;
}

function listDirFiles(relDir, suffix = '') {
  const abs = join(ROOT, relDir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter(entry => entry.isFile() && (!suffix || entry.name.endsWith(suffix)))
    .map(entry => entry.name)
    .sort();
}

function pathCheck(relPath) {
  const abs = join(ROOT, relPath);
  const check = { path: relPath, exists: existsSync(abs) };
  if (SHOW_PATHS) check.absolutePath = abs;
  return check;
}

function externalCommandForSkill(skill) {
  if (skill.execCommand === 'baw') return 'baw';
  if (skill.execCommand === 'binance-cli') return 'binance-cli';
  if (skill.execCommand === 'npx fourmeme') return 'fourmeme';
  if (skill.execCommand?.startsWith('python3 ')) return process.platform === 'win32' ? 'python' : 'python3';
  return null;
}

function runtimeDependencyForSkill(skill, dep) {
  const externalCommand = externalCommandForSkill(skill);
  if (externalCommand) return externalCommand;
  return dep;
}

function runDoctor() {
  const adapters = listDirFiles('adapters', '.md');
  const prompts = listDirFiles('prompts', '.md');
  const schemas = listDirFiles('schemas', '.json');
  const externalCli = {};

  for (const skill of MANIFEST.skills) {
    const command = externalCommandForSkill(skill);
    if (!command) continue;
    externalCli[command] = {
      available: commandExists(command),
      skill: skill.name,
      execCommand: skill.execCommand,
      installCmd: skill.installCmd || 'install manually',
      requiredForWriteOps: !skill.readOnly,
    };
  }

  const output = {
    command: 'doctor',
    status: 'ok',
    packageRoot: SHOW_PATHS ? ROOT : '<redacted>',
    privacy: SHOW_PATHS
      ? 'absolute paths shown because --show-paths was provided'
      : 'absolute local paths redacted; run with --show-paths only in a private local session',
    checks: {
      manifest: pathCheck('skillpp.manifest.json'),
      skillsDir: pathCheck('skills'),
      scriptsDir: pathCheck('scripts'),
      adaptersDir: pathCheck('adapters'),
      promptsDir: pathCheck('prompts'),
      schemasDir: pathCheck('schemas'),
      rootSkill: pathCheck('SKILL.md'),
    },
    counts: {
      skills: MANIFEST.skills.length,
      pipelines: MANIFEST.pipelines.length,
      checkpoints: MANIFEST.checkpoints?.length || 0,
      adapters: adapters.length,
      prompts: prompts.length,
      schemas: schemas.length,
    },
    adapters,
    prompts,
    externalCli,
    guidance: [
      'Use relative paths from this report unless the user explicitly provides local paths.',
      'Do not ask for machine-specific workspace paths in public issues or shared logs.',
      'Missing external write CLIs are warnings until wallet, exchange, or Four.meme write operations are requested.',
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

function listSkills() {
  const output = {
    command: 'skills',
    count: MANIFEST.skills.length,
    skills: MANIFEST.skills.map(skill => ({
      name: skill.name,
      group: skill.group,
      path: skill.path,
      entry: skill.entry,
      readOnly: skill.readOnly,
      needsCheckpoint: skill.needsCheckpoint,
      execCommand: skill.execCommand,
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

// Pipeline Executor
function executePipeline(pipelineId, parsed) {
  const pipeline = MANIFEST.pipelines.find(p => p.id === pipelineId);
  if (!pipeline) return { error: `pipeline not found: ${pipelineId}` };

  // Default chainId for bare addresses (BSC)
  const chainId = parsed.chainId || '56';
  const addr = parsed.contractAddress; // unified address field

  console.log(`\nPipeline: ${pipeline.name} (${pipelineId})`);
  console.log(`   Steps: ${pipeline.skills.join(' -> ')}`);

  const results = {};

  for (const [idx, skillName] of pipeline.skills.entries()) {
    console.log(`\n-- Step ${idx + 1}: ${skillName} --`);

    let result;
    switch (skillName) {
      case 'query-token-info':
        if (pipelineId === 'P_DEEP_AUDIT' && parsed.type === 'source_code' && !addr) {
          result = { note: 'skipped: source-code audit has no token address for token metadata lookup' };
        } else {
          result = runSkillCLI('query-token-info', 'search',
            JSON.stringify({ keyword: addr || parsed.tokenSymbol || parsed.raw, chainIds: chainId }));
        }
        break;
      case 'query-token-audit':
        // Some pipelines discover token addresses inside previous results; the AI layer expands those.
        if (pipelineId === 'P_WALLET_XRAY') {
          result = { note: 'deferred: will audit each token from positions (not wallet address itself)' };
        } else if (pipelineId === 'P_SMART_MONEY' && !addr) {
          result = { note: 'deferred: will audit token addresses extracted from smart-money signals' };
        } else if (addr) {
          result = { note: 'step entered: curl POST audit API (pending AI execution)', contractAddress: addr, chainId };
        } else {
          result = { note: 'skipped: no address available' };
        }
        break;
      case 'trading-signal':
        result = runSkillCLI('trading-signal', 'smart-money',
          JSON.stringify({ chainId, page: 1, pageSize: 10 }));
        break;
      case 'meme-rush':
        if (pipelineId === 'P_CHAIN_SCAN') {
          result = {
            'meme-rush': runSkillCLI('meme-rush', 'meme-rush',
              JSON.stringify({ chainId, rankType: 10, limit: 10 })),
            'topic-rush': runSkillCLI('meme-rush', 'topic-rush',
              JSON.stringify({ chainId, rankType: 10, sort: 10 })),
          };
        } else {
          result = runSkillCLI('meme-rush', 'meme-rush',
            JSON.stringify({ chainId, rankType: 10, limit: 10 }));
        }
        break;
      case 'crypto-market-rank':
        if (pipelineId === 'P_CHAIN_SCAN') {
          result = {
            'token-rank': runSkillCLI('crypto-market-rank', 'token-rank',
              JSON.stringify({ chainId, rankType: 10, page: 1, size: 10 })),
            'smart-money-inflow': runSkillCLI('crypto-market-rank', 'smart-money-inflow',
              JSON.stringify({ chainId, period: '24h', page: 1, size: 10 })),
          };
        } else {
          result = runSkillCLI('crypto-market-rank', 'token-rank',
            JSON.stringify({ chainId, rankType: 10, page: 1, size: 10 }));
        }
        break;
      case 'audit-plus':
      case 'contract-profiler':
      case 'risk-fusion':
      case 'wallet-doctor':
      case 'newbie-tutor':
      case 'opportunity-board':
        result = { note: `text-based skill, AI executes by reading ${skillName}/SKILL.md`, skill: skillName };
        break;
      case 'query-address-info':
        if (addr) {
          result = runSkillCLI('query-address-info', 'positions',
            JSON.stringify({ address: addr, chainId, offset: 0 }));
        } else {
          result = { note: 'skipped: no wallet address' };
        }
        break;
      case 'four-meme-integration':
        result = { note: 'requires PRIVATE_KEY + user confirmation, manual execution only' };
        break;
      default:
        result = { note: `no executor mapping for: ${skillName}` };
    }

    results[skillName] = result;
    if (result?.error) {
      console.error(`   FAIL ${skillName}: ${result.error}`);
    } else if (result?.note) {
      console.log(`   NOTE ${skillName}: ${result.note}`);
    } else {
      console.log(`   PASS ${skillName}: success`);
    }
  }

  // Checkpoints
  if (pipeline.checkpoints.length > 0) {
    console.log(`\n-- Checkpoints --`);
    for (const cpId of pipeline.checkpoints) {
      emitCheckpoint(cpId, { pipeline: pipelineId, results: Object.keys(results) });
    }
  }

  return results;
}

// Main
async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--dry-run' && a !== '--show-paths');
  const [command, inputStr] = args;

  if (!command || command === '--help' || command === '-h') {
    console.log(`Skill++ Executor v0.1
Usage: node scripts/skillpp.mjs <command> '<input>' [--dry-run]

Commands:
  parse "<input>"            Parse only (no execution)
  analyze "<address|url>"    P_TOKEN_ANALYSIS
  scan "<chainId>"           P_CHAIN_SCAN
  trade "<address|url>"      P_TRADE_SAFETY
  audit "<address|url>"      P_DEEP_AUDIT
  wallet "<address>"         P_WALLET_XRAY
  signals "<chainId>"        P_SMART_MONEY
  create "<intent>"          P_FOURMEME_CREATE
  doctor                     Check package root, manifest, skills, and external CLIs
  skills                     List registered skills from the manifest

Flags:
  --dry-run   Show execution plan without running
  --show-paths   Include absolute local paths in doctor output
`);
    process.exit(0);
  }

  if (command === 'doctor') {
    runDoctor();
    process.exit(0);
  }

  if (command === 'skills') {
    listSkills();
    process.exit(0);
  }

  // Parse input
  const parsed = parseInput(inputStr || '');
  console.log(JSON.stringify({ command, parsed }, null, 2));

  if (command === 'parse') process.exit(0);

  // Route: command takes priority over parsed input type
  const pipelineId = CMD_PIPELINE_MAP[command];
  if (!pipelineId) {
    console.error(`Unknown command: ${command}. Use --help for usage.`);
    process.exit(1);
  }

  if (DRY_RUN) console.log('\nDRY RUN MODE - no real API calls\n');

  // Check deps
  const pipeline = MANIFEST.pipelines.find(p => p.id === pipelineId);
  const issues = [];
  for (const sn of pipeline.skills) {
    const skill = MANIFEST.skills.find(s => s.name === sn);
    if (!skill) continue;
    for (const dep of skill.deps || []) {
      if (dep === 'node' || dep === 'curl') continue;
      const runtimeDep = runtimeDependencyForSkill(skill, dep);
      if (!commandExists(runtimeDep)) {
        issues.push({ skill: sn, dep: runtimeDep, package: dep, installCmd: skill.installCmd || 'manual install' });
      }
    }
  }
  if (issues.length > 0) {
    console.log('\nMissing dependencies:');
    issues.forEach(i => console.log(`  ${i.skill}: ${i.dep} -> ${i.installCmd}`));
  }

  // Execute
  const results = executePipeline(pipelineId, parsed);

  // Build handoff
  const handoff = {
    _meta: { pipeline: pipelineId, timestamp: Math.floor(Date.now() / 1000), source: 'skillpp-executor' },
    input: { raw: inputStr || '', type: parsed.type, chainId: parseInput(inputStr || '').chainId || '56', address: parseInput(inputStr || '').contractAddress },
    results,
    nextActions: [
      { action: 'Deep audit contract', pipeline: 'P_DEEP_AUDIT', condition: 'if source code available' },
      { action: 'Check smart money', pipeline: 'P_SMART_MONEY' },
      { action: 'View wallet holdings', pipeline: 'P_WALLET_XRAY', condition: 'if wallet address provided' },
    ],
  };
  console.log(`\nHandoff:\n${JSON.stringify(handoff, null, 2)}`);
}

await main();
