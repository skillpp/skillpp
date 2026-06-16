---
name: opportunity-board
description: |
  机会看板。聚合 meme-rush、market-rank、smart-money-inflow、topic-rush 四个来源，
  交叉对比找出同时出现在多个来源的标的。不输出"推荐买入"，只输出"值得继续研究"。
metadata:
  version: "1.0.0"
  type: analysis
  group: skillpp
  dependsOn:
    - meme-rush
    - crypto-market-rank
    - trading-signal
---

# Opportunity Board — 机会看板

> **给 AI 的指引**：聚合多个市场数据源，交叉对比找出共识标的。只标注"值得继续研究"，不说"推荐买入"。

---

## 数据源

| 来源 | Skill | 含义 | 权重 |
|------|-------|------|------|
| 新发射 | meme-rush | 刚创建的代币 | 1 |
| 热门榜 | market-rank (Trending) | 市场关注度最高 | 2 |
| 聪明钱 | smart-money-inflow | 大户净买入 | 3 |
| AI 话题 | topic-rush | AI 检测到的话题 | 1 |

---

## 交叉对比规则

```
对每个代币：
  appeared_in = []

  IF 在 meme-rush 列表中 → appeared_in.push("new_launch")
  IF 在 market-rank 榜单中 → appeared_in.push("trending")
  IF 在 smart-money 流入中 → appeared_in.push("smart_money")
  IF 在 AI 话题中关联 → appeared_in.push("ai_topic")

  consensus_score = length(appeared_in)

  IF consensus_score >= 3 → 🟢 HIGH consensus (多个来源共识)
  IF consensus_score == 2 → 🟡 MEDIUM consensus (两个来源共识)
  IF consensus_score == 1 → ⚪ LOW consensus (单一来源)
```

---

## 输出格式

```
┌─────────────────────────────────────────┐
│         📊 Opportunity Board             │
│                                          │
│ 🟢 HIGH consensus (3+ sources):          │
│                                          │
│ PEPE (0x...)                             │
│   ✅ 新发射 (meme-rush)                   │
│   ✅ 热门 #3 (market-rank)               │
│   ✅ 聪明钱流入 $120K (smart-money)       │
│   ─→ 值得继续研究                         │
│                                          │
│ 🟡 MEDIUM consensus (2 sources):         │
│                                          │
│ DOGE (0x...)                             │
│   ✅ 热门 #12 (market-rank)              │
│   ✅ AI 话题 "meme coin" (topic-rush)     │
│   ─→ 值得继续研究                         │
│                                          │
│ ⚠️ 以上为数据聚合结果，仅标注值得研究的标的。  │
│ 不构成投资建议。请自行审计后决策。          │
└─────────────────────────────────────────┘
```

---

## 禁止事项

- ❌ 不说"推荐买入""可以买""大概率涨"
- ❌ 不按 consensus_score 排序暗示优先级
- ❌ 不添加主观评价（"这个项目很好""团队靠谱"）
- ✅ 只说"值得继续研究""建议进一步审计"
- ✅ 所有结论绑定数据来源
