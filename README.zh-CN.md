# Skill++

**面向链上情报的多智能体 Skill 调度协议。**

![Skill++ banner](assets/skillpp-banner.png)

Skill++ 把孤立的 AI skills 组织成可调度的工作流，用于代币研究、钱包体检、合约审计、聪明钱追踪、扫链分析和带安全检查点的写操作交接。

[English](README.md) | [官网](https://skillpp.ai) | [X](https://x.com/SkillppAI) | [GitHub](https://github.com/skillpp/skillpp)

![npm](https://img.shields.io/npm/v/skillpp?style=flat-square)
![install](https://img.shields.io/badge/install-npm%20i%20-g%20skillpp-CB3837?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-111827?style=flat-square)
![BinanceAI](https://img.shields.io/badge/BinanceAI-compatible-0B0E11?style=flat-square)
![Claude Opus](https://img.shields.io/badge/Claude%20Opus-compatible-6B4EFF?style=flat-square)
![GPT](https://img.shields.io/badge/GPT-compatible-111827?style=flat-square)
![Gemini](https://img.shields.io/badge/Gemini-compatible-1A73E8?style=flat-square)
![Kimi](https://img.shields.io/badge/Kimi-compatible-111827?style=flat-square)
![Mimo](https://img.shields.io/badge/Mimo-compatible-16A34A?style=flat-square)
![OpenClaw](https://img.shields.io/badge/OpenClaw-compatible-DC2626?style=flat-square)
![Codex](https://img.shields.io/badge/Codex-compatible-000000?style=flat-square)

## 概览

当前状态：v0.1 公开 npm 发布版。

单个 AI skill 可以解决局部问题，但真正的链上分析需要路由、排序、交叉验证、安全闸门和结构化交接。Skill++ 提供这层调度协议。

Skill++ 是协议优先的 AI skill 包。部分 skill 会运行本地只读 CLI，部分会调用公开只读 API，另一些会输出结构化 handoff 交给智能体继续执行。它不是钱包、交易所或 Four.meme SDK；除非所需外部工具真实执行成功，否则不能声称写操作已完成。

| 层级 | Skill++ 提供什么 |
|---|---|
| Router | 解析链接、地址、符号、源码片段、钱包和自然语言意图 |
| Pipeline Protocol | 把请求映射到 7 条稳定流水线 ID |
| Skill Registry | 注册 Binance Web3、Binance Exchange、Four.meme、audit-plus 和 Skill++ 模块共 25 个 skill |
| Handoff | 输出结构化 JSON，让下游 skill 不丢上下文 |
| Risk Fusion | 交叉验证快速审计、深度审计、市场数据、聪明钱信号和钱包风险 |
| Safety | 对敏感动作强制检查点和用户确认 |
| Agent Adapters | 适配 BinanceAI、Claude、GPT、Gemini、Kimi、Mimo、OpenClaw 和 Codex |

Skill++ 同时面向专业智能体和不熟悉 Web3 的用户。它可以用人话解释风险，也保留机器可读的执行状态。

## 安装

npm 安装：

```bash
npm install -g skillpp
skillpp doctor
skillpp skills
```

GitHub 源码安装：

```bash
npm install -g github:skillpp/skillpp
skillpp doctor
skillpp skills
```

本地仓库使用：

```bash
git clone https://github.com/skillpp/skillpp.git
cd skillpp
npm install -g .
skillpp doctor
```

## 给 AI 智能体使用

Skill++ 不只是 CLI，也是一个 skill 包。安装或克隆后，把包根目录交给 AI 智能体，并要求它先读取 `SKILL.md`。如果智能体只读 README，它只看到了项目概览，还没有真正加载 Skill++ 协议。

最小加载提示词：

```text
Use Skill++ from this repository. Read SKILL.md first, then skillpp.manifest.json and the matching adapter under adapters/ for your runtime. Use scripts/skillpp.mjs --dry-run when deterministic routing is available.
```

npm 包会包含 `SKILL.md`、`skillpp.manifest.json`、`schemas/`、`adapters/`、`prompts/`、`skills/` 和 `skillpp` CLI，因此兼容的智能体可以直接从已安装包或 GitHub 仓库学习协议。

## 快速开始

```bash
# 代币分析：基础信息 -> 快速审计 -> 聪明钱信号 -> 风险融合
skillpp analyze "0x55d398326f99059ff775485246999027b3197955" --dry-run

# 扫链：发射台信号 -> 市场榜单 -> 风险过滤 -> 机会看板
skillpp scan 56 --dry-run

# 交易前安全检查：审计 -> 风险融合 -> 确认检查点
skillpp trade "0x55d398326f99059ff775485246999027b3197955" --dry-run

# Four.meme 创建流程：安全提示 -> 创建检查点
skillpp create "create a meme token on four.meme" --dry-run
```

最小输出形态：

```text
$ skillpp parse "0x55d398326f99059ff775485246999027b3197955"
{
  "command": "parse",
  "parsed": {
    "type": "address",
    "contractAddress": "0x55d398326f99059ff775485246999027b3197955"
  }
}

$ skillpp analyze "0x55d398326f99059ff775485246999027b3197955" --dry-run
Pipeline: P_TOKEN_ANALYSIS
Steps: query-token-info -> query-token-audit -> trading-signal -> risk-fusion
Checkpoint: AUDIT_RESULT
Handoff: { "_meta": { "pipeline": "P_TOKEN_ANALYSIS" }, "results": { ... } }
```

## 隐私安全自检

`skillpp doctor` 默认可以安全粘贴到公开 issue。它会报告包健康状态，但不会暴露本机绝对路径。

```bash
skillpp doctor
```

默认输出会隐藏本机路径：

```json
{
  "command": "doctor",
  "packageRoot": "<redacted>",
  "checks": {
    "skillsDir": { "path": "skills", "exists": true }
  }
}
```

只有在本地私有会话中才使用：

```bash
skillpp doctor --show-paths
```

不要把 `--show-paths` 输出粘贴到公开 GitHub issue、聊天记录或问题报告。

## 命名

正式名称是 **Skill Plus Plus（Skill++）**。

| 名称 | 用途 |
|---|---|
| Skill++ | 产品名和文档名 |
| Skill Plus Plus | 不使用符号时的英文全称 |
| `skillpp` | npm 包名和 CLI 命令 |
| `skillpp/` | 推荐的仓库名或本地目录名 |

## 架构

```text
用户输入
  链接 / 地址 / 符号 / 源码 / 钱包 / 自然语言
        |
        v
Skill++ 调度器
  1. 解析输入类型、链和地址
  2. 检查工具和依赖
  3. 匹配稳定流水线 ID
  4. 执行 CLI、API 或文本型 AI skill
  5. 触发安全检查点
  6. 输出 handoff JSON
  7. 推荐下一步路由
        |
        v
25 个 skill 协同工作
  Binance Web3 / Binance Exchange / Four.meme / audit-plus / Skill++ Library
```

## 流水线

| ID | 用途 | 顺序 |
|---|---|---|
| `P_TOKEN_ANALYSIS` | 代币分析 | token info -> token audit -> smart-money signal -> risk fusion |
| `P_CHAIN_SCAN` | 扫链找机会 | meme rush -> market rank -> risk fusion -> opportunity board |
| `P_TRADE_SAFETY` | 交易前安全 | token audit -> audit-plus -> risk fusion |
| `P_WALLET_XRAY` | 钱包分析 | wallet positions -> per-token risk -> wallet-doctor |
| `P_SMART_MONEY` | 聪明钱追踪 | trading signal -> token risk -> risk fusion |
| `P_FOURMEME_CREATE` | Four.meme 创建 | integration flow -> safety checkpoint |
| `P_DEEP_AUDIT` | 合约深度审计 | token info -> token audit -> contract-profiler -> audit-plus -> risk fusion |

流水线 ID 是稳定协议标识，不依赖容易漂移的数字编号。

## Skill 清单

| 分组 | Skills |
|---|---|
| Binance Web3 | `query-token-info`, `query-token-audit`, `query-address-info`, `trading-signal`, `crypto-market-rank`, `meme-rush`, `binance-agentic-wallet`, `binance-tokenized-securities-info` |
| Binance Exchange and Payments | `binance`, `fiat`, `p2p`, `payment`, `square-post`, `onchain-pay` |
| Four.meme | `four-meme-integration`, `four-meme-ai`, `four-guard` |
| Audit Core | `audit-plus` |
| Skill++ Library | `contract-profiler`, `risk-fusion`, `wallet-doctor`, `newbie-tutor`, `watchtower`, `opportunity-board`, `scam-pattern-lab` |

## 兼容性

Skill++ 把 pipeline ID、命令路由、schema、checkpoint 和默认安全行为都视为公开协议。v0.1 兼容性合约写在 [COMPATIBILITY.md](COMPATIBILITY.md)，并由 CI 自动检查。

v0.1 更新应采用增量方式：可以添加新 skill、新字段、新 prompt、新 adapter 或新 pipeline，但不能重命名或删除已有公开标识。破坏性变更需要新的兼容性基线；`1.0.0` 之后还需要新的 major 版本。

## Skill++ 库模块

| 模块 | 作用 |
|---|---|
| `contract-profiler` | 深度审计前提取合约结构 |
| `risk-fusion` | 融合 token audit、audit-plus、市场、聪明钱、钱包和社交信号 |
| `wallet-doctor` | 诊断钱包持仓健康度和风险暴露 |
| `newbie-tutor` | 只基于当前上下文解释链上和审计术语 |
| `watchtower` | 为地址、合约和事件设计监控规则 |
| `opportunity-board` | 聚合扫链、榜单、聪明钱和风险过滤候选 |
| `scam-pattern-lab` | 把审计证据映射到常见链上骗局模式 |

## AI 兼容性

Skill++ 以 `SKILL.md` 作为主要 AI 入口，并提供不同 agent 的 adapter 和 prompt。

| AI / Agent | 加载方式 |
|---|---|
| BinanceAI | 读取 `SKILL.md`，再使用 `adapters/binance-ai.md` |
| Claude / Claude Code / Claude Opus | 读取 `SKILL.md`，再使用 `adapters/claude.md` |
| GPT / ChatGPT / Custom GPT | 使用 `adapters/gpt.md` 或 `prompts/universal-system-prompt.md` |
| Gemini | 使用 `adapters/gemini.md` |
| Kimi | 使用 `adapters/kimi.md` |
| Mimo | 使用 `adapters/mimo.md` |
| OpenClaw | 使用 `adapters/openclaw.md` |
| Codex | 读取 `SKILL.md`；需要确定性路由时运行 `scripts/skillpp.mjs` |

## 写操作边界

`skillpp` 包包含调度器、协议文件、schemas、adapters、prompts 和随包只读辅助脚本。它不会静默安装钱包、交易所或 Four.meme 写操作工具。

写操作流程默认是带检查点的 handoff；只有用户安装并明确调用匹配的外部 CLI 后，才进入真实写操作执行。

只有需要写操作时才安装外部 CLI：

```bash
npm i -g @binance/agentic-wallet
npm i -g @binance/binance-cli
npm i -g @four-meme/four-meme-ai@latest
```

这些包提供 `baw`、`binance-cli` 和 `fourmeme`。

没有这些工具时，Skill++ 仍可解析、路由、执行只读检查、审计、风险融合和检查点输出，但不能声称写操作已经成功。

## 安全模型

Skill++ 可以直接执行部分只读 Node CLI，例如 token 查询、榜单、聪明钱数据和钱包持仓。它不会静默执行以下操作：

- 私钥、API key、登录态、转账、swap、下单、发布或发文
- 高风险、结果冲突或证据不足
- 任何需要用户承担资金或身份风险的动作

敏感动作会输出结构化检查点，并要求用户明确确认。`scripts/skillpp.mjs` 对 blocking checkpoint 使用 exit code `10`。

Skill++ 输出仅用于研究和风险提示，不构成投资建议。

## 目录结构

```text
skillpp/
├── README.md
├── README.zh-CN.md
├── COMPATIBILITY.md
├── package.json
├── SKILL.md
├── registry.md
├── pipelines.md
├── rules.md
├── skillpp.manifest.json
├── schemas/
├── scripts/
├── adapters/
├── prompts/
├── assets/
├── tests/
└── skills/
    ├── binance-web3/
    ├── binance/
    ├── four-meme/
    ├── audit-plus/
    └── skillpp/
```

Skill 路径统一使用 `skills/<group>/<skill-name>/`。

## 发布检查

```bash
npm test
npm run validate
npm run compatibility
npm pack --dry-run
```

GitHub Actions 会在 push、pull request 和手动触发时运行同样检查。

## License

[MIT](LICENSE)
