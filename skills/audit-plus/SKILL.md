---
name: audit-plus
description: |
  通用 EVM 智能合约深度审计。分析任意合约的权限拓扑、用途推断、多维度风险评分。
  不是简单的安全扫描（那是 query-token-audit 的活），而是 AI 驱动的合约级深度分析。
  触发词：审计合约、代码分析、有无后门、合约权限、深度分析、合约能信吗
metadata:
  version: "1.0.0"
  type: audit
  status: active
  chainConstraints: [Ethereum, BSC, Base, Polygon, Arbitrum, Optimism, Avalanche]
  capabilities:
    - id: analyze
      produces: [riskScore, permissionTopology, purposeAnalysis, fundSafety, codeQuality, upgradeRisk, findings]
      description: "对合约源码进行全方位深度审计"
    - id: quick-assess
      produces: [riskScore, permissionTopology, topFindings]
      description: "快速评估（仅权限+主要风险，3分钟内完成）"
  dependsOn:
    - query-token-info
    - query-token-audit
---

# Audit-Plus — 通用智能合约深度审计

> 本 skill 与 skill++ 的 P_DEEP_AUDIT 联动执行。

---

## ⚡ AI 读这里（执行流程）

```
audit-plus 审计流程 3 步：

STEP 0: 获取源码
  IF 用户粘贴了代码 → 直接用
  ELSE IF 有合约地址 → 通过区块浏览器 API 拉取验证源码
  ELSE → 要求用户提供代码或地址

STEP 1: 获取上下文（并行，无依赖关系）
  → query-token-info/search    (代币基本元数据)
  → query-token-audit/audit    (快速安全扫描基线)
  → 如果是 BSC: 可选拉 BSCScan 上的交易数/创建者等

STEP 2: 多维分析 + 生成报告
  按 5 个维度逐一分析 → 综合评分 → 生成结构化报告
  → [CHECKPOINT AUDIT_REPORT]
```

---

## 🔌 STEP 0: 源码获取（Source Code Fetching）

### 方式 1: 区块浏览器 API 拉取（已验证合约）

不需要用户安装任何工具。用 curl 直接调 API。

**BSC (BSCScan):**
```bash
curl -s "https://api.bscscan.com/api?module=contract&action=getsourcecode&address=<CONTRACT_ADDRESS>&apikey=YourApiKeyToken"
```
> BSCScan API 有频率限制（免费 5 req/s）。如无 API Key，用网页版 curl 抓取：
> ```bash
> curl -s "https://bscscan.com/address/<CONTRACT_ADDRESS>#code" | grep -A 100000 "editor" | sed 's/<[^>]*>//g'
> ```
> 更可靠的方式：直接让用户打开 `https://bscscan.com/address/<ADDRESS>#code` 复制代码给你。

**Ethereum (Etherscan):**
```bash
curl -s "https://api.etherscan.io/api?module=contract&action=getsourcecode&address=<CONTRACT_ADDRESS>&apikey=YourApiKeyToken"
```

**Base (Basescan):**
```bash
curl -s "https://api.basescan.org/api?module=contract&action=getsourcecode&address=<CONTRACT_ADDRESS>&apikey=YourApiKeyToken"
```

**Polygon (Polygonscan):**
```bash
curl -s "https://api.polygonscan.com/api?module=contract&action=getsourcecode&address=<CONTRACT_ADDRESS>&apikey=YourApiKeyToken"
```

> **通用模式**：`https://api.<explorer-domain>/api?module=contract&action=getsourcecode&address=<ADDR>`
> 所有 EVM 区块浏览器共用此 Etherscan 兼容 API。

### 方式 2: 用户直接粘贴代码

如果上述 API 调用失败（无 API Key / 限流 / 未验证）：
1. 告知用户："请打开 <区块浏览器链接>#code 页面，复制合约源码给我"
2. 等待用户粘贴代码后继续

### 方式 3: GitHub 拉取

如果用户提供了 GitHub 链接（如 `github.com/.../Contract.sol`）：
```bash
curl -s "<RAW_GITHUB_URL>"
```
> 将 `github.com` 转为 `raw.githubusercontent.com`，去掉 `blob/` 路径段。

---

## 📊 STEP 2: 五大审计维度

### 🔐 维度 1: 权限拓扑分析 (Permission Topology)

**检查清单：**
```
□ owner/admin 地址是什么？
  → 是 EOA？多签合约？0地址（不可更改）？黑洞地址？
□ 特权函数有哪些？
  mint() / burn() / pause() / unpause()
  / setFee() / setTax() / excludeFromFee()
  / blacklist() / whitelist()
  / withdraw() / rescueToken()
  / upgradeTo() / setImplementation()
  / transferOwnership() / renounceOwnership()
□ 特权函数有无保护？
  → onlyOwner? onlyRole? multisig? timelock?
  → 有 delay 吗？有 max limit 吗？
□ 单点控制风险
  → 一个地址能提走所有钱？能暂停所有人交易？能无限 mint？
□ 权限放弃状态
  → owner 是否已 renounce？
  → 如果 renounce 了，哪些功能永远无法更改？

输出:
  - 权限拓扑图（owner → 特权函数清单）
  - 单点控制风险评分（0-5）
  - 特权函数完整列表（每项标注风险级别）
```

### 🎯 维度 2: 合约用途推断 (Purpose Analysis)

**检查清单：**
```
□ 代码实际实现了什么功能？
  → 标准 ERC20？反射代币？分红代币？质押？机枪池？NFT？
□ 与官方描述是否一致？
  → 如果 query-token-info 返回了描述信息，与代码逻辑比较
  → 声明是"去中心化代币"但 owner 能随时暂停交易？
□ 隐藏功能检测
  → 有没有不在 UI 中展示的函数？（如 hiddenMint, devWithdraw）
  → 有没有后门？（如仅 owner 可见的提款路径）
  → 有没有时间锁炸弹？（如 N 天后自动执行某个操作）
□ 已知恶意模式匹配
  → 蜜罐（只能买不能卖）
  → 无限授权陷阱（approve 到恶意地址）
  → 假收益（显示高收益但无法提取）
  → 税率陷阱（反复修改税率夹击用户）

输出:
  - 用途分类（代币/质押/NFT/DeFi/其他）
  - 与宣称的一致性评估
  - 可疑函数列表
```

### 💰 维度 3: 资金安全分析 (Fund Safety)

**检查清单：**
```
□ 用户资金存放在哪里？
  → 本合约？（托管风险高）
  → 去中心化流动性池？（如 PancakeSwap/Uniswap）
  → 用户自己钱包？（自托管，风险低）
□ 提款路径
  → owner 能否直接提取合约内资产？（emergencyWithdraw/withdrawToken）
  → 提取有限额吗？有延迟吗？
□ Rug 可行性分析
  → owner 能一次性提走 LP 吗？
  → 有 removeLiquidity 权限吗？
  → 能无限 mint 然后砸盘吗？
□ 授权风险
  → 合约是否会调用用户的 approve？
  → approve 的目标地址是否可被篡改？
  → 有没有 permit 签名风险？

输出:
  - 资金流向图
  - Rug 可能性评分
  - 授权风险清单
```

### 🏗️ 维度 4: 代码质量评估 (Code Quality)

**检查清单：**
```
□ 安全库使用
  → 使用了 OpenZeppelin / Solady？
  → 还是自己手写的转账/权限逻辑？（手写 = 风险高）
□ 编译器版本
  → 版本号（<0.8.0 有溢出风险，>=0.8.20 有 PUSH0 兼容问题）
  → 是否锁定版本（^0.8.0 比 =0.8.19 风险高）
□ 代码结构
  → 单文件？（难审计）
  → 模块化？（清晰）
  → 有没有扁平化的痕迹？
□ 测试覆盖
  → 代码仓库里有没有 test/ 目录？
  → 有没有 foundry.toml / hardhat.config？
□ 文档
  → 有没有 NatSpec 注释？
  → 有没有 README？

输出:
  - 代码质量评分（0-5）
  - 发现的代码质量问题列表
  - 最佳实践建议
```

### 🔄 维度 5: 升级风险分析 (Upgrade Risk)

**检查清单：**
```
□ 代理模式识别
  → UUPS？Transparent Proxy？Beacon Proxy？Diamond？
  → 还是非代理？（不可升级 = 低风险）
□ 升级权限
  → 谁有权升级？（owner / guardian / multisig / DAO）
  → 有 timelock 延迟吗？
  → 升级前有事件通知吗？
□ 锁定机制
  → 是否可以永久锁定升级？（renounce upgrade authority）
  → 是否已锁定？
□ 数据迁移
  → 存储布局是否兼容？
  → 升级历史（如果可查）

输出:
  - 升级风险评分
  - 代理模式图
  - 升级历史
```

---

## 📋 综合评分计算

```
综合风险评分 = 加权平均:
  权限拓扑 × 0.30
  + 用途推断 × 0.15
  + 资金安全 × 0.30
  + 代码质量 × 0.10
  + 升级风险 × 0.15

评级:
  0.0 - 1.0 → 🟢 LOW: 权限分散、代码好、无 rug 可能
  1.1 - 2.5 → 🟢 LOW-MEDIUM: 有中心化要素但总体可控
  2.6 - 3.5 → 🟡 MEDIUM: 存在显著中心化风险或代码问题
  3.6 - 4.5 → 🟠 HIGH: 严重风险，强烈不建议交互
  4.6 - 5.0 → 🔴 CRITICAL: 几乎确定是恶意合约
```

---

## 📝 报告输出格式

```
┌──────────────────────────────────────────┐
│          🔬 Audit-Plus 审计报告            │
│                                           │
│ 合约: <name> (<symbol>)                   │
│ 链: <chainName>                           │
│ 地址: <contractAddress>                   │
│ 审计时间: <timestamp>                      │
│                                           │
│ ─────────── 📊 综合评分 ───────────       │
│ 🟡 3.2 / 5.0 (MEDIUM RISK)               │
│                                           │
│ 分维度:                                   │
│   🔐 权限拓扑:  4/5 🟠 (单点控制)         │
│   🎯 用途推断:  1/5 🟢 (一致)            │
│   💰 资金安全:  3/5 🟡 (owner可提款)     │
│   🏗️ 代码质量:  2/5 🟢 (用了OZ)          │
│   🔄 升级风险:  2/5 🟢 (不可升级)        │
│                                           │
│ ─────────── 🔍 关键发现 ───────────       │
│ 🔴 CRITICAL: 无                            │
│ 🟠 HIGH: owner 可单方面提取合约内 BNB      │
│ 🟡 MEDIUM: 5% 买卖税，owner 可改至 50%    │
│ 🟢 LOW: 编译器版本 0.8.19 正常             │
│                                           │
│ ──────── 🔗 交叉验证 ────────────          │
│ query-token-audit: MEDIUM (2/5) ✅ 一致    │
│ query-token-info: 已验证合约 ✅              │
│                                           │
│ ⚠️ 以上分析仅供参考，不构成投资建议。       │
│ 请自行研究 (DYOR)。                        │
└──────────────────────────────────────────┘
```

---

## 🔄 审计闭环：报告 → 项目描述 → 下一步路由

> **审计不是终点。报告生成后，自动进入闭环：**

### 闭环三步走

```
[1] 审计报告输出
      │
      ▼
[2] 自动生成项目摘要（Project Context Summary）
    ┌─────────────────────────────────────┐
    │ 项目名称: <name> (<symbol>)         │
    │ 合约类型: ERC20 Meme代币 / 含反射机制 │
    │ 链: BSC (56)                         │
    │ 风险等级: 🟡 MEDIUM (3.2/5)          │
    │ 核心风险: owner 可提款 / 税率可改    │
    │ 安全项: 已验证开源 / 不可升级         │
    │ 建议: 小仓位观察 / 监控 owner 活动   │
    └─────────────────────────────────────┘
      │
      ▼
[3] 智能下一步路由（基于风险等级 + 用户原始意图）
    → 衔接到合适的后续 skill/pipeline
```

### 项目摘要格式（机器可读 + 人类可读）

审计完成后，skill++ 必须输出以下结构化的项目摘要，**作为后续所有 skill 调用的上下文**：

```json
{
  "projectSummary": {
    "name": "PepeToken",
    "symbol": "PEPE", 
    "contractAddress": "0x1234...5678",
    "chain": "BSC",
    "chainId": "56",
    "contractType": "ERC20 Meme代币 (反射+燃烧)",
    "riskLevel": 3.2,
    "riskLabel": "MEDIUM",
    "topRisks": [
      "owner可提取合约内BNB",
      "税率可由owner修改至50%",
      "owner为单点EOA无多签保护"
    ],
    "safetyItems": [
      "已验证开源合约",
      "不可升级(非代理模式)",
      "使用OpenZeppelin标准库"
    ],
    "recommendedActions": [
      "监控owner地址活动",
      "小仓位试探性交易",
      "关注聪明钱是否入场"
    ]
  }
}
```

### 下一步路由表（Next-Step Router）

审计完成后，**不要直接结束**。根据风险等级 + 审计发现，主动推荐后续操作：

| 风险等级 | 审计发现 | 推荐的下一步 | Pipeline |
|---------|---------|-------------|----------|
| 🟢 LOW | 一切正常 | "看起来安全，要查行情/交易吗？" | → P_TOKEN_ANALYSIS  代币分析 |
| 🟢 LOW | 有聪明钱信号 | "该代币低风险，要我帮你跟聪明钱信号吗？" | → P_SMART_MONEY: 聪明钱追踪 |
| 🟡 MEDIUM | owner 有特权 | "⚠️ owner 权限较大，要监控他的活动吗？" | → query-address-info 查 owner 地址 |
| 🟡 MEDIUM | 税率可变 | "⚠️ 税率可被修改，要我查当前市场热度吗？" | → P_CHAIN_SCAN  扫链分析 |
| 🟠 HIGH | 存在严重中心化 | "不建议交互。要我帮你找类似但更安全的项目吗？" | → P_CHAIN_SCAN  扫链找替代 |
| 🔴 CRITICAL | 确认恶意模式 | "该合约高度疑似骗局。强烈建议远离。" | → 终止 / 报告至社区 |
| ⚪ UNKNOWN | 合约未开源 | "源码不可获取。只能做字节码分析，要我继续吗？" | → 有限分析 / 告知局限性 |

### 用户原始意图保留

```
用户原始输入: "https://bscscan.com/address/0x...#code 这个合约有没有后门？"
          ↓
审计结果: 未发现后门，但 owner 有提款权限（MEDIUM 风险）
          ↓
skill++ 回复:
  "审计完成。未发现隐藏后门 ✅
   但 owner 可提取合约内 BNB ⚠️
   
   📋 项目摘要已生成（见上方）
   
   建议下一步:
   1. 🔍 查 owner 地址活动 → "查 owner"
   2. 📊 看市场热度 → "看行情"
   3. 🐳 跟踪聪明钱 → "跟踪信号"
   
   你想做什么？或者我继续深入审计某个具体方面？"
```

---

## 🔗 与 skill++ 的闭环集成

```
skill++ 完整闭环:

  STEP 0: 解析用户输入（URL/地址/代码/意图）
  STEP 1: 检查工具依赖
  STEP 2: 匹配 P_DEEP_AUDIT
  STEP 3: 执行审计
          ├→ 获取源码
          ├→ 拉取上下文（query-token-info + query-token-audit）
          ├→ 五维深度分析
          └→ [CHECKPOINT] 展示审计报告
  ═══════════════════════════════════ ← 闭环分界线
  STEP 4: 自动生成项目摘要（Project Context Summary）
  STEP 5: 基于风险+发现，推荐下一步路由
  STEP 6: 等待用户选择 → 衔接到下一个 Pipeline
  
  下一个 Pipeline 可以回到审计:
    例如: P_TOKEN_ANALYSIS 代币分析) → 发现问题 → 回到 P_DEEP_AUDIT 深度审计)
    例如: P_SMART_MONEY (聪明钱) → 发现可疑 → 回到 P_DEEP_AUDIT 重新评估)
```

---

## 🧠 恶意模式库 (Known Malicious Patterns)

> 以下模式基于 SWC 注册表、DeFi 攻击历史、社区共识。匹配到任一模式即标记对应风险等级。

### CRITICAL — 确定恶意

| 模式ID | 模式名称 | 代码特征 | 判定条件 |
|--------|---------|---------|---------|
| `HONEYPOT-01` | 蜜罐（只能买不能卖） | `transfer()` 中检测 `to==pair` 时 revert / 黑名单 / maxTxAmount=0 | 买入正常但卖出必定失败 |
| `RUG-01` | 无限 Mint 后门 | `mint()` 无 onlyOwner 或无上限 / hidden mint 函数 | owner 可无限增发 |
| `RUG-02` | 单键 Rug | owner 可调 `removeLiquidity` + `transfer` 一气呵成 | 一次调用掏空池子 |
| `RUG-03` | 假 renounce | `renounceOwnership()` 被 override 为空函数或可逆 | 宣称放弃所有权但实际没放弃 |
| `RUG-04` | 延迟 Rug | 时间锁 < 24h + owner 可提走 LP | 短线锁仓，到期即 rug |
| `BACKDOOR-01` | 隐藏提款函数 | 函数名伪装（如 `doSwap` / `updateConfig` 实际是提款） | 函数名与行为不符 |
| `BACKDOOR-02` | 代理后门 | UUPS 升级到包含 `selfdestruct` 的新实现 | 升级后合约直接销毁 |
| `PHISH-01` | 假代币 | `symbol()` 返回知名代币符号（USDT/USDC）但无储备 | 冒充知名代币 |

### HIGH — 严重风险

| 模式ID | 模式名称 | 代码特征 | 判定条件 |
|--------|---------|---------|---------|
| `CENT-01` | 单点控制所有资金 | owner 可调 `withdraw` / `rescueToken` 无金额限制 | 一个地址能掏空合约 |
| `CENT-02` | 无限黑名单 | owner 可 `blacklist(address, true)` 无解锁机制 | 任何人可被永久冻结 |
| `CENT-03` | 税率无上限 | `setFee(uint256)` 无 max 限制 | 税率可设到 100% |
| `CENT-04` | 无时间锁的代理升级 | proxy admin 可即时升级 | 用户前一秒正常后一秒被抢 |
| `TAX-01` | 买入税可改 | `_buyTax` 可被 owner 修改 | 买之前 1% 买之后 99% |
| `TAX-02` | 卖出税可改 | `_sellTax` 可被 owner 修改 | 同上逻辑，卖出被夹 |
| `SLIPPAGE-01` | 最大交易量可控 | `_maxTxAmount` 可被 owner 改为极小值 | 实际冻结所有卖出 |

### MEDIUM — 需关注

| 模式ID | 模式名称 | 代码特征 | 判定条件 |
|--------|---------|---------|---------|
| `AUTH-01` | owner 为单点 EOA | `owner()` 返回非合约地址 | 单人控制，无多签保护 |
| `AUTH-02` | 特权函数无事件 | `onlyOwner` 函数内无 `emit` | 用户无法监听权限操作 |
| `ECON-01` | 未锁流动性 | 无 LP lock / 时间锁 < 30 天 | 流动性短期即撤 |
| `ECON-02` | 团队分配过大 | `_teamWallet` 持有 > 20% 总量 | 砸盘风险高 |
| `CODE-01` | 自定义转账逻辑 | 手写 `_transfer()` 而非继承标准库 | 容易出现逻辑漏洞 |
| `CODE-02` | 浮点/精度处理 | 使用非标准精度计算 | 精度损失导致资产计算错误 |
| `CODE-03` | 未锁定编译器版本 | `pragma solidity ^0.8.0` | 不同编译器版本行为可能不同 |

### LOW — 建议改进

| 模式ID | 模式名称 | 代码特征 |
|--------|---------|---------|
| `BEST-01` | 缺少 NatSpec | 函数无 `@notice` / `@param` / `@return` |
| `BEST-02` | 缺少事件 | 状态变更函数无 `emit` |
| `BEST-03` | 单文件合约 | 所有逻辑在单一 .sol 文件 |
| `BEST-04` | 魔法数字 | 字面量未定义为 constant |

---

## 📐 评分细则 (Scoring Rubric)

### 维度 1: 权限拓扑 (权重 0.30)

```
起始分 0，加分/扣分:

扣分:
  owner 是 EOA 无多签         +2.0
  有 mint 无上限              +2.0
  有 pause 功能               +1.0
  黑名单无解锁机制            +1.5
  可修改税率                  +1.0
  可提走合约内全部资金         +2.5  (直接跳到 5)
  提款无金额限制              +1.0
  特权操作无事件通知          +0.5
  声称 renounce 但实际可逆    +3.0  (直接跳到 5)

加分 (减轻):
  owner 是多签 (GnosisSafe)   -2.0
  有时间锁 (TimelockController) -1.5
  特权函数有 max 限制          -1.0
  已 renounce ownership       -3.0
  多角色分权 (RBAC)           -1.0

最终: clamp(0, 5)
```

### 维度 2: 用途推断 (权重 0.15)

```
起始分 0:
  代码行为与描述不一致        +2.0
  隐藏函数（未在 UI 公开）    +3.0  (每发现一个)
  匹配到恶意模式              +5.0  (直接跳到 5)
  函数名与行为不符            +2.0

最终: clamp(0, 5)
```

### 维度 3: 资金安全 (权重 0.30)

```
起始分 0:
  owner 可提取用户资金          +3.0
  owner 可移除流动性             +3.0
  owner 可无限 mint             +3.0
  无限授权风险 (approve 到可控地址) +2.0
  无 LP 锁或锁定期 < 7 天      +2.0
  合约持有用户资金 (托管模式)    +2.0

加分:
  LP 锁定 > 180 天              -2.0
  用户资金自托管                -2.0
  有提取限额                    -1.0

最终: clamp(0, 5)
```

### 维度 4: 代码质量 (权重 0.10)

```
起始分 0:
  手写转账逻辑                  +2.0
  编译器 < 0.8.0               +1.5
  编译器 >= 0.8.20 (PUSH0 bug)  +1.0
  单文件无模块化                +1.0
  无测试                        +1.0
  无 NatSpec                    +0.5

加分:
  使用 OZ/Solady 标准库         -1.5
  模块化结构清晰                -1.0
  有完整测试套件                -1.5
  编译器版本锁定                -0.5

最终: clamp(0, 5)
```

### 维度 5: 升级风险 (权重 0.15)

```
起始分 0:
  是代理合约                    +2.0
  升级权在单点 EOA              +2.0
  无时间锁                      +1.5
  升级无事件通知                +0.5

加分:
  非代理 (不可升级)             -3.0
  升级已锁定 (renounced)        -3.0
  有多签 + 时间锁               -2.0

最终: clamp(0, 5)
```

---

## ⏱️ 审计深度三档

| 档位 | 时间 | 覆盖 | 适用场景 |
|------|------|------|---------|
| **快速** | ~3min | 权限拓扑 + 恶意模式匹配 + 资金安全 | 用户说"快速看一眼" |
| **标准** | ~10min | 全部 5 维度 | 默认模式 |
| **深度** | ~20min+ | 5 维度 + 导入依赖全展开 + 链上交易历史 + owner 地址画像 | 用户说"深度审计" |

### 深度审计增量检查

```
标准审计之外，深度审计增加:

□ 所有 import 文件递归展开审计（不是只看主文件）
□ 链上交易历史分析:
  - owner 的历史交易（是否 rug 过其他项目）
  - 合约创建后的资金流向
  - 是否有疑似测试/调参交易
□ owner 地址画像:
  - 是否是已知攻击者地址
  - 是否关联其他合约
  - 是否有 Tornado Cash 交互
□ 存储布局兼容性检查（如果升级过）
```

---

## 📄 审计报告文件输出

审计完成后，生成结构化报告文件：

```
文件名: audit_<chain>_<address_short>_<timestamp>.md
示例: audit_BSC_0x882d_20260615.md

路径: skills/audit-plus/reports\

报告内容:
  1. 审计摘要（机器可读 JSON block）
  2. 执行摘要（人类可读）
  3. 各维度详细发现
  4. 综合评分
  5. 下一步建议
  6. Disclaimer
```

报告同时作为后续 skill 的输入上下文——P_DEEP_AUDIT 完成后，skill++ 的 STEP 4 读取报告文件中的机器可读 JSON，自动生成项目摘要，STEP 5 基于评分推荐下一步。
