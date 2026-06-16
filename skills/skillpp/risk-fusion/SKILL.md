---
name: risk-fusion
description: |
  风险融合引擎。合并 query-token-audit + audit-plus + market + smart-money 等多个来源
  的风险信号，输出统一风险分、自信度和数据冲突标注。
  不替代任何现有 skill，而是作为它们的上层聚合器。
metadata:
  version: "1.0.0"
  type: analysis
  group: skillpp
  dependsOn:
    - query-token-audit
    - audit-plus
    - trading-signal
    - crypto-market-rank
---

# Risk Fusion — 风险融合

> **给 AI 的指引**：当有 2+ 个风险数据来源时，按以下公式融合输出统一风险分。

---

## EXECUTE FLOW

```
STEP 0: 收集所有可用风险数据源
  ├→ query-token-audit (API 快速扫描)
  ├→ audit-plus (源码深度审计, 如果有源码)
  ├→ trading-signal (聪明钱是否在抛售)
  └→ crypto-market-rank (是否在热门榜/是否有负面信号)

STEP 1: 对齐数据 (按 token/chain 匹配)
  确保所有数据源针对同一个代币

STEP 2: 计算融合风险分 (Fusion Formula)
STEP 3: 检测数据冲突
STEP 4: 输出统一风险报告 + 自信度
```

---

## Fusion Formula

```
融合风险分 = Σ(source × weight × confidence) / Σ(weight × confidence)

数据源权重:
  audit-plus        weight=0.40  (源码级, 最可靠)
  query-token-audit  weight=0.30  (API级, 较可靠)
  trading-signal     weight=0.20  (市场信号, 辅助)
  crypto-market-rank weight=0.10  (热度信号, 辅助)

自信度:
  HIGH = 2+ sources agree within ±1.0
  MEDIUM = 2+ sources agree within ±2.0
  LOW = only 1 source OR sources disagree by >2.0
  UNKNOWN = no sources available
```

---

## Conflict Detection

```
IF |source_A.score - source_B.score| > 2.0:
  → 标注 DATA_CONFLICT
  → 建议: 人工审查差异原因
  → 常见原因:
    - audit-plus 发现了 query-token-audit API 未覆盖的代码级问题
    - API 扫描未及时更新（合约已升级）
    - 一个来源的数据缺失导致评分偏差

IF source_A.riskLabel === 'LOW' AND source_B.riskLabel === 'HIGH':
  → 标注 CRITICAL_CONFLICT
  → 必须人工审查
  → 默认采用较高风险的评分（保守原则）
```

---

## Output Schema

```json
{
  "riskFusion": {
    "fusedScore": 2.8,
    "fusedLabel": "MEDIUM",
    "confidence": "HIGH",
    "sources": [
      {
        "name": "query-token-audit",
        "score": 2.0,
        "label": "MEDIUM",
        "weight": 0.30,
        "available": true
      },
      {
        "name": "audit-plus",
        "score": 3.2,
        "label": "MEDIUM",
        "weight": 0.40,
        "available": true
      },
      {
        "name": "trading-signal",
        "score": null,
        "label": "UNKNOWN",
        "weight": 0.20,
        "available": false,
        "reason": "该代币暂无聪明钱信号"
      }
    ],
    "conflicts": [],
    "warnings": [
      "query-token-audit API 返回 2.0，audit-plus 深度分析返回 3.2，差异在可接受范围(±1.2)"
    ],
    "missingData": ["trading-signal"],
    "recommendation": "建议信任 audit-plus 的深度评分(3.2)，因为其基于源码分析，可靠性更高"
  }
}
```

---

## Display Rules

```
展示格式:
  🛡️ 综合风险: 🟡 MEDIUM (2.8/5.0)
     数据来源: audit-plus (3.2) + query-token-audit (2.0)
     自信度: HIGH ✅ (2 个来源交叉验证)
     缺失: 聪明钱信号 (不影响评分)

数据冲突时:
  🛡️ 综合风险: 🟡 MEDIUM (2.8/5.0) ⚠️ 数据存在冲突
     audit-plus: 🟠 HIGH (4.0) ← 源码级
     query-token-audit: 🟢 LOW (1.0) ← API级
     ⚠️ 差异过大 (3.0), 建议人工审查
     已采用保守评分 (较高风险): 4.0

全不可用时:
  🛡️ 综合风险: ⚪ UNKNOWN
     ⚠️ 无可用数据源, 无法评估风险
     建议: 至少提供一个数据源 (合约地址/源码/代币名)
```
