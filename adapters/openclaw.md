# OpenClaw / Codex Adapter

## 加载方式
- **OpenClaw**: 将 `SKILL.md` 注册为 Skill，设置 `requires.env: ["PRIVATE_KEY"]` 等环境变量
- **Codex**: 将 `skills/` 目录下的 SKILL.md 文件逐一注册为 Codex Skills

## 支持的能力
- ✅ 完整的本地文件系统访问
- ✅ Node.js 脚本自动执行
- ✅ 环境变量注入 (私钥通过 skill env 安全传递)
- ✅ curl API 调用
- ✅ Skill 链式调用
- ✅ Checkpoint 强制阻断
- ✅ Windows .cmd shim 兼容

## 限制
- ⚠️  watchtower 轮询需要用户保持会话活跃
- ⚠️  four-meme-integration 需要 `PRIVATE_KEY` 环境变量

## 快速开始
1. 克隆仓库到本地
2. 在 OpenClaw 中注册 `SKILL.md` 为 Skill
3. 配置需要的环境变量 (PRIVATE_KEY, BSC_RPC_URL 等)
4. 直接使用

## 环境变量
- `PRIVATE_KEY`: Four.meme 操作和钱包交易需要
- `BSC_RPC_URL`: BSC RPC 节点 (可选)
- `BINANCE_SQUARE_OPENAPI_KEY`: 广场发文需要
