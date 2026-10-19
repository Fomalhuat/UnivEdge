# 独立复现评估：Evaluating Sakana's AI Scientist（arXiv 2502.14297）

- **元数据**：Beel / Kan / Baumgart（Siegen / NUS）｜ 2025-02（SIGIR Forum 2025）｜ 独立第三方评估
  ｜ 一手（论文）｜ 获取 2026-10-19
  ｜ 快照 `run/survey/sources/b5-beel.txt`（sha256 前 16 位 `e93f9dbdbb28264c`）
  ｜ URL: https://arxiv.org/abs/2502.14297
- **性质**：对 Batch 2 的 B2-1（AI Scientist 自述）的**独立复核**——正好构成"自述 vs 外部实测"的对照，
  是 RQ5 的核心材料。

## ① 任务分解与角色架构

评估对象是 AI Scientist v1；评估者重跑系统、逐项检查产物（文献综述、实验执行、代码改动、稿件）。

## ② 验证/审查机制（评估者的检验方式）

- 用**实际执行**检验：12 个提议实验逐一跑，统计失败率与结果合理性；
- 检查**代码改动幅度**（每轮增量字符数）作为"适应能力"代理；
- 检查稿件：引用数量/时效、结构完整性、占位符、数值是否幻觉；
- 提出治理建议：**"research logs and markup languages"**（可归属的研究日志与机读标注）用于透明性。

## ③ 上下文/记忆策略

无关。

## ④ 人工介入点

评估中"3.5 小时人工参与/篇"（对照其 $6–15 成本）。

## ⑤ 成本/规模实测（硬数据）

| 维度 | 结果 |
|---|---|
| 实验执行 | **12 个中 5 个（42%）因编码错误失败**；跑通的也常"logically flawed or misleading" |
| 目标一致性 | 一例"优化能效"的实验报告精度提升但**消耗更多算力**，与目标矛盾 |
| 代码适应 | 每轮平均只增 **8%** 字符——适应性有限 |
| 文献 | 每篇中位数 **5 条引用**；34 条中仅 **5 条**为 2020 年后 |
| 稿件结构 | 缺图、重复章节、占位符（如 "Conclusions Here"）频发 |
| 数值 | **多篇含幻觉数值** |
| 成本 | **$6–15/篇**，人工约 **3.5 h** |

## ⑥ 失败模式与自述局限（对 RQ5 最有价值）

- 新颖性判断失效：把**微批处理（micro-batching for SGD）**等既有概念误判为"新颖"——文献检索是关键词匹配，
  缺综合；
- "能写出像论文的东西"≠"能做研究"：**表面完整性掩盖实质缺陷**（评估者指出：许多审稿人/教师仅凭表面
  可能难以区分）；
- 自述局限：单系统、单配置评估；成本核算不含评估者时间。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "表面完整掩盖实质缺陷" ↔ 我们的"状态机 + 锚点链"正是为此设计；② 幻觉数值 ↔ 锚点原则/b1 根因；③ 引用时效与来源核对 ↔ NC-07；④ "研究日志 + 机读标注" ↔ 我们的运行链 + INDEX + 报告结构 |
| **已有但更弱** | **"目标一致性"检查**：该例（优化能效却增算力）是一个**判据与目标脱钩**的典型。我们的 RC-02（可打分判定）+ 契约测试计划可覆盖，但**没有"产物指标与任务目标方向一致性"的显式检查项** → 候选 **P17**（低优先，可能并入 RC-02 的说明） |
| **缺失（可吸收）** | 无强缺口；"机读研究日志"是 R1c（报告结构约定）的又一外部佐证 |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核（弱）**：P17 目标一致性检查；**佐证**：R1c（机读结构）、NC-07、状态机。

## ⑨ 直引

1. "five out of twelve proposed experiments (42%) failed due to coding errors, and those that did run often
   produced logically flawed or misleading results."
2. "In one case, an experiment designed to optimize energy efficiency reported improvements in accuracy while
   consuming more computational resources, contradicting its stated goal."
3. "each iteration adding only 8% more characters on average, suggesting limited adaptability."
4. "a median of just five citations per paper—most of which were outdated (only five out of 34 citations were
   from 2020 or later)."
5. "Hallucinated numerical results were contained in several manuscripts."
6. "standardized attribution frameworks such as research logs and markup languages."

## ⑩ 探针草案（候选 P17）

- 机制：产物指标须与任务目标方向一致（目标一致性检查）；
- 探针：给一个"目标=降本"的产物，其中报告"精度提升但算力增加"→ 检查审查者是否判为不达目标；
- 负控：目标与指标一致的产物 → 不得误报；破坏式：移除该检查项 → 探针在矛盾样例上失败。
