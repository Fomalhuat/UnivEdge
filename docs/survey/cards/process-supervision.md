# Let's Verify Step by Step（OpenAI，arXiv 2305.20050）

- **元数据**：Lightman / Kosaraju / Burda / Edwards / Baker / Lee / Leike / Schulman / Sutskever / Cobbe
  （OpenAI）｜ 2023 ｜ 过程监督 vs 结果监督 ｜ 一手（论文）｜ 获取 2026-10-16
  ｜ 快照 `run/survey/sources/b3-verify-step.txt`（sha256 前 16 位 `2c655549ad77ae67`）
  ｜ URL: https://arxiv.org/abs/2305.20050

## ① 任务分解与角色架构

奖励模型（RM）训练范式对比：

- **ORM（outcome supervision）**：只对最终答案给反馈；
- **PRM（process supervision）**：对**每个中间推理步**给反馈；
- 数据：**PRM800K**（800,000 条步级人类标签）；主动学习采集。

## ② 验证/审查机制（核心数据）

MATH 测试子集，"best-of-1860"搜索口径：

| 方法 | 解出率 |
|---|---|
| **PRM（过程监督）** | **78.2%** |
| ORM（结果监督） | 72.4% |
| 多数投票（majority voting） | 69.6% |

- 结论："**process supervision significantly outperforms outcome supervision**"；
- 主动学习使过程监督的数据效率提升 **2.6×**；
- 大 RM 可近似人类监督来训练小 RM（用于大规模数据消融）。

## ③ 上下文/记忆策略

无关（训练侧）。

## ④ 人工介入点

人类提供**步级**反馈（比"只看最终答案"更贵、更细）；主动学习用于挑最值得人工标注的样本。

## ⑤ 成本/规模实测

800k 步级标签；主动学习 2.6× 数据效率；无 token 成本。

## ⑥ 失败模式与自述局限

- 仅数学域；步级标注昂贵；PRM 在"步骤可判定"的任务上有效，步骤不可判定时退化；
- 主动学习可能使数据偏向错误答案（论文自述并做了对照实验）。

## ⑦ 与 UnivEdge 对照（对 T1/T2 边界的关键细化）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① 我们已有"步骤级"审查概念：§5.5 测试设计审查（明细层）、RC-06 根因宣布协议要求列全部候选并逐个直接检验；② 锚点链＝步级可核结构 |
| **已有但更弱** | **判定粒度与判据可得性的关系未被明文**：我们默认"全量重推（T2）＝过程级"，"抽验（T1）＝终态级"，但未写清**何时步骤级更强、何时终态级足够**。本文给出边界：**当每一步都有可判定判据时，步骤级监督更强（78.2 vs 72.4）**；反之（只有终态可判）应走终态口径（呼应 B1-2 的 end-state） → **候选 P14**（T1/T2 边界条款：判定粒度按"步级判据是否存在"确定，不按成本拍） |
| **缺失（可吸收）** | ① "步级判据存在性"可作为**可静态判定的属性**（清单化：该任务每一步是否都有可写出的判据？）→ 有望成为 docs/15 待决①的可观测升级信号之一（与 P13 的分歧度信号互补：一个事前、一个事后）；② 主动学习思想（挑"最可能改变结论的样本"给人工）↔ 我们的人工时间应优先给"高不确定性样例"（HITLC 同源，B3-1b） |
| **冲突** | **与 B1-2 的"end-state 优先"表面冲突**：实则互补——**粒度取决于判据可得性**：可逐步判定 → 过程级；只能终态判定 → 终态级。这一条应写进 P14 作为统一表述 |

## ⑧ 可移植性判定

**内核**（P14：判定粒度 ↔ 判据可得性；与 P2/P3 合并成"T1/T2 边界三条件"）；
**不适用**：RM 训练、PRM800K 采集流程。

## ⑨ 直引

1. "process supervision, which provides feedback for each intermediate reasoning step."
2. "process supervision significantly outperforms outcome supervision for training models to solve problems
   from the challenging MATH dataset."
3. "Our process-supervised model solves 78% of problems from a representative subset of the MATH test set."
   （表：PRM 78.2 / ORM 72.4 / 多数投票 69.6，best-of-1860）
4. "active learning leads to a 2.6× improvement in the data efficiency of process supervision."

## ⑩ 探针草案（候选 P14，与 P2/P3 合并）

- 机制：判定粒度按"步级判据是否存在"确定；
- 探针：准备两类任务——(a) 每步都有可写判据（如多阶段数值管线）；(b) 仅终态可判（如端到端复现）→
  断言审查档位/粒度选择分别落为"过程级"与"终态级"；
- 负控：两类都不应无条件走 T2；破坏式：移除该判据 → 选择退化为"按成本拍"（探针失败）。
