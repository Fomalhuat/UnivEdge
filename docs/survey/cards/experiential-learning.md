# 经验学习：Reflexion（2303.11366）+ ExpeL（2308.10144）合并卡

- **元数据**：
  - **B4-2a** Reflexion：Shinn / Cassano / Gopinath / Narasimhan / Yao（Northeastern/MIT/Princeton）｜2023
    ｜快照 `run/survey/sources/b4-reflexion.txt`（sha256 前 16 位 `8971b0e5a498cbe1`）｜URL: https://arxiv.org/abs/2303.11366
  - **B4-2b** ExpeL：Zhao / Huang / Xu / Lin / Liu / Huang / Li（清华）｜2023
    ｜快照 `run/survey/sources/b4-expel.txt`（sha256 前 16 位 `3e78b5dd45a63280`）｜URL: https://arxiv.org/abs/2308.10144
  - 均一手（论文），获取 2026-10-18
- **为何合并**：两篇都在回答"如何把失败经验变成下一次的改进信号"，且 ExpeL 以 Reflexion 为组件。

## ① 任务分解与角色架构

- **Reflexion**：Actor / Evaluator / Self-Reflection 三角；每轮失败后生成**语言化总结**存入**episodic memory**，
  下一轮作为额外上下文注入；"verbal reinforcement"（把二值/标量反馈转成文本方向）。
- **ExpeL**：三阶段——① 收集成功/失败经验（用 Reflexion 重试失败任务）→ ② **提取跨任务洞察**
  （对成功/失败对动态修改"insight 列表"）→ ③ 推理时召回 insights 与历史成功经验。

## ② 验证/审查机制

- Reflexion 的 evaluator 依赖环境信号（单测通过/失败、精确匹配），**不是纯自评**；
- 自述局限（Reflexion，原文）："**relying on the power of the LLM's self-evaluation capabilities (or
  heuristics) and not having a formal guarantee for success**"——与 B3-2（无外部反馈自纠失效）互补：
  **有外部信号时，语言化反思有效**；
- ExpeL 的 insights 由成功/失败对**对比**产生（不是凭空反省），且可跨任务迁移。

## ③ 上下文/记忆策略（本卡核心）

- **记忆单元＝自然语言总结**（可读、可审计、便宜），而非参数更新；
- **经验必须绑定"结果信号"**（成功/失败）才有用——这也是它们与"自由自省"的分水岭；
- ExpeL 的 insight 列表是**持续维护的全局知识**（与我们的根因基/教训库同构，但他们的条目从经验中自动提取、
  可增删改）。

## ④ 人工介入点

无（自动）；但外部判据（测试/环境）是隐含的人设定。

## ⑤ 成本/规模实测

- Reflexion：HumanEval **pass@1 91%**（对比 GPT-4 80%）；跨决策/编码/推理任务一致提升；
- ExpeL：随经验累积稳定提升；支持跨任务迁移（定性 + 实验）。

## ⑥ 失败模式与自述局限

- 依赖 evaluator 质量与外部信号；自述"无形式化成功保证"；
- 反思文本可能过拟合单次失败（错误归因）；经验库增长带来的检索/冲突问题（未深入）；
- 均无"何时该忘/该淘汰旧经验"的机制。

## ⑦ 与 UnivEdge 对照（同构度很高的两篇）

| 判定 | 内容 |
|---|---|
| **已有同构（强）** | ① **教训库（B1–B4 根因基）＋每日日志** ↔ Reflexion 的 episodic memory / ExpeL 的 insight 列表；② **§1.1"每次任务先检索教训"** ↔ ExpeL 的"推理时召回 insights"；③ **§5.6 意见核验后回写 + 分歧日志** ↔ "把失败转成下一轮的方向"；④ 我们更结构化（根因基按线性独立原则固化，见 §1.5），**比 ExpeL 的自由文本 insight 列表更抗膨胀**——这是我们的优势，外部来源反而印证了"抽象化"的必要 |
| **已有但更弱** | **① 经验与"结果信号"的绑定强度**：Reflexion/ExpeL 明确要求成功/失败标签；我们的教训条目多数有案例，但**是否每条都绑定"哪次运行/哪个门失败"**未强制 → 可与 P12（可核查性）合并：教训须可定位到具体失败证据；**② 检索/排序**：ExpeL 每任务召回 insights，我们靠 L1 常驻 + L3 按需人工判断，**无排序规则** → 候选 **P16**（与 B4-3 的 relevance/recency/importance 同源） |
| **缺失（可吸收）** | **"淘汰/遗忘"机制**：两篇都没有，我们也没有（work-types 有 retired 状态，但教训库无退役规则）→ 记观察（我们的"元原则 + 到期条件"其实已部分覆盖：判断类动作带到期，可推广到教训条目） |
| **冲突** | 无。Reflexion 的"自评"表面与 B3-2 冲突，实则依赖外部信号 → 两者一致 |

## ⑧ 可移植性判定

**内核**（P16 检索排序；教训-证据绑定并入 P12）；**不适用**：Reflexion 的 RL 式多轮重试循环
（我们的单元是科研子任务，非基准题）。

## ⑨ 直引

1. （Reflexion）"Reflexion converts binary or scalar feedback from the environment into verbal feedback in the
   form of a textual summary, which is then added as additional context for the LLM agent in the next episode."
2. （Reflexion）"Reflexion achieves a 91% pass@1 accuracy on the HumanEval coding benchmark, surpassing the
   previous state-of-the-art GPT-4 that achieves 80%."
3. （Reflexion）"it does have the disadvantages of relying on the power of the LLM's self-evaluation capabilities
   (or heuristics) and not having a formal guarantee for success."
4. （ExpeL）"extracts knowledge using natural language from a collection of training tasks. At inference, the
   agent recalls its extracted insights and past experiences to make informed decisions."
5. （ExpeL）"Extraction/abstraction of cross-task knowledge from these experiences."

## ⑩ 探针草案（候选 P16，与 B4-3 合并）

- 机制：教训/技能的检索排序（相关性 + 新近 + 重要）；
- 探针：构造 8–10 条教训 + 一个只与其中 2 条相关的任务 → 断言检索结果包含这 2 条且排在前面；
- 负控：无关任务 → 不应把不相关教训排前；破坏式：去掉排序规则 → 探针在"命名不相关"的条目上失败。
