# Effective context engineering for AI agents（Anthropic Engineering）

- **元数据**：Anthropic Applied AI ｜ 2025 ｜ 通用 agent 上下文工程 ｜ 一手（官方）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b1-context.{txt,html}`（txt sha256 前 16 位 `d2080e598010803e`）
  ｜ URL: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

## ① 任务分解与角色架构

非主体（本文讲"喂给模型什么"）。相关：sub-agent 架构＝长任务的上下文手段之一；决策规则——
compaction（需来回对话的任务）/ note-taking（有清晰里程碑的迭代开发）/ multi-agent（可并行探索的复杂研究）。

## ② 验证/审查机制

非主体。原则移植：**"smallest set of high-signal tokens"** 也适用于审查输入包的最小化。

## ③ 上下文/记忆策略（本文核心）

- **context rot**：token 数增加 → 召回精度下降（所有模型共有）；"attention budget" 有限、边际收益递减；
- **right altitude**：system prompt 的两极失败——硬编码脆弱 if-else（一端）vs 过度泛化/假定共享语境（另一端）；
  推荐分节组织（`<background_information>` 等）；
- **工具**：最小充分集、无功能重叠、自包含、报错健壮、token 高效的返回；
  "If a human engineer can't definitively say which tool should be used in a given situation, an AI agent
  can't be expected to do better."；
- **few-shot**：给**多样、典范**的例子，而非堆砌边界 case 清单；
- **just-in-time 检索**：维护轻标识符（文件路径/查询/链接），运行时按需加载——Claude Code 用 head/tail
  分析大文件而不全量载入；文件层级/命名/时间戳本身就是信号；
- **progressive disclosure（渐进披露）**：agent 逐层探索、按需发现上下文；混合策略 = 少量前置（CLAUDE.md）
  + 大量 JIT（glob/grep）；
- **compaction 细节**：保留**架构决定 / 未解 bug / 实现细节**；丢弃冗余 tool 输出；
  保留**最近 5 个访问的文件**；**tool result clearing** 是最轻的手段；
  警示——"overly aggressive compaction can result in the loss of subtle but critical context whose importance
  only becomes apparent later"（先最大化 recall 再迭代 precision）；
- **structured note-taking**：NOTES.md / to-do 模式；Claude 玩 Pokémon 跨数千步维护精确 tally、地图、战术笔记；
  记忆工具（file-based）跨会话累积知识库。

## ④ 人工介入点

无（工程实践文档）。

## ⑤ 成本/规模实测

无量化成本；机制描述含"保留最近 5 个文件"等具体参数。

## ⑥ 失败模式与自述局限

- 过度激进 compaction 丢失"以后才显现重要性"的细节；
- 工具集膨胀 → 选择歧义；
- 运行时探索比预取慢（trade-off）；需要"正确的工具 + 启发式"否则浪费上下文追死线索；
- 自述：模型变强后需要更少的规定性工程（"smarter models require less prescriptive engineering"）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构（强外部佐证）** | **渐进披露**：UnivEdge 加载协议（L0 AGENTS 常驻 / L1 §0+§1 每次 / L2 按任务路由 / L3 按需）与本文同名机制同构；L1 座位用 system prompt section（对 compaction 免疫）与"CLAUDE.md 前置 + JIT"的混合策略同构 |
| **已有但更弱** | **裁剪保留集**：UnivEdge 有 L1 裁剪（9,394 字符预算）与报告裁剪，但**未清单化"必须保留什么"**；本文给了保留集（决定/未解问题/实现细节）+ 参数（最近 5 文件）→ 候选 P3 |
| **缺失** | ① **省略留痕**：本文未直说，但 SWE-agent 代码给了占位符实现（卡片 5）→ 与 P4 合并；② 工具集审计判据（"人类工程师能否明确说出该用哪个工具"）→ 候选 P5 |
| **冲突** | 无。本文"right altitude"与 UnivEdge 元原则（规则须绑定真实失败模式、否则默认带到期的 claimed）方向一致——**可引为元原则的外部依据** |

## ⑧ 可移植性判定

**内核**（裁剪保留集清单、工具审计判据）+ **宿主**（compaction 具体实现、记忆工具属宿主能力）。
渐进披露部分：已是内核资产，本文为其提供**外部锚点**（此前是自研设计，现在有独立来源印证）。

## ⑨ 直引

1. "as the number of tokens in the context window increases, the model's ability to accurately recall
   information from that context decreases."
2. "Every new token introduced depletes this budget by some amount"（attention budget）。
3. "find the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome."
4. "Letting agents navigate and retrieve data autonomously also enables progressive disclosure—in other words,
   allows agents to incrementally discover relevant context through exploration."
5. "The model preserves architectural decisions, unresolved bugs, and implementation details while discarding
   redundant tool outputs or messages."
6. "overly aggressive compaction can result in the loss of subtle but critical context whose importance only
   becomes apparent later."
7. "If a human engineer can't definitively say which tool should be used in a given situation, an AI agent
   can't be expected to do better."

## ⑩ 探针草案（候选 P3）

- 机制：裁剪保留集清单化 + 省略留痕；探针：对一份含"未解问题/关键决定"的产物执行裁剪 →
  检查：① 保留集内容仍在；② 被删部分留下可见占位符（「已省略 N 行」）；破坏式：删掉保留规则 → 探针失败。
