# BinanceAI / Binance Web3 Wallet AI Adapter

## 加载方式
- 通过 Binance Web3 Wallet 内置的 AI 助手直接加载
- 支持 Skill 协议原生加载

## 支持的能力
- ✅ 完整的本地文件系统访问（如果通过 Binance Web3 客户端）
- ✅ Node.js 脚本执行
- ✅ curl API 调用
- ✅ Binance Web3 API 原生集成（query-token-info/audit/address/market-rank 等直接调用）
- ✅ BSC 链原生支持

## 限制
- ⚠️  仅支持 BSC 和已接入 Binance Web3 的链
- ⚠️  Four.meme 操作需要额外配置
- ⚠️  watchtower 轮询需要会话保持活跃

## 快速开始
1. 在 Binance Web3 Wallet AI 中加载 skill++ 
2. 直接使用，无需额外配置（Binance Web3 API 已内置）
3. 如需 Four.meme 操作，配置 PRIVATE_KEY
