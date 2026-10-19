# Why Do Multi-Agent LLM Systems Fail?（MAST 失败分类学，arXiv 2503.13657）

- **元数据**：Cemri 等（UC Berkeley 等）｜ 2025 ｜ 多 agent 系统失败分类 ｜ 一手（论文）｜ 获取 2026-10-19
  ｜ 快照 `run/survey/sources/b5-mast.txt`（sha256 前 16 位 `6ac4a8fba1085f3f`）
  ｜ URL: https://arxiv.org/abs/2503.13657

## ① 任务分解与角色架构

研究对象是**多 agent 系统（MAS）**；方法：150 条人工标注轨迹 → 归纳失败模式 → 用 LLM-as-judge 扩展标注。

## ② 验证/审查机制（核心：验证类失败被单列一类）

**14 个失败模式 / 3 大类**（κ=0.88）：

1. **系统设计问题**（specification / role / 分工等）；
2. **inter-agent misalignment**（信息不同步、冲突决定等）；
3. **task verification**（本卡重点），含三个模式：
   - **FM-3.1 Premature termination 6.20%**：任务未完成就结束；
   - **FM-3.2 No or incomplete verification 8.20%**：缺失/不完整的核对，让错误传播；
   - **FM-3.3 Incorrect verification 9.10%**：验证本身做错（未交叉检查关键信息）。

**关键判断（原文）**："**Multi-Level Verification is Needed. Current verifier implementations are often
insufficient; sole reliance on final-stage, low-level checks is inadequate.**"
以及："Systems with explicit verifiers like MetaGPT and ChatDev generally show **fewer total failures**...
However, the presence of a verifier is **not a silver bullet**."

## ③ 上下文/记忆策略

非主体（分类学覆盖信息同步类失败，但未给机制）。

## ④ 人工介入点

标注阶段由人类专家做（150 traces），推理期无。

## ⑤ 成本/规模实测

150 条轨迹人工标注 + LLM-judge 扩展；给出各模式占比（验证类合计约 **23.5%**）。

## ⑥ 失败模式与自述局限

分类学只覆盖 MAS（单 agent 未必适用）；标注偏软件/数学/通用任务；LLM-judge 扩展有偏差风险。

## ⑦ 与 UnivEdge 对照（对 docs/15 T1/T2 是重要修正）

| 判定 | 内容 |
|---|---|
| **已有同构** | 我们的 **B4 根因基（验证失效·拦截器）** 恰好对应 FM-3.2/3.3；"完成宣告"机制对应 FM-3.1（防提前收工） |
| **已有但更弱** | **"只做终态、低层检查不够"**：这是对 docs/15 默认"T1 抽验（核对终态锚点）"的**直接约束**——若只做终态检查，验证类失败（23.5%）会漏。→ **修订 P14**：粒度按判据可得性；**当任务存在可判定的中间步骤时，必须设中间检查点**，不能只靠终态 T1。与 B1-2（end-state 优先）合成为"**终态为主 + 中间检查点补漏**"的表述 |
| **缺失（可吸收）** | 三个验证子模式可作为 **B4 的子类型**（提前终止 / 未验证 / 错验），并附占比作为"哪类更常见"的外部参照 → **建议给 B4 加子标签**（判断类？实为分类学补充，低风险）→ 候选 **P19**（并入 knowledge/review-lessons 的 B4 条目，不新增检查项） |
| **冲突** | 与"end-state 优先"表面冲突 → 裁决：**两者是层次关系**——终态判定是默认口径；中间检查点是**判据可得时的补漏**（P14 已如此表述，需再强化） |

## ⑧ 可移植性判定

**内核**（P14 修订、P19 B4 子标签）；**不适用**：MAS 特有的 inter-agent misalignment（我们是单线程主 agent +
只读审查者）。

## ⑨ 直引

1. "This process identifies 14 unique modes, clustered into 3 categories: (i) system design issues,
   (ii) inter-agent misalignment, and (iii) task verification."
2. "FM-3.1: Premature termination - Ending a dialogue, interaction or task before all necessary information
   has been exchanged or objectives have been met."
3. "FM-3.2: No or incomplete verification - (partial) omission of proper checking or confirmation of task
   outcomes or system outputs, potentially allowing errors or inconsistencies to propagate undetected."
4. "FM-3.3: Incorrect verification - Failure to adequately validate or cross-check crucial information or
   decisions during the iterations."
5. "Multi-Level Verification is Needed. Current verifier implementations are often insufficient; sole reliance
   on final-stage, low-level checks is inadequate."
6. "Systems with explicit verifiers like MetaGPT and ChatDev generally show fewer total failures... However,
   the presence of a verifier is not a silver bullet."

## ⑩ 探针草案（候选 P19 / P14 修订）

- P19（B4 子标签）：对历史审查报告抽样，按 FM-3.1/3.2/3.3 重新归类 → 检查是否能无歧义归类（κ 自评）；
  负控：格式类意见不应落入 B4。
- P14 修订：构造"中间步骤可判但终态通过"的样例 → 断言中间检查点能拦住（仅终态会漏）。
