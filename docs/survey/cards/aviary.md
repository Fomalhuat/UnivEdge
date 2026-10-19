# Aviary: training language agents on challenging scientific tasks（FutureHouse，arXiv 2412.21154）

- **元数据**：Narayanan / Braza / Griffiths / Ponnapati / Bou / Laurent / Kabeli / Wellawatte / Cox /
  Rodriques / White（**FutureHouse Inc.** ——种子清单里我误记为 DeepMind，更正）｜ arXiv 2412.21154
  ｜ 获取 2026-10-16（HTML 版标注 August 24, 2026，可能为修订版）
  ｜ 快照 `run/survey/sources/b2-aviary.txt`（sha256 前 16 位 `6069ef383de2ecf2`）
  ｜ URL: https://arxiv.org/abs/2412.21154

## ① 任务分解与角色架构

- 理论框架：把语言 agent 形式化为解 **language decision process（LDP，语言化部分可观测 MDP）** 的策略；
- 软件框架：以**随机计算图**实现 agent——可训练组件包括 **LLM 权重、prompt、memory、采样参数
  （如 temperature）**；支持 online training（拒绝采样/专家迭代/过程监督等）；
- 五个环境（三个科学环境）：DNA 构造工程（分子克隆问答）、科学文献 QA、**蛋白质稳定性工程**，
  外加 GSM8K/hotpotQA 两个标准基准的"环境化"重铸。

## ② 验证/审查机制（核心洞见：oracle verifier 决定扩展性）

> "if a verifier can identify any correct solution – namely, if you can obtain just one correct answer among
> k – then it is possible to scale across multiple orders of magnitude. **Without an oracle verifier, majority
> voting can be used... majority voting plateaus more quickly than oracle verification.**"

即：**有可验证的正确性 oracle 时，加算力（多采样）可持续提升；没有 oracle 时，投票/共识迅速饱和**。
（Aviary 实验中丢弃未提交答案/截断轨迹。）

## ③ 上下文/记忆策略

memory 作为**可训练组件**之一（与 prompt、采样参数并列）——把"记忆如何用"当作优化对象，而非固定设施。

## ④ 人工介入点

无（训练/评测框架）；人工专家作为对照基线。

## ⑤ 成本/规模实测（本卡关键数字）

"语言 agent（开源非前沿 LLM + 在线训练 + 推理算力扩展）**可匹配并超过前沿 LLM agent 与人类专家**
（多项任务），**推理成本低至 1/100**。"

## ⑥ 失败模式与自述局限

- 依赖环境的可验证性（oracle）——不可验证任务的扩展性受限（投票饱和）；
- 需为每个领域构建环境（成本）；LDP 抽象未覆盖任意长程开放任务；
- 训练需要轨迹采集与基础设施（非轻量）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | **oracle verifier 洞见 ↔ 我们的锚点原则**：我们的"锚点对照"正是 oracle 的领域形态（文献值/已知极限/守恒量）；"有 oracle 才能规模化"为"先建锚点、再谈自动化/加速"提供了理论外锚 |
| **已有但更弱** | **"无 oracle 时投票饱和"对审查的推论**：当某类工作**写不出会响的判据**（无锚点）时，多审几轮（或换多个评估者）边际收益迅速下降——这为我们 R2 的"毕业"与"审查加档"提供了边界条件：**加档只在有 oracle 的维度上有效** |
| **缺失（可吸收）** | ① 上述"审查加档有效性受 oracle 存在性约束"原则 → 服务 docs/15 T1/T2 待决（升级信号应绑"是否存在可执行的 oracle 判据"）→ 并入 P2/P3；② "环境化"任务设计（把科研任务做成可重复评测的环境）→ RQ6（我们的评测集扩展可参照其环境定义：状态空间 + 动作 + 可判定成功条件） |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核**：oracle 存在性约束（并入 P2/P3）；**领域资产**：任务环境化定义（评测集设计参照）；
**不适用**：模型训练管线（我们无训练）。

## ⑨ 直引

1. "we show that language agents backed by open-source, non-frontier LLMs can match and exceed both frontier
   LLM agents and human experts on multiple tasks at up to 100x lower inference cost."
2. "if a verifier can identify any correct solution... then it is possible to scale across multiple orders of
   magnitude. Without an oracle verifier, majority voting can be used... majority voting plateaus more quickly
   than oracle verification."
3. "a stochastic computation graph that enables training of language agent components such as LLM weights,
   prompts, memories, or LLM sampling parameters like temperature."

## ⑩ 探针草案

并入 P2/P3（升级信号须含"oracle 判据存在性"条件，而非仅按成本分级）。
