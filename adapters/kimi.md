# Kimi (月之暗面) Adapter

## 加载方式
- **Kimi Chat**：将 `prompts/universal-system-prompt.md` 粘贴到对话开头，加上 "请按以下协议处理后续请求："
- **Kimi API**：将 `prompts/router-prompt.md` 作为 system 角色消息注入

## 支持的能力
- ✅ 文本理解与路由
- ✅ 长上下文处理
- ⚠️  curl 命令手动执行
- ⚠️  脚本手动执行

## 限制
- ❌ 不能访问本地文件系统
- ❌ 不能自动执行代码
- ⚠️  中文优化更好，英文 Skill 描述建议附中文翻译

## 快速开始
1. 将 `prompts/universal-system-prompt.md` 发送给 Kimi
2. 附上 `skillpp.manifest.json` 内容
3. 说 "请按 Skill++ 协议处理后续的链上分析请求"
4. 发链接/地址

## 建议
- 将 Skill 描述预先翻译为中文，Kimi 的中文理解优于英文
- 使用 Kimi 的长上下文能力一次性加载所有核心 Skill 的 SKILL.md
