# How we built our multi-agent research system（Anthropic Engineering）

- **元数据**：Anthropic Engineering ｜ 2025 ｜ 深度研究/信息检索 ｜ 一手（官方）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b1-multiagent.{txt,html}`（txt sha256 前 16 位 `543d8be30c4a42c1`）
  ｜ URL: https://www.anthropic.com/engineering/multi-agent-research-system

## ① 任务分解与角色架构

- **orchestrator-worker**：lead agent 规划 → 并行生成 3-5 个 subagent → 综合 → 可能再增子代理；
  末尾 **CitationAgent**（为每一条主张定位引用来源）；
- **lead 的 plan 先落盘到 Memory**（"since if the context window exceeds 200,000 tokens it will be truncated
  and it is important to retain the plan"）；
- **子任务规格四要素**：objective / output format / 工具与来源指引 / 明确边界；
- **努力预算按复杂度分级**（嵌入 prompt）：简单事实查找 = 1 agent + 3-10 tool calls；直接对比 = 2-4
  subagents × 10-15 calls；复杂研究 = >10 subagents，明确分工。

## ② 验证/审查机制

- **LLM-judge rubric**（5 criteria）：factual accuracy / citation accuracy / completeness / source quality /
  tool efficiency；
- **单 judge 单 prompt 输出 0.0-1.0 + pass/fail，"the most consistent and aligned with human judgements"**
  （试过多 judge 逐组件评分→不如单 judge 一致）；
- **人工测试补自动化盲区**：人类发现 agent 系统性偏好 SEO 内容农场而非权威来源（学术 PDF 等）→ 加了
  source quality 启发式；
- **end-state evaluation（附录）**：评估"是否达到正确终态"，而非逐步核对过程；复杂流程拆离散 checkpoint；
- **工具自改进循环**：tool-testing agent 使用有缺陷的 MCP 工具 → 重写工具描述 → 使后续 agent 任务完成时间
  **降 40%**。

## ③ 上下文/记忆策略

- subagent = **上下文压缩器**：各自独立 context window 大量探索，只回传**浓缩摘要（常 1,000-2,000 tokens）**；
- **分离关注点**：不同工具/提示/探索轨迹 → 降低路径依赖、支持独立调查（"separation of concerns"）；
- **子代理产物落盘**（"minimize the 'game of telephone'"）：结果写外部系统，只传**轻量引用**回协调者；
- 长会话：总结已完成阶段 → 存外部记忆 → 必要时**新子代理 + 干净上下文 + 小心交接**；计划从 memory 取回。

## ④ 人工介入点

产品内无（用户只发 query）；工程侧靠 observability（监控决策模式与交互结构，不监控对话内容）。

## ⑤ 成本/规模实测

| 指标 | 数值 |
|---|---|
| agent vs chat token 消耗 | ~4× |
| multi-agent vs chat | **~15×** |
| 内部研究评测提升（Opus 4 lead + Sonnet 4 sub vs 单 Opus 4） | **+90.2%** |
| BrowseComp 性能方差解释 | token 用量 **80%**；token+tool calls+模型选择 = 95% |
| 并行化收益 | 复杂查询研究时间最多 **-90%** |
| 早期失败 | 简单 query 生成 50 个子代理；无止境搜寻不存在来源；过量更新互相干扰 |

## ⑥ 失败模式与自述局限

- 多代理的**涌现行为**：lead 的小改动会不可预测地改变子代理行为；
- 同步执行瓶颈：lead 不能实时指挥子代理，单子代理慢则全局阻塞；
- 生产工程：状态性错误复合、断点恢复、rainbow deployment（老新版本并行渐进切流量）；
- 适用边界自述："most coding tasks involve fewer truly parallelizable tasks than research"——**代码类任务
  不适用多代理并行**（与 Cognition 文章呼应，见卡片 4）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① 子代理产物落盘+传引用 ↔ §1.6 产物存储、审查输入包用路径而非全文；② 分离关注点支持独立调查 ↔ RC-04 独立性、L2 上下文解耦（我们用于审查，他们用于探索）；③ 硬规则外挂启发式（source quality）↔ 根因基/教训库 |
| **已有但更弱** | **努力预算↔复杂度分级表**：UnivEdge §5.5 有"成本合理"但**无显式分级**；docs/15 待决①恰是"档位自动升级信号"→ 本文的分级规则（简单/对比/复杂 → agent 数与调用预算）可作为设计参照 → 候选 P2 |
| **缺失（可吸收）** | ① **单 judge + rubric 输出格式**（0-1 + pass/fail 最稳）→ 服务 §5.2 评分标准校准（现为我们输出 pass/fail/need_human 逐项，可对照）；② **end-state 优先**的评测口径 → 直接服务 docs/15 T1/T2 边界（T1 抽验=核对终态锚点，T2=重推过程）；③ 工具描述质量的自改进循环 → §6 |
| **冲突** | 与 Cognition"不要多代理"直接张力 → 判定：**域差异**（信息收集可并行 / 写入整合不可并行），非真冲突，记录见卡片 4 |

## ⑧ 可移植性判定

**内核**（努力分级、end-state 评测口径、judge 输出格式）+ **宿主**（并行子代理编排、rainbow deployment、
生产可观测性——属宿主运行时能力，不入内核）。

## ⑨ 直引

1. "Simple fact-finding requires just 1 agent with 3-10 tool calls, direct comparisons might need 2-4 subagents
   with 10-15 calls each, and complex research might use more than 10 subagents with clearly divided
   responsibilities."
2. "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15×
   more tokens than chats."
3. "token usage by itself explains 80% of the variance" (BrowseComp)。
4. "We experimented with multiple judges to evaluate each component, but found that a single LLM call with a
   single prompt outputting scores from 0.0-1.0 and a pass-fail grade was the most consistent and aligned with
   human judgements."
5. "We found success focusing on end-state evaluation rather than turn-by-turn analysis... For complex workflows,
   break evaluation into discrete checkpoints."
6. "Subagents call tools to store their work in external systems, then pass lightweight references back to the
   coordinator. This prevents information loss during multi-stage processing."

## ⑩ 探针草案（候选 P2）

- 机制：审查努力预算与任务复杂度对应（升级信号）；探针：定义"复杂度触发条件"（如产物即将成为锚点/全链重算）
  → 构造该场景 → 检查审查是否自动升级为 T2；破坏式：移除升级规则 → 探针失败。
