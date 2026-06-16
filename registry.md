# Skill++ 技能注册表 (Skill Registry)

> **给 AI 的阅读指引**：读完此表即可知道"有哪些 skill 可用，每个能干什么"。
> 每个 skill 以 **5 行名片** 描述：名称 / 一句话 / 触发词 / 输入 / 输出。

---

## 🔥 PRIMARY SKILLS — 链上 / Web3 / 扫链 / 项目分析

### 1. query-token-info（代币信息查询）
- **做什么**：搜索代币、查元数据、实时行情、K线数据
- **触发词**：`$XXX价格` `搜索代币XXX` `XXX的合约地址` `查K线` `这个币的市值`
- **需要输入**：`keyword`(代币名/符号/地址) | `chainId` | `contractAddress`
- **输出**：代币名称、符号、logo、价格、24h涨跌、持仓人数、流动性、K线数据
- **位置**：`skills/binance-web3/query-token-info\`

### 2. query-token-audit（代币安全审计）
- **做什么**：代币合约安全扫描，检测蜜罐、Rug Pull、恶意函数
- **触发词**：`安全吗` `审计` `扫描` `检测` `是不是骗局` `honeypot`
- **需要输入**：`chainId` | `contractAddress`
- **输出**：风险等级(0-5)、详细风险项列表、买卖税率、是否验证
- **位置**：`skills/binance-web3/query-token-audit\`

### 3. query-address-info（钱包地址查询）
- **做什么**：查任意链上地址的持仓组合（代币+价格+24h涨跌+数量）
- **触发词**：`钱包里有啥` `查地址` `持仓` `我的钱包` `balance`
- **需要输入**：`address`(钱包地址) | `chainId` | `offset`(分页)
- **输出**：持仓列表[{代币名, 符号, 图标, 价格, 24h涨跌, 持仓数量}]
- **位置**：`skills/binance-web3/query-address-info\`

### 4. trading-signal（聪明钱交易信号）
- **做什么**：追踪链上聪明钱的实时买卖信号，含触发价/当前价/最大收益/退出率
- **触发词**：`聪明钱` `信号` `鲸鱼` `大户` `跟单` `alpha` `smart money`
- **需要输入**：`chainId` | `page` | `pageSize`(最大100)
- **输出**：信号列表[{方向(买/卖), 代币, 触发价, 当前价, 最大收益%, 聪明钱数量, 退出率}]
- **位置**：`skills/binance-web3/trading-signal\`

### 5. crypto-market-rank（加密市场排行榜）
- **做什么**：五大排行榜——社交热度/趋势/聪明钱流入/Meme/PnL榜
- **触发词**：`排行榜` `趋势` `热门` `热搜` `资金流入` `top` `涨幅榜`
- **需要输入**：`chainId` | `rankType`(排行榜类型) | `period`(时间窗口)
- **输出**：排名列表[{代币, 价格, 涨跌%, 成交量, 市值, 持有人数}]
- **位置**：`skills/binance-web3/crypto-market-rank\`

### 6. meme-rush（Meme 发射台追踪）
- **做什么**：实时追踪 Pump.fun / Four.meme 发射台的代币生命周期 + AI 热门话题
- **触发词**：`新币` `刚发射` `bonding curve` `meme` `pump` `热点` `migrate`
- **需要输入**：`chainId` | `rankType`(10=新建/20=即将完成/30=已迁移)
- **输出**：代币列表（含进度、持有人、流动性、市值等）+ AI 话题（关联代币+净流入）
- **位置**：`skills/binance-web3/meme-rush\`

### 7. binance-agentic-wallet（Web3 钱包）
- **做什么**：Web3 钱包全功能——登录/查余额/转账/兑换/限价单/预测市场交易
- **触发词**：`钱包` `转账` `兑换` `swap` `买入` `卖出` `下单` `提现`
- **需要输入**：取决于操作（send需地址+金额，swap需代币+数量等）
- **输出**：交易哈希、余额、订单状态、预测市场持仓
- **位置**：`skills/binance-web3/binance-agentic-wallet\`

### 8. binance-tokenized-securities-info（代币化证券）
- **做什么**：查询 Ondo 代币化美股数据——公司信息、实时行情、K线、公司行为
- **触发词**：`美股` `股票` `代币化` `ondo` `tokenized stock` `P/E`
- **需要输入**：`ticker`(股票代码) | `chainId` | `contractAddress`
- **输出**：公司元数据、链上价格、持仓人数、美股基本面(PE/股息/52周范围)
- **位置**：`skills/binance-web3/binance-tokenized-securities-info\`

---

## 📈 SECONDARY SKILLS — 交易所 / 支付

### 9. binance（交易所核心）
- **做什么**：Binance 现货、合约(USDS-M/COIN-M)、期权、理财全功能交易
- **触发词**：`币安` `现货` `合约` `期货` `下单` `理财` `convert`
- **需要输入**：取决于操作（需先完成 auth 认证）
- **输出**：行情、订单、账户、K线等（通过 `binance-cli`）
- **位置**：`skills/binance/binance\`

### 10. fiat（法币通道）
- **做什么**：查询法币出入金能力——支持的国家/货币/支付方式/限额/汇率
- **触发词**：`法币` `买币` `卖币` `入金` `出金` `fiat` `银行卡`
- **需要输入**：`country` | `fiatCurrency` | `cryptoCurrency` | `businessType`
- **输出**：支付方式列表、限额、汇率报价
- **位置**：`skills/binance/fiat\`

### 11. p2p（C2C 交易）
- **做什么**：Binance P2P/C2C 市场——查广告/比价/订单管理/申诉
- **触发词**：`C2C` `P2P` `支付宝` `微信` `银行转账买币` `OTC`
- **需要输入**：`fiat` | `asset` | `tradeType`(BUY/SELL)
- **输出**：广告列表、价格对比、订单历史、申诉状态
- **位置**：`skills/binance/p2p\`

### 12. payment（支付网关）
- **做什么**：Binance Pay——扫码支付(QR)或生成收款码
- **触发词**：`Binance Pay` `扫码支付` `收付款` `QR支付`
- **需要输入**：QR码数据（图片/链接/剪贴板）
- **输出**：支付确认、订单状态
- **位置**：`skills/binance/payment\`

### 13. square-post（广场发文）
- **做什么**：发布内容到币安广场——文字/图片/文章/视频
- **触发词**：`发广场` `发布动态` `发文章` `share to square`
- **需要输入**：文本内容 + 可选图片/视频附件 | API Key
- **输出**：发布确认、文章链接
- **位置**：`skills/binance/square-post\`

### 14. onchain-pay（链上支付）
- **做什么**：法币买币直发链上地址——无需手动提现
- **触发词**：`法币买币到钱包` `onchain pay` `direct to wallet`
- **需要输入**：`fiatAmount` | `cryptoCurrency` | `network` | 目标钱包地址
- **输出**：报价、支付重定向URL、订单状态
- **位置**：`skills/binance/onchain-pay\`

---

## 🎭 THIRD-PARTY SKILLS — Four.meme 生态

### 15. four-meme-integration（Four.meme CLI 操作）
- **做什么**：Four.meme 平台代币创建/买卖/查询/发送/EIP-8004注册（BSC）
- **触发词**：`创建代币` `发币` `four.meme` `meme币` `发行`
- **需要输入**：取决于操作（代币创建需图片+名称+符号+描述+标签；交易需私钥）
- **输出**：交易哈希、代币信息、报价、事件数据
- **⚠️ 安全**：写操作需展示安全协议+等待用户确认
- **位置**：`skills/four-meme/four-meme-integration/`

### 16. four-meme-ai（Four.meme 文档索引）
- **做什么**：Four.meme 平台开发文档快速索引（不执行交易）
- **触发词**：`four.meme文档` `four.meme API` `four.meme合约地址`
- **需要输入**：查询关键词
- **输出**：文档链接、合约地址、API 参考
- **位置**：`skills/four-meme/four-meme-ai/`

### 17. four-guard（Four.meme 参考资料）
- **做什么**：Four.meme 源码、合约 ABI、API 文档快照
- **触发词**：`four.meme源码` `合约ABI` `TokenManager`
- **需要输入**：查询关键词
- **输出**：Go 源码、合约 ABI 文件、API 文档内容
- **位置**：`skills/four-meme/four-guard/`

---

## 🔬 ORIGINAL SKILLS — 原创深度审计

### 18. audit-plus（通用智能合约深度审计）

- **做什么**：对任意 EVM/Solidity 智能合约进行全方位深度审计——5 维度分析（权限拓扑/用途推断/资金安全/代码质量/升级风险）+ 16 种恶意模式匹配 + 精确加权计分
- **触发词**：`审计合约` `深度分析` `合约代码` `权限检查` `有无后门` `代码审计` `这个合约能信吗`
- **需要输入**：合约源代码（文件/粘贴/已验证合约自动拉取）+ 从其他 skill 获取的上下文（代币信息、链上数据等）
- **输出**：权限拓扑图 / 用途推断 / 五维风险评分 / 恶意模式匹配结果 / 结构化审计报告 / 项目摘要 / 下一步建议
- **位置**：`skills/audit-plus/`

> **与 query-token-audit 的关系**：前者是快速扫描（秒级 API），后者是深度分析（分钟级 AI）。互补，P_DEEP_AUDIT 中串联使用。

---

## 🧩 SKILL++ LIBRARY — 调度增强模块

### 19. contract-profiler（合约画像）
- **做什么**：在深度审计前快速提取合约类型、权限入口、资金入口、外部依赖、可升级性和高危函数画像
- **触发词**：`合约画像` `先看结构` `profile contract` `这个合约是什么类型`
- **需要输入**：Solidity/Vyper 源码 | 已验证合约地址 + 源码上下文
- **输出**：合约画像、权限/资金/升级入口清单、audit-plus 重点检查提示
- **位置**：`skills/skillpp/contract-profiler/`

### 20. risk-fusion（多源风险融合）
- **做什么**：融合 query-token-audit、audit-plus、行情、聪明钱、持仓和社交信号，给出统一风险判断
- **触发词**：`综合风险` `交叉验证` `风险融合` `这几个结果冲突`
- **需要输入**：多个 skill 的审计/行情/链上结果 | handoff JSON
- **输出**：统一风险等级、冲突点、证据表、置信度、下一步建议
- **位置**：`skills/skillpp/risk-fusion/`

### 21. wallet-doctor（钱包健康度诊断）
- **做什么**：分析钱包持仓结构、集中度、风险暴露、授权风险和可执行优化建议
- **触发词**：`钱包体检` `持仓健康度` `我的钱包安全吗` `portfolio health`
- **需要输入**：钱包地址 | chainId | query-address-info 持仓结果 | 可选 token audit 结果
- **输出**：钱包健康分、风险分层、持仓集中度、危险代币列表、可执行建议
- **位置**：`skills/skillpp/wallet-doctor/`

### 22. newbie-tutor（小白术语解释器）
- **做什么**：把链上术语、审计结论、风险项翻译成小白能理解的人话，并绑定当前上下文
- **触发词**：`解释一下` `看不懂` `什么是` `小白模式` `用人话说`
- **需要输入**：术语/句子/当前报告片段 | 当前项目上下文
- **输出**：简明解释、为什么重要、怎么判断、常见误区
- **位置**：`skills/skillpp/newbie-tutor/`

### 23. watchtower（链上监控哨塔）
- **做什么**：为地址、合约、代币或事件设计监控规则，轮询公开 API 并输出风险告警
- **触发词**：`监控这个地址` `有动静提醒我` `watch` `告警`
- **需要输入**：地址/合约 | chainId | 监控条件 | 时间窗口
- **输出**：监控规则、触发条件、告警摘要、下一步路由
- **位置**：`skills/skillpp/watchtower/`

### 24. opportunity-board（机会看板）
- **做什么**：把扫链、热门榜、聪明钱、meme 发射台和风险过滤结果汇总成机会看板
- **触发词**：`机会看板` `今天看什么` `扫链结果汇总` `opportunity board`
- **需要输入**：chainId | P_CHAIN_SCAN / P_SMART_MONEY / risk-fusion 结果
- **输出**：候选列表、风险标签、证据摘要、观察/放弃/继续审计建议
- **位置**：`skills/skillpp/opportunity-board/`

### 25. scam-pattern-lab（骗局模式库）
- **做什么**：沉淀常见链上骗局、恶意合约模式、社工话术和审计证据，用于报告解释和模式匹配
- **触发词**：`骗局模式` `像不像骗局` `scam pattern` `常见陷阱`
- **需要输入**：合约代码/审计结果/项目描述/风险项
- **输出**：匹配到的骗局模式、证据、相似风险、解释话术
- **位置**：`skills/skillpp/scam-pattern-lab/`

---

## 添加新 Skill

在对应分类下按 5 行名片格式追加，并同步 `skillpp.manifest.json`。需要组合调度时再更新 `pipelines.md`。
