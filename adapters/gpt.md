# GPT / ChatGPT Adapter

## 加载方式
- **ChatGPT**: 将 `prompts/universal-system-prompt.md` 粘贴到 Custom GPT 的 Instructions 中
- **GPT API**: 将 `prompts/router-prompt.md` 作为 system message 注入

## 支持的能力
- ✅ 文本理解与路由
- ✅ curl API 调用 (通过 code interpreter 或用户手动执行)
- ⚠️  Node.js 脚本需要用户在本地终端执行
- ⚠️  Checkpoint 需要用户手动确认

## 限制
- ❌ 不直接访问本地文件系统
- ❌ 不能自动执行 node 脚本
- ❌ 不能运行 watchtower

## 快速开始
1. 将 `prompts/universal-system-prompt.md` 设为 Custom GPT Instructions
2. 将 `skillpp.manifest.json` 上传为 Knowledge 文件
3. 将 `schemas/` 中的 schema 文件上传供参考
4. 发链接/地址开始使用；涉及脚本执行时提示用户在本地终端运行

## 文件上传清单
- `prompts/universal-system-prompt.md` → Instructions
- `skillpp.manifest.json` → Knowledge
- `schemas/handoff.schema.json` → Knowledge
- `schemas/checkpoint.schema.json` → Knowledge
