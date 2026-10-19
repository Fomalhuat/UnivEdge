# Don't Build Multi-Agents（Cognition / Walden Yan）

- **元数据**：Cognition AI 官方博客 ｜ 2025-06-12 ｜ 生产级 agent 架构（Devin 团队）｜ 一手（官方）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b1-cognition.{txt,html}`（txt sha256 前 16 位 `48ffa3df327721f4`）
  ｜ URL: https://cognition.ai/blog/dont-build-multi-agents

## ① 任务分解与角色架构（核心主张）

- **两条原则**：
  - **P1 共享上下文**：共享**完整 agent trace**，不是单条消息（"Share context, and share full agent traces,
    not just individual messages"）；
  - **P2 行动携带隐含决定**："Actions carry implicit decisions, and conflicting decisions carry bad results"
    —— 各自基于未言明的假设行事 → 整合时冲突（Flappy Bird 例：背景风格与鸟的风格不一致）；
- **推论**：**默认排除**不满足 P1/P2 的架构（并行写子代理）；最简合规架构 = **单线程线性 agent**；
- 超长任务的正解 = **专用上下文压缩模型**（把行动史压成关键细节/事件/决定；Cognition 内部已微调小模型），
  而非并行多代理；
- **只读子代理是例外**：Claude Code（2025-06）的子代理**从不与主 agent 并行做事**、通常只回答问题；
  "The designers of Claude Code took a purposefully simple approach."

## ② 验证/审查机制

非主体。隐含：可靠性来自"决定不冲突"，而非事后审查；edit-apply 模型（大模型出说明 + 小模型执行编辑）
因歧义误改而被淘汰 → 单一模型一次行动完成"决定+执行"更可靠。

## ③ 上下文/记忆策略

- 上下文连续性是可靠性的**前提**（冲突源于上下文不共享）；
- 超长上下文：专门压缩器（保关键决定/事件）> 多代理分派；
- 自述待解："跨代理上下文传递（cross-agent context-passing）"是开放难题，预期未来随单线程 agent 的
  沟通能力提升而自然解决。

## ④ 人工介入点

无（架构辩论文）。

## ⑤ 成本/规模实测

无量化数据（Devin 生产经验定性论断）。

## ⑥ 失败模式与自述局限

- 并行子代理：子任务误解 + 风格/接口冲突 + 末位整合者承担所有沟通错误（"combining these two
  miscommunications"）；
- 多代理"讨论共识"模式：2025 年的 agent 做不到人类式高效长上下文协商（"running multiple agents in
  collaboration only results in fragile systems"）；
- 自述局限：作者明确说理论不完美、领域在演进，"some flexibility and humility is required"。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① **审查者是只读子代理**：UnivEdge 的怀疑派评估者/审查 sub-agent 不写产物（只在报告里给结论），恰好落在 Cognition 认可的"只读子代理"例外区；② 单线程主 agent 执行 ↔ UnivEdge 主 agent 串行执行子任务（无并行写入）——架构上**偶然对齐**，本文为它提供了外部论据 |
| **已有但更弱** | 审查输入包的"隐含决定"覆盖：P2 的教训是"不共享的决定会冲突"。UnivEdge §5.1 输入包含产物+锚点+清单+假设，但**未显式要求列出"执行过程中的隐含决定"**（与 docs/09 O7 轨迹维度同向）→ 候选 P6 |
| **缺失（未来防护）** | 若未来引入**并行写入类子任务**（如并行跑多条产线），须先满足 P1（共享完整 trace）或明示各线的隐含假设——记为设计约束，暂不落地 |
| **冲突/张力** | **与 Anthropic multi-agent 文直接张力**：Anthropic=有界并行子代理（信息收集）+ 90.2% 提升；Cognition="don't build multi-agents"。**判定：域差异而非真冲突**——(a) Anthropic 的子代理是"智能过滤器"（读→摘要，无写入冲突），(b) Cognition 的失败例是"并行写作者"（决定冲突）；(c) Anthropic 自己也说"大多数编码任务可并行度低"。**两文共同约束**：并行仅限只读/信息收集，写入整合保持单线程 |

## ⑧ 可移植性判定

**内核**（"审查者只读"可从惯例升为显式条款 + 输入包补"隐含决定"字段）+ **未来约束**（并行写入需先满足
共享 trace；暂不实施）。压缩器微调部分**不适用**（我们无常驻微调能力）。

## ⑨ 直引

1. "Share context, and share full agent traces, not just individual messages."
2. "Actions carry implicit decisions, and conflicting decisions carry bad results."
3. "I would argue that Principles 1 & 2 are so critical, and so rarely worth violating, that you should by
   default rule out any agent architectures that don't abide by them."
4. "And if they were to run multiple parallel subagents, they might give conflicting responses, resulting in
   the reliability issues we saw with our earlier examples of agents."（论 Claude Code 子代理）
5. "it is evident that in 2025, running multiple agents in collaboration only results in fragile systems."

## ⑩ 探针草案（候选 P6）

- 机制：审查输入包显式含"轨迹/隐含决定"段；探针：审查一份"决定未言明"的产物（构造式：拿一份真实
  产物的中间版本，检查审查者报告是否指出未声明的隐含约定）；破坏式：从输入包移除该段 → 该类问题检不出。
