# UnivEdge 设计审查 · 通用 Agent 调研与架构合规性检查（04）

> 日期：2026-08-11 ｜ 状态：草稿
> 本轮任务：参考开源通用 agent（opencode / Reasonix / Pi）的构造，审查 UnivEdge 项目结构是否合理；并对照 OpenAI harness-engineering 文章与 Anthropic 两篇工程文章做合规性检查。

---

## 0. 结论速览

- UnivEdge 的五层架构与可移植仓库结构**整体合理**，与主流开源 agent 的共识设计一致；
- 调研提炼出 12 条可复用设计模式，其中 6 条需要**新增/修订**进 UnivEdge（任务契约、怀疑派评估器、风暴抑制、权限门、检查点/分支、steering）；
- 与 OpenAI harness-engineering 关键思想**逐条合规**（8 项直接满足，2 项需补机制）；
- 与 Anthropic harness 思想对照：生成器-评估器分离、上下文重置、可打分标准等均已内置或需微调。

---

## 1. 调研对象

| 项目 | 语言 | 要点 |
|---|---|---|
| **opencode**（opencode-ai/opencode，已归档→Crush） | Go | 分层 TUI 编码 agent；session(SQLite)；自定义命令=markdown 技能；MCP；95% 自动压缩；OpenCode.md 项目记忆 |
| **Reasonix**（esengine/DeepSeek-Reasonix） | Go 1.x（0.x 为 TS） | 围绕 DeepSeek 前缀缓存设计的编码 harness；注册表架构（Provider/Tool/Skill）；风暴抑制；检查点回退；config-over-code |
| **Pi**（earendil-works/pi） | TypeScript monorepo | 三层架构"分离不稳定外部世界与稳定核心循环"；Steering/Follow-up 双队列；双层工具注册；JSONL 树形会话+分支；RPC 子代理；扩展系统 |

---

## 2. 三家构造对比

| 维度 | opencode | Reasonix | Pi | 对我们的启示 |
|---|---|---|---|---|
| 核心分层 | cmd + internal(app/llm/session/lsp/db/tui/config) | boot + 三注册表 + transport-agnostic controller | pi-ai / pi-agent-core / pi-coding-agent / pi-tui | **分层 + 稳定核心/不稳定外部分离**（Pi） |
| 技能机制 | 自定义命令（markdown，用户/项目级） | Skill Registry（SKILL.md，project/custom/global） | 扩展系统（hooks + registerTool） | 技能 = markdown 知识包，**多作用域** |
| 工具系统 | 内置文件/代码工具 + bash/fetch + MCP | 内置(fs/shell) + MCP 插件（子进程 JSON-RPC） | ToolDefinition(schema) / AgentTool(实现) 双层 | **工具双层定义**（Pi） |
| 上下文管理 | 95% 自动压缩（摘要换新会话） | 80% 压缩 + **append-only 前缀缓存** | Steering/Follow-up 双队列 + compaction | 长会话必须管上下文；**steering 中途打断** |
| 记忆/会话 | SQLite + OpenCode.md | 检查点回退、/memory、会话分支 | JSONL 树形会话 + 分支回退 | **检查点/分支 = 科研实验回退** |
| 可靠性 | — | **风暴抑制**（重复失败→强制反思）、工具调用 4 轮修复、模型自动升级 | turn 状态机、事件驱动 | **防死循环 + 工具修复 + 模型路由** |
| 安全 | 每次工具执行用户确认(a/A/d) | permission policy + 沙箱(Seatbelt/bwrap) + gateApprover | 无内置权限（外部容器化） | 科研 agent 必须有**权限门**（尤其 HPC） |
| 子代理 | agent 工具（prompt 参数） | subagent profiles（可建 reviewer） | RPC 独立进程（强隔离） | 评审子代理独立化 |
| 配置 | .opencode.json 级联（HOME→XDG→项目） | reasonix.toml（config over code） | 扩展系统 | 环境差异外置 config/ |

---

## 3. 可复用设计模式（P1–P12，已/将纳入 UnivEdge）

- **P1 稳定核心 / 不稳定外部分离**（Pi）：方法论核心（docs）与工具/知识（tools/knowledge）分层——UnivEdge 已符合。
- **P2 技能 = 多作用域 SKILL.md**（Reasonix/opencode）：project/custom/global 三级——`skills/` 按此组织。
- **P3 工具双层定义**（Pi）：schema 与实现分离——工具注册表条目 = 定义 + 实现。
- **P4 上下文管理**：compaction + reset-with-handoff（Anthropic）；append-only/cache（Reasonix）——UnivEdge 子任务服务循环天然短上下文，交接工件 = 产物状态 + 上下文地图。
- **P5 检查点 + 分支回退**（Reasonix/Pi）：科研 = 实验版本管理，需要能回到"十分钟前"的决策点。
- **P6 风暴抑制**（Reasonix）：重复失败检测 → 注入反思指令——加入 L3。
- **P7 权限门**（Reasonix/opencode）：副作用（写文件/HPC 提交）需 han 批准——加入 L3。
- **P8 生成器-评估器分离 + 评估器调优**（Anthropic）：独立"怀疑派"评估器，且需主动调优（读日志、找分歧、迭代 prompt）——加入 L2。
- **P9 任务契约**（Anthropic sprint contract）：执行前协商"完成定义 + 如何验证成功"——加入 L1，即"做一步检查一步"的落点。
- **P10 可打分标准**（Anthropic gradable criteria）：把主观判断变成可打分项；用词会塑造输出——锚点对照表即此。
- **P11 文件即通信/记忆**（Anthropic）：agent 间用文件交接，结构化、可追溯——UnivEdge 产物文件化。
- **P12 harness 组件 = 对模型缺陷的假设**（Anthropic）：随模型升级重新审视、删旧加新——加入项目惯例。

---

## 4. 与 OpenAI harness-engineering 的合规性检查

原文要点：人类掌舵/智能体执行；仓库即记录系统；地图而非手册（渐进式披露）；机械强制不变量；反馈回路；熵与垃圾收集；瓶颈在环境设计。

| OpenAI 思想 | UnivEdge 对应 | 状态 |
|---|---|---|
| 人类掌舵，智能体执行 | L1 子任务服务循环 + han 在环 | ✓ |
| 仓库即记录系统 | 可移植仓库结构（AGENTS.md/docs/knowledge/skills/tools/config/run） | ✓ |
| 地图而非手册（渐进式披露） | AGENTS.md ~100 行目录 + 深层文档分层 | ✓ |
| 机械强制执行不变量 | physics linter + 推导管线检查 + 锚点对照表 | ✓ |
| 反馈回路（自审 + 互审） | 评审 agent + 推导管线回退循环（≤MAX_ITER） | ✓ |
| 熵与垃圾收集（doc-gardening） | L4 知识库维护机制（待实现） | ✓（计划） |
| 瓶颈在环境设计 | 设计重心即 harness 本身 | ✓ |
| 智能体可读性（"上下文里没有的=不存在"） | knowledge/ 产物全部为版本化可读文件 | ✓ |
| 人类品味持续注入 | han 复核意见回写 docs/tools | △ 需在 Step 2 落成机制 |
| 吞吐量改变合并理念（纠错便宜、等待昂贵） | 快速重试循环 + 低成本纠错 | ✓ |

**△ 需补**：建立"复核意见回写"机制——han 每次复核发现的问题，沉淀为规则进入 linter/文档/工具，而不是只改这一次。

---

## 5. 与 Anthropic harness 思想的对照

原文（harness-design-long-running-apps）要点：上下文焦虑 → 上下文重置（vs 压缩）；任务分解；生成器-评估器分离（评估器需调优为怀疑派）；sprint 契约；文件通信；可打分标准；"harness 组件是对模型缺陷的假设，随模型升级重审"。

| Anthropic 要点 | UnivEdge 对应 | 状态 |
|---|---|---|
| 上下文焦虑 / 上下文重置 | 子任务服务循环 = 短任务 + 交接工件（天然 reset） | ✓ |
| 生成器-评估器分离 | DeepMath 式生成/评估解耦 + 推导管线"起草 vs 检查" | ✓ |
| 评估器调优为"怀疑派" | **新增**：审查 agent prompt 专门调优 + 分歧日志迭代 | △ 新增 |
| sprint 契约 | **新增**：任务契约（完成定义 + 验证标准，han 确认后执行） | △ 新增 |
| 可打分标准 | 锚点对照表（判据/复现值/参考值/误差）= 数值任务打分标准 | ✓ |
| 文件即通信/记忆 | run/ + knowledge/ 产物文件化 | ✓ |
| 随模型升级重审 harness | **新增惯例**：每次模型换代，剥离不再承重的组件 | △ 新增 |

---

## 6. UnivEdge 结构审查结论与修订（R1–R6）

结构整体合理，做 6 处修订/新增：

- **R1（L1）任务契约**：执行子任务前，agent 产出"任务契约"（目标 / 完成定义 / 验证标准 / 锚点），han 确认后才执行——这是"做一步检查一步"的工程化落点。
- **R2（L2）怀疑派评估器**：审查 agent 默认不苛刻，需主动调优——记录其判断与 han 判断的分歧，迭代其规范；评分用词会塑造产出，措辞需刻意设计。
- **R3（L3）可靠性三件套**：风暴抑制（重复失败→强制反思）、工具调用修复、权限门（写文件/HPC 提交需批准）。
- **R4（L4）执行体验三件套**：steering（han 中途打断纠正）、检查点/分支回退（实验版本管理）、上下文压缩/重置（交接工件标准化）。
- **R5（skills/）三作用域**：project / custom / global 三级技能组织，SKILL.md 为技能载体。
- **R6（惯例）harness 重审**：模型升级时重新审视各组件是否仍"承重"，删旧加新。

---

## 7. 对 Step 2（METHODOLOGY.md）的影响

METHODOLOGY.md 将新增以下规范模板：

1. **任务契约模板**：目标 / 完成定义 / 验证标准 / 锚点；
2. **锚点对照表模板**：判据 / 复现值 / 参考值 / 误差（数值任务）＋ 推导检查项清单（符号任务）；
3. **怀疑派评估器规范**：审查 agent 的角色设定、打分标准、分歧记录与迭代机制；
4. **防死循环规则**：重复失败检测阈值与强制反思；
5. **权限门规则**：副作用分类与批准流程；
6. **复核回写机制**：han 复核意见 → 规则沉淀（OpenAI △ 项）。

---

## 附录：参考链接

- opencode：https://github.com/opencode-ai/opencode （继任者 Crush：https://github.com/charmbracelet/crush）
- Reasonix：https://github.com/esengine/DeepSeek-Reasonix
- Pi：https://github.com/earendil-works/pi
- OpenAI harness-engineering：https://openai.com/zh-Hans-CN/index/harness-engineering/
- Anthropic：harness-design-long-running-apps https://www.anthropic.com/engineering/harness-design-long-running-apps ｜ 工程索引 https://www.anthropic.com/engineering
- 索引中值得后续阅读：Effective context engineering、Equipping agents with Agent Skills、Writing effective tools for agents、How we contain Claude、Managed agents
