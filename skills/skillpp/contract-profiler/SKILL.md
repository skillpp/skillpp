---
name: contract-profiler
description: |
  合约画像分析器。判定合约类型、识别权限角色、提取特权函数清单。
  作为 audit-plus 的前置分析器，为深度审计提供结构化的合约画像。
  触发词：合约类型、这是什么合约、合约权限、privileged functions
metadata:
  version: "1.0.0"
  type: analysis
  group: skillpp
  dependsOn:
    - query-token-info
    - audit-plus
---

# Contract Profiler — 合约画像

> **给 AI 的指引**：收到合约源码后，按以下维度逐项分析，输出结构化 JSON。

---

## EXECUTE FLOW

```
STEP 0: 获取源码
  IF 有合约地址 AND 已验证 → curl 区块浏览器 API 拉源码
  ELSE → 用户提供源码
  → 进入 STEP 1

STEP 1: 分类合约类型
  按 Type Classification 表逐项判定

STEP 2: 识别权限角色
  搜索 owner/admin/governor/guardian/operator 关键词
  搜索 onlyOwner/onlyRole/onlyGovernor 修饰符

STEP 3: 枚举特权函数
  列出所有带权限修饰符的函数 + 每个函数的权限级别

STEP 4: 输出画像 JSON
```

---

## Type Classification

| 特征 | 类型 | 判定规则 |
|------|------|---------|
| `import` ERC20 / `IERC20` | TOKEN | 实现了 transfer/balanceOf |
| `import` ERC721 / `IERC721` | NFT | 实现了 ownerOf/tokenURI |
| 含 `mint()` + `burn()` + 税率变量 | TAX_TOKEN | Meme/反射代币 |
| 含 `swap()` / `addLiquidity()` | DEX_PAIR | 流动性对 |
| 含 `stake()` / `unstake()` / `reward` | STAKING | 质押合约 |
| 含 `deposit()` / `withdraw()` / `strategy` | VAULT | 金库/机枪池 |
| `import` Proxy / UUPS / Transparent | PROXY | 可升级代理 |
| `import` GnosisSafe / MultiSig | MULTISIG | 多签钱包 |
| 含 `createToken` / `launch` | LAUNCHPAD | 发射台 |
| 仅 `receive()` + 分红逻辑 | DIVIDEND | 分红合约 |
| 以上都不匹配 | UNKNOWN | 自定义逻辑 |

---

## Permission Role Mapping

| 角色名 | 常见关键词 | 风险权重 |
|--------|-----------|---------|
| owner | `owner`, `_owner`, `onlyOwner` | x1.0 |
| admin | `admin`, `DEFAULT_ADMIN_ROLE` | x1.0 |
| guardian | `guardian`, `_guardian`, `onlyGuardian` | x0.8 |
| operator | `operator`, `onlyOperator` | x0.9 |
| minter | `minter`, `MINTER_ROLE` | x1.2 |
| pauser | `pauser`, `PAUSER_ROLE` | x1.1 |
| feeManager | `feeManager`, `setFee`, `setTax` | x1.3 |
| upgrader | `upgrader`, `UPGRADER_ROLE` | x1.5 |
| blacklister | `blacklister`, `BLACKLISTER_ROLE` | x1.4 |

---

## Privileged Function Severity

| 函数类别 | 示例 | 风险等级 |
|---------|------|---------|
| 资金提取 | `withdraw()`, `rescueETH()`, `rescueToken()` | CRITICAL |
| 无限增发 | `mint()` 无上限/无onlyOwner | CRITICAL |
| 代理升级 | `upgradeTo()`, `setImplementation()` | CRITICAL |
| 用户冻结 | `blacklist()`, `pause()`, `disableTransfer()` | HIGH |
| 费率修改 | `setFee()`, `setTax()`, `setMaxTxAmount()` | HIGH |
| 权限转移 | `transferOwnership()`, `grantRole()` | MEDIUM |
| 参数调整 | `setMinAmount()`, `setCooldown()` | MEDIUM |
| 元数据修改 | `setName()`, `setSymbol()` | LOW |

---

## Output Schema

```json
{
  "contractProfile": {
    "name": "CHIP",
    "type": "DIVIDEND",
    "subType": "BurnToEarn",
    "compiler": "0.8.35",
    "isProxy": false,
    "isVerified": true,
    "roles": [
      { "name": "owner", "address": "0x4A80...cDf", "type": "EOA", "riskWeight": 1.0 }
    ],
    "privilegedFunctions": [
      { "name": "rescueETH", "role": "owner", "severity": "CRITICAL", "description": "可提取合约内全部ETH" },
      { "name": "setMinBuyAmount", "role": "owner", "severity": "MEDIUM", "description": "修改最小购买金额" }
    ],
    "inheritanceChain": ["CHIP"],
    "usesStandardLibs": ["OpenZeppelin:ReentrancyGuard"],
    "permissionSummary": "单owner EOA控制，无多签/时间锁",
    "riskIndicators": ["owner_can_drain_eth", "single_eoa_control", "no_timelock"]
  }
}
```
