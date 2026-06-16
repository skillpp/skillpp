# Claude / Claude Code Adapter

## 加载方式
- **Claude Code**: 将 `SKILL.md` 放入 `.claude/skills/skillpp/` 目录，或通过 `/skill` 命令加载
- **Claude API**: 将 `SKILL.md` 内容作为 system prompt 的一部分注入

## 支持的能力
- ✅ 本地文件读取
- ✅ Node.js 脚本执行
- ✅ curl API 调用
- ✅ Skill 链式调用
- ✅ Checkpoint 阻断 (Claude 会等待用户回复)

## 限制
- ❌ 不支持后台持续运行 (watchtower 只能在会话内轮询)
- ⚠️  部分 CLI 需要用户预先安装 (baw, binance-cli, fourmeme)

## 快速开始
1. 克隆仓库到本地
2. 在 Claude Code 中加载 `SKILL.md`
3. 直接发链接/地址/代码开始使用
