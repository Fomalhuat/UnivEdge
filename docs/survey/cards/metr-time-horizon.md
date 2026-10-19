# Measuring AI Ability to Complete Long Software Tasks（METR，arXiv 2503.14499）

- **元数据**：METR 团队｜ 2025 ｜ 长任务能力度量 ｜ 一手（论文）｜ 获取 2026-10-18
  ｜ 快照 `run/survey/sources/b4-metr.txt`（sha256 前 16 位 `e52de524a5e7cae1`）
  ｜ URL: https://arxiv.org/abs/2503.14499

## ① 任务分解与角色架构

非系统论文：提出度量与评测方法。

## ② 验证/审查机制

非主体；但方法学值得注意：**以"人类完成时间"为标尺**（tasks 由人类专家计时），
用**分层 bootstrap**（任务族/任务/尝试三层）给置信区间；成功判据为任务客观完成。

## ③ 上下文/记忆策略

无关。

## ④ 人工介入点

评测中人类是标尺（计时）；部署层面无。

## ⑤ 成本/规模实测（本卡核心数据）

- 指标：**50% 任务完成时间跨度**（"the time humans typically take to complete tasks that AI models can
  complete with 50% success rate"）；
- 现状：前沿模型（如 o3）**约 110 分钟**；
- 趋势：**约每 7 个月翻倍**（2019 起；2024 后可能加速）；
- 数据集：RE-Bench + HCAST + 66 个新短任务。

## ⑥ 失败模式与自述局限

- 指标只覆盖"软件任务"与"人类可计时"的任务；对**科研任务**（数周/数月、判据昂贵）外推需谨慎；
- 50% 成功率是**平均值**，不表示"可靠"（对科研，50% 远不够）；
- 任务长度与"所需审查强度"的关系未讨论（本文不涉及审查）。

## ⑦ 与 UnivEdge 对照（对"何时可放宽审查"有外锚价值）

| 判定 | 内容 |
|---|---|
| **已有同构** | 无直接机制同构；但思路相通：**用可外部计时的任务属性来标定能力**，与我们"按工作类型状态（capability/regression）标定审查强度"同类 |
| **已有但更弱** | **"任务长度"不是我们的能力轴**：work-types 按"工作类型"登记，未按"任务规模/时长"分层。METR 提示：**自主可靠性随任务长度指数衰减**（50% 在 110 min）→ 我们"长作业批量"（§1.7 信号②）的高代价判断其实隐含了这条曲线；可考虑把"任务预计时长/步数"作为**升级信号的一个可测维度**（与 P2 合并，仅作参考，不新增条款） |
| **缺失（可吸收）** | ① **度量口径**：把"审查所需时间/步数"与"任务时长"一起记录，可量化 docs/15 待补的"审查成本占比"；② **50% vs 可靠性阈值**：科研要求远高于 50%，提示"不能因模型变强就撤掉审查"，需按**所需可靠度**设定，而非按平均能力 → 可作为 R2 毕业阈值的考量（我们目前只看"零实质发现"，未按任务风险分层） |
| **冲突** | 无（本文不涉及审查设计） |

## ⑧ 可移植性判定

**内核（弱/度量）**：把任务时长与审查成本一起记录；**观察**：50% 成功率 ≠ 科研可用可靠性；
**不适用**：METR 任务集与 bootstrap 方法（评测侧，可参考其统计严谨性）。

## ⑨ 直引

1. "we propose a new metric: 50%-task-completion time horizon, the time humans typically take to complete tasks
   that AI models can complete with 50% success rate."
2. "current frontier AI models such as o3 have a 50% time horizon of around 110 minutes."
3. "frontier AI time horizon has doubled approximately every seven months since 2019, though the trend may have
   accelerated since 2024."
4. "Even if the absolute measurements are off by a factor of 10, the trend predicts that in under a decade we
   will see AI agents that can independently complete a large fraction of software tasks that currently take
   humans days or weeks."

## ⑩ 探针草案

无（度量/观察项）。与 P2 的"升级信号"合流时，可把"任务时长"作为其中一个可选维度。
