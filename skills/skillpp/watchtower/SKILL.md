---
name: watchtower
description: |
  链上监控模块。监控 owner 活动、LP 变化、税率修改、mint/黑名单/代理升级事件。
  通过 watch mode 轮询实现，不是后台服务。用户显式启动，可设定监控条件。
metadata:
  version: "1.0.0"
  type: monitoring
  group: skillpp
---

# Watchtower — 链上监控

> **重要声明**：Watchtower 不是后台服务。用户必须显式启动 watch mode，当前会话内有效。不承诺"被动收到告警"。

---

## 监控能力

### 监控维度

| 监控项 | 数据来源 | 检查频率建议 | 告警条件 |
|--------|---------|-------------|---------|
| Owner 地址活动 | BSCScan/etherscan API | 每 3 分钟 | owner 发起任何交易 |
| LP 变化 | DEX 合约事件 | 每 5 分钟 | LP 减少 > 20% |
| 税率修改 | 合约事件 / API | 每 5 分钟 | 税率值变化 |
| Mint 事件 | 合约 Transfer 事件 | 每 3 分钟 | 出现新 mint 交易 |
| 黑名单操作 | 合约事件 | 每 5 分钟 | 任意地址被加入/移出黑名单 |
| 代理升级 | Proxy Admin 事件 | 每 10 分钟 | 实现合约地址变化 |

### 使用方式

```
步骤 1: 添加监控目标
  watchtower watch <contract-address> --chain <chain-id> [--alert-on <conditions>]

步骤 2: 启动监控
  watchtower start (在当前会话中开始轮询)

步骤 3: 查看状态
  watchtower status (显示当前监控目标 + 最后检查时间)

步骤 4: 停止
  watchtower stop
```

### 告警输出格式

```json
{
  "alert": {
    "type": "OWNER_ACTIVITY",
    "severity": "HIGH",
    "timestamp": 1718400000,
    "contract": "0x1234...5678",
    "chain": "BSC",
    "detail": "Owner address transferred 100 BNB to unknown wallet",
    "txHash": "0xabcd...",
    "recommendation": "Owner 正在转移资产，可能准备退出。密切监控。"
  }
}
```

---

## 限制与边界

1. **不是推送服务** — watch mode 仅在当前 Claude Code 会话中有效，关闭即停止
2. **频率限制** — 受区块浏览器 API 频率限制，实际检查间隔可能比设定值长
3. **不是实时** — 依赖轮询而非事件订阅，有延迟
4. **只告警不执行** — Watchtower 只报告，不会自动执行任何交易
5. **未来方向** — scheduled mode 可通过 cron / GitHub Actions 实现
