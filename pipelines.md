# Skill++ 流水线模板 (Pipeline Templates)

> **给 AI 的阅读指引**：当用户意图匹配到某个流水线时，按 Step 顺序执行。
> `→` 表示数据从前一步传递到下一步。`[CHECKPOINT]` 表示必须停下来等待用户确认。

---

## P_TOKEN_ANALYSIS: 代币深度分析

**触发**: "分析这个代币" "这个币怎么样" "帮我看看 XXX" "XXX值不值得买"

```
用户输入：代币名称/符号/合约地址

Step 1 → query-token-info/search
  INPUT:  { keyword: <用户输入> }
  OUTPUT: { contractAddress, chainId, name, symbol }
  失败:   提示找不到代币，请用户提供合约地址

Step 2 → query-token-audit/audit（如果提供了合约地址或 Step1 成功）
  INPUT:  { chainId: <Step1.chainId>, contractAddress: <Step1.contractAddress> }
  OUTPUT: { riskLevel, riskLevelEnum, riskItems, buyTax, sellTax }
  [CHECKPOINT AUDIT_RESULT]
  - riskLevel >= 4: 🔴 强烈警告，建议不要交易
  - riskLevel 2-3:  🟡 展示风险，让用户决定
  - riskLevel 0-1:  🟢 低风险，但 DYOR
  - API 不可用:   进入降级流程（见 rules.md）

Step 3 → query-token-info/dynamic（并行）
  INPUT:  { chainId: <Step1.chainId>, contractAddress: <Step1.contractAddress> }
  OUTPUT: { price, percentChange24h, volume24h, marketCap, holders, liquidity }

Step 4 → trading-signal/smart-money（并行）
  INPUT:  { chainId: <Step1.chainId> }
  OUTPUT: 该链上的聪明钱信号（在结果中筛选 Step1 代币相关信号）

Step 5 → crypto-market-rank/token-rank（可选，查市场热度）
  INPUT:  { chainId: <Step1.chainId>, rankType: 10 }
  OUTPUT: 该链热门代币（对照当前代币是否在榜）

最终汇总展示:
  ┌─ 基本信息（名称/符号/合约/链）
  ├─ 安全审计（风险等级+风险项+税率）
  ├─ 实时行情（价格/24h涨跌/成交量/市值）
  ├─ 聪明钱信号（是否有大户在买卖）
  └─ 市场热度（是否在 Trending 榜）
```

---

## P_CHAIN_SCAN: 扫链找机会

**触发**: "最近有什么好项目" "扫一下链上机会" "BSC上有什么新币" "热点"

```
用户输入：链名 + 可选条件

Step 1 → meme-rush/meme-rush（找新发射代币）
  INPUT:  { chainId: <用户指定链>, rankType: <10=新/20=即将完成/30=已迁移> }
  OUTPUT: 发射台代币列表

Step 2 → crypto-market-rank/token-rank（找热门代币）
  INPUT:  { chainId: <用户指定链>, rankType: 10 }
  OUTPUT: Trending 排行榜

Step 3 → crypto-market-rank/smart-money-inflow（聪明钱流入排行）
  INPUT:  { chainId: <用户指定链>, period: "24h" }
  OUTPUT: 聪明钱净流入排行

Step 4 → meme-rush/topic-rush（AI 热点话题）
  INPUT:  { chainId: <用户指定链>, rankType: 10, sort: 10 }
  OUTPUT: AI 检测到的热点话题 + 关联代币

Step 5 → risk-fusion/fuse
  INPUT:  Step1-4 的候选列表、热度、资金流入、话题和已知风险标签
  OUTPUT: 统一风险标签、证据摘要、冲突项、置信度

Step 6 → opportunity-board/board
  INPUT:  risk-fusion 输出 + 候选代币列表
  OUTPUT: 可观察/需审计/放弃的机会看板

汇总展示（交叉对比 + 风险过滤）:
  ┌─ 🆕 新发射代币（从 meme-rush）
  ├─ 🔥 热门代币（从 token-rank）
  ├─ 🐳 聪明钱在买的（从 smart-money-inflow）
  ├─ 💬 市场在讨论的（从 topic-rush）
  ├─ 🧪 风险融合结果（从 risk-fusion）
  └─ 📋 机会看板（从 opportunity-board）
  → 标出同时出现在多个榜单中的代币 = 高共识标的
```

---

## P_TRADE_SAFETY: 安全交易前置检查

**触发**: 用户要执行任何交易操作（buy/sell/swap/transfer）时自动执行

```
此流水线是交易操作的强制性前置步骤（见 rules.md 安全检查点规则）

Step 1 → query-token-audit/audit
  INPUT:  { chainId: <交易目标链>, contractAddress: <交易代币地址> }
  OUTPUT: { riskLevel, riskItems, buyTax, sellTax, isVerified }
  [CHECKPOINT AUDIT_RESULT]

Step 2: 风险评估
  IF riskLevel >= 4:
    BLOCK 交易 → 展示所有严重风险 → 用户必须明确说"继续（了解风险）"才能放行
  IF buyTax > 10% OR sellTax > 10%:
    WARN "⚠️ 异常税率，买入可能无法卖出"
  IF isVerified == false:
    WARN "⚠️ 该合约未经验证，存在未知风险"

Step 3: 只有通过所有检查后才允许执行交易
  IF 通过 → 转交 binance-agentic-wallet 或 four-meme-integration 执行交易
  IF 不通过 → 终止，建议用户不要交易
```

---

## P_WALLET_XRAY: 钱包持仓分析

**触发**: "查一下这个地址" "我的钱包有什么" "持仓分析"

```
用户输入：钱包地址 + 链名

Step 1 → query-address-info/positions
  INPUT:  { address: <钱包地址>, chainId: <链ID>, offset: 0 }
  OUTPUT: 持仓列表（分页，需循环拉取直到 list 为空）

Step 2: 对每个持仓代币并行查询（至少前 10 大持仓）
  FOR EACH token IN top10(holdings):
    ├→ query-token-audit/audit        → 安全审计
    └→ query-token-info/dynamic       → 实时行情

Step 3: 汇总展示
  ┌─ 📊 总览：X 个代币｜总价值估算
  ├─ 🏆 Top 10 持仓明细（名称/数量/价格/价值/24h变化）
  ├─ 🛡️ 安全状态（绿色=已审计安全 / 红色=高危 / 灰色=未审计）
  └─ 📈 整体健康度评分
```

---

## P_SMART_MONEY: 聪明钱追踪

**触发**: "聪明钱在买什么" "跟单信号" "大户动向" "鲸鱼交易"

```
用户输入：链名（可选）+ 过滤条件

Step 1 → trading-signal/smart-money
  INPUT:  { chainId: <链ID>, pageSize: 50 }
  OUTPUT: 聪明钱信号列表
  FILTER: 优先 status=active 的信号，排除 exitRate>80% 的

Step 2: 对活跃信号中的代币做快速审计
  FOR EACH signal IN active_signals (top 10):
    → query-token-audit/audit

Step 3 → risk-fusion/fuse
  INPUT:  trading-signal 信号 + query-token-audit 风险结果
  OUTPUT: 风险标注、信号可信度、冲突项、下一步建议

Step 4: 展示（高亮风险项）
  ┌─ 🐳 活跃聪明钱信号
  │  信号 | 代币 | 方向 | 触发价 | 当前价 | 最大收益 | 聪明钱数 | 退出率
  ├─ 🛡️ 安全状态
  │  🟢 安全 | 🟡 注意 | 🔴 危险
  └─ 📊 risk-fusion 汇总：X 买 Y 卖 | 平均收益 Z% | 高风险 N 个
```

---

## P_FOURMEME_CREATE: Four.meme 发币流程

**触发**: "在 four.meme 上发币" "创建 meme 代币" "发行代币"

```
⚠️ 此流水线需要 PRIVATE_KEY，执行前必须完成安全检查点

Step 1: 收集必要信息（必须从用户获取）
  - 图片路径（代币 logo）
  - 代币名称、符号、描述
  - 标签（Meme | AI | Defi | Games | Infra | De-Sci | Social | Depin | Charity | Others）
  - 是否启用税务代币功能

Step 2 → four-meme-integration/create-instant
  INPUT:  所有 Step1 收集的信息
  OUTPUT: 交易哈希 + 代币地址
  [CHECKPOINT CREATE_CONFIRM] 展示费用+参数，等待用户确认

Step 3: 验证创建结果
  → four-meme-integration/token-info  <新代币地址>
  → four-meme-integration/events      <创建区块号>
```

---

## P_DEEP_AUDIT: 合约深度审计

**触发**: "审计这个合约" "帮我看看代码" "这个合约有没有后门" "分析合约权限"
**输入类型**: 区块浏览器 URL / 裸地址 / 粘贴源码 / GitHub 链接

```
[STEP 0: 输入解析 — 由 skill++ SKILL.md 的 Input Parser 处理]
  ├─ 区块浏览器 URL → 提取 chain + contractAddress + sourceAvailable
  ├─ 裸地址 0x... → 需确认链（默认BSC）
  ├─ 粘贴代码 → 跳过源码拉取，直接审计
  └─ GitHub 链接 → curl raw 内容

[STEP 1: 工具检查]
  audit-plus: 零依赖（curl + AI分析）
  query-token-info: node（检查 --version）
  query-token-audit: curl（零依赖）
  → 均无需用户安装额外工具 ✅

[STEP 2: 获取合约源码]
  IF sourceAvailable==true OR 用户给了区块浏览器链接:
    → curl 调区块浏览器 API
      格式: https://api.<explorer>/api?module=contract&action=getsourcecode&address=<ADDR>
    → 解析 SourceCode 字段（注意：可能是 JSON 字符串需要二次解析）
    → 提取 imports（如 @openzeppelin/...），从 npm/GitHub 拉取依赖
  ELIF 用户粘贴了代码:
    → 直接使用
  ELSE:
    → 告知用户: "请打开 <explorer>/address/<ADDR>#code 复制源码给我"
    → 等待用户操作

[STEP 3: 并行拉取上下文]
  A1 → query-token-info/search
    INPUT: { keyword: <contractAddress>, chainIds: <chainId> }
    OUTPUT: 代币名/符号/描述/创建者/社交链接
    失败: 跳过（不是代币合约，继续分析源码本身）

  A2 → query-token-audit/audit
    INPUT: { binanceChainId: <chainId>, contractAddress: <address> }
    OUTPUT: riskLevel, riskItems, buyTax, sellTax（快速扫描基线）
    失败: 跳过（API不可用，标记为"无基线数据"）

[STEP 4: 合约画像 — contract-profiler/profile]
  INPUT:  合约源码 + STEP 3 的上下文
  OUTPUT: 合约类型、权限入口、资金入口、外部依赖、升级入口、高危函数清单

[STEP 5: 多维深度分析 — audit-plus/analyze]
  INPUT:  合约源码 + contract-profiler 画像 + token info + token audit 基线
  分析维度:
  ┌─ 🔐 权限拓扑分析
  │   · owner/admin 身份（EOA/多签/0地址）
  │   · 特权函数清单（mint/burn/pause/黑名单/税率/提款/升级）
  │   · 每项特权的保护机制（onlyOwner/timelock/multisig）
  │   · 单点控制风险评分
  │   · 权限放弃状态
  │
  ├─ 🎯 合约用途推断
  │   · 从代码逻辑推断实际功能
  │   · 与声明描述一致性检查（用 STEP 1 的 token info）
  │   · 隐藏功能扫描
  │   · 已知恶意模式匹配
  │
  ├─ 💰 资金安全分析
  │   · 用户资金托管模式
  │   · 提款路径与限制
  │   · Rug 可行性（owner能否一次性提走所有钱）
  │   · 授权陷阱（approve/transferFrom/permit）
  │
  ├─ 🏗️ 代码质量评估
  │   · 安全库（OZ/Solady vs 手写）
  │   · 编译器版本
  │   · 代码结构（模块化 vs 单文件扁平化）
  │   · 测试/Doc
  │
  └─ 🔄 升级风险分析
      · 代理模式（UUPS/Transparent/Beacon/Diamond）
      · 升级权限归属
      · Timelock/锁定机制

[STEP 6: 风险融合 + Report — risk-fusion/fuse]
  加权计算:
    权限拓扑 × 0.30 + 资金安全 × 0.30
    + 用途推断 × 0.15 + 升级风险 × 0.15 + 代码质量 × 0.10

  与 query-token-audit 基线交叉验证 → 标注矛盾项
  与 contract-profiler 画像交叉验证 → 标注遗漏项

[CHECKPOINT AUDIT_REPORT]
  展示完整审计报告（见 audit-plus SKILL.md 的报告格式）
  
  如果风险高 → 主动从其他 skill 补充信息:
    → trading-signal/smart-money（聪明钱是否在抛）
    → crypto-market-rank/token-rank（是否在热门榜）
    → query-address-info（检查 owner 地址的活动）
  
  等待用户决定后续操作
```

---

## 流水线选择快速参考

| 用户说什么 | 走哪个流水线 |
|-----------|------------|
| "分析一下这个币" "XXX怎么样" | P_TOKEN_ANALYSIS: 代币深度分析 |
| "最近有什么热点" "扫链" "新项目" | P_CHAIN_SCAN: 扫链找机会 |
| "我要买/卖/swap"（自动触发） | P_TRADE_SAFETY: 安全交易前置检查 |
| "查钱包" "持仓" "我的地址" | P_WALLET_XRAY: 钱包持仓分析 |
| "审计合约" "代码分析" "有没有后门" "权限" | P_DEEP_AUDIT: 合约深度审计 |
| "聪明钱" "大户" "鲸鱼" "跟单" | P_SMART_MONEY: 聪明钱追踪 |
| "发币" "创建代币" "four.meme" | P_FOURMEME_CREATE: Four.meme 发币 |
