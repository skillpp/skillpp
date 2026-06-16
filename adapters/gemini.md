# Gemini Adapter

## 加载方式
- **Gemini (Google AI Studio)**：将 `prompts/universal-system-prompt.md` 粘贴到 System Instructions
- **Gemini API**：将 `prompts/router-prompt.md` 作为 system_instruction 注入

## 支持的能力
- ✅ 文本理解与路由 (Gemini 2.5 Pro 支持)
- ✅ 结构化 JSON 输出
- ⚠️  curl 命令需要用户手动执行
- ⚠️  Node.js 脚本需要在用户本地终端执行

## 限制
- ❌ 不能直接访问本地文件系统
- ❌ 不能自动执行代码
- ⚠️  超长上下文 (>1M) 需要 Gemini 2.5 Pro

## 快速开始
1. 将 `prompts/universal-system-prompt.md` 设为 System Instruction
2. 上传 `skillpp.manifest.json` 作为参考文件
3. 告诉 Gemini "你加载了 Skill++ 协议"
4. 发链接/地址开始分析

## 文件上传清单
- `prompts/universal-system-prompt.md` → System Instruction
- `skillpp.manifest.json` → Uploaded File
