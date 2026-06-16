---
name: scam-pattern-lab
description: |
  恶意模式库。维护已知链上骗局模式目录，供 audit-plus 和 risk-fusion 调用。
  每个模式包含代码特征、判定条件、风险等级和真实案例参考。
metadata:
  version: "1.0.0"
  type: reference
  group: skillpp
  dependsOn:
    - audit-plus
    - risk-fusion
---

# Scam Pattern Lab — 恶意模式库

> **用途**：audit-plus 和 risk-fusion 的规则库。每个模式是可验证的代码特征，不是主观判断。

---

## CRITICAL — 确定恶意 (8 种)

### HONEYPOT-01: 蜜罐（只能买不能卖）
- **特征**: `_transfer()` 中检测 `to == pair` 时 revert / 黑名单自动加入 / maxTxAmount=0
- **检测**: 阅读 sell 路径。检查 transfer 函数中是否有条件性 revert
- **判定**: 买入成功 + 卖出必定失败 = 蜜罐
- **参考**: BSC 上 2023-2024 年大量蜜罐代币使用此模式

### RUG-01: 无限 Mint 后门
- **特征**: `mint()` 函数存在且无 onlyOwner 或无上限检查
- **检测**: 搜索 `function mint`，检查修饰符和 amount 上限
- **判定**: owner 可无限增发 = rug 能力

### RUG-02: 单键 Rug
- **特征**: 单一函数内完成 `removeLiquidity()` + `transfer()` 
- **检测**: 搜索同时调用 removeLiquidity 和 transfer 的函数
- **判定**: 一次调用掏空池子

### RUG-03: 假 Renounce
- **特征**: `renounceOwnership()` 被 override 为空函数体或设置标志位可逆
- **检测**: 检查 renounceOwnership 的实际代码逻辑
- **判定**: 宣称放弃但实际未放弃

### RUG-04: 延迟 Rug（短时间锁）
- **特征**: 时间锁 < 24h + owner 可提 LP
- **检测**: 检查 timelock 延迟值
- **判定**: 延迟 < 24h + 提 LP 权限 = 短线 rug

### BACKDOOR-01: 隐藏提款（函数名伪装）
- **特征**: 函数名看似正常（`updateConfig`/`doSwap`）但实际执行提款
- **检测**: 比较函数名与实际逻辑。`updateConfig` 里如果有 `.transfer()` → 可疑
- **判定**: 函数名与行为不符 = 后门

### BACKDOOR-02: 代理自毁后门
- **特征**: UUPS 代理可升级到含 `selfdestruct` 的实现
- **检测**: 检查升级权限 + 新实现代码
- **判定**: 可升级 + 新实现可自毁 = 后门

### PHISH-01: 假代币（冒充知名代币）
- **特征**: `symbol()` / `name()` 返回 USDT/USDC/BNB 等知名代币名，但有异常逻辑
- **检测**: 比较 symbol/name 与官方代币。检查是否有额外 mint/黑名单
- **判定**: 冒充知名代币 + 异常逻辑 = 钓鱼

---

## HIGH — 严重风险 (7 种)

### CENT-01: 单点控制所有资金
- **特征**: owner 可调 `withdraw()` 无金额限制
- **风险**: 一个地址能掏空合约

### CENT-02: 无限黑名单
- **特征**: `setBlacklist(address, true)` 无解锁机制
- **风险**: 任何人可被永久冻结

### CENT-03: 税率无上限
- **特征**: `setFee(uint256)` 无 max 限制
- **风险**: 税率可设到 100%

### CENT-04: 无时间锁升级
- **特征**: proxy admin 可即时升级
- **风险**: 用户前一秒正常后一秒被抢

### TAX-01/02: 买入/卖出税可改
- **特征**: `_buyTax` / `_sellTax` 可被 owner 修改
- **风险**: 买前 1% 买后 99%

### SLIPPAGE-01: 最大交易量可改为极小值
- **特征**: `_maxTxAmount` 可被 owner 修改无下限
- **风险**: 实际冻结所有卖出

---

## MEDIUM — 需关注 (7 种)

| 模式 ID | 名称 | 特征 |
|---------|------|------|
| AUTH-01 | owner 为 EOA | owner() 返回非合约地址 |
| AUTH-02 | 特权无事件 | onlyOwner 函数无 emit |
| ECON-01 | 未锁 LP | 无 LP lock 或 lock < 30 天 |
| ECON-02 | 团队仓位过大 | 单地址 > 20% 总量 |
| CODE-01 | 手写转账逻辑 | 自定义 _transfer() 而非标准库 |
| CODE-02 | 浮点/精度问题 | 非标准精度计算 |
| CODE-03 | 编译器未锁定 | pragma solidity ^0.x |

---

## LOW — 建议改进 (4 种)

| 模式 ID | 名称 |
|---------|------|
| BEST-01 | 缺少 NatSpec |
| BEST-02 | 状态变更无事件 |
| BEST-03 | 单文件合约 |
| BEST-04 | 魔法数字 |
