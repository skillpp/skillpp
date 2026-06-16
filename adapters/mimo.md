# Mimo Adapter

## 加载方式
- 将 `prompts/universal-system-prompt.md` 粘贴到系统提示词中
- 或直接加载 `SKILL.md` 作为 Skill

## 支持的能力
- ✅ 文本理解与路由
- ✅ 结构化 JSON 输出
- ⚠️  curl 命令需要用户手动执行
- ⚠️  Node.js 脚本需要在用户本地终端执行

## 限制
- ❌ 不能直接访问本地文件系统
- ❌ 不能自动执行代码
- ⚠️  需要用户手动执行 CLI 命令并反馈结果

## 快速开始
1. 将 `prompts/universal-system-prompt.md` 设为系统提示
2. 上传 `skillpp.manifest.json` 作为参考
3. 告诉 Mimo 遵循 Skill++ 协议
4. 发链接/地址开始分析
