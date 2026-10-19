# 时效抽查（B6）：用 2026 年证据检验最老的三条结论

- **元数据**：2026-10-19 执行；目的 = 回答 han"材料是否够新"的质疑；
  五来源均为 2026 年（1–10 月），一手；快照见 `run/survey/sources/b6-*`。
- **方法**：挑选"最可能导致设计改变且依赖 2023 证据"的三条结论，检索 2026 年是否有更新/反驳；
  另查 AI4Science 侧 2026 年新评估。

## 抽查来源

| # | 来源 | 日期 | 为何选它 |
|---|---|---|---|
| B6-1 | *Reliability without Validity: A Systematic, Large-Scale Evaluation of LLM-as-a-Judge*（arXiv 2606.19544） | 2026-06 | 21 judges / 541k judgments，检验 P13（judge 偏差）是否仍成立 |
| B6-2 | *The Coin Flip Judge? Reliability and Bias in LLM-as-a-Judge*（arXiv 2606.13685） | 2026-06 | 重复测量稳定性，检验 P13 的"分歧度信号"是否可量化 |
| B6-3 | *Why LLMs Aren't Scientists Yet: Four Autonomous Research Attempts*（arXiv 2601.03315） | 2026-01 | 检验 RQ5 失败模式是否已随模型换代消失 |
| B6-4 | *How Do Agents Fail on AutoResearch*（AutoResearchEval / ARFT，arXiv 2608.14905） | 2026-08 | 100 任务 / 800 轨迹 / 45 失败模式，最新失败分类学 |
| B6-5 | Nature：*Towards end-to-end automation of AI research*（AI Scientist 升级版，s41586-026-10265-5） | 2026-03 | 检验 B2-1/B5-1 的失败结论是否仍成立 |

## 抽查结论（三条老结论的命运）

### ① P13（judge 顺序偏差/稳定性）——**被加强，且给出了可直接用的参数**

- 2023 年证据：GPT-4 换序一致性 65%、Claude-v1 23.8%；换序可翻转结论。
- **2026 年（B6-1）**：21 个 judge、541k 判断——**"一致性–偏差悖论"**：两个生产级 judge
  重测信度 **>0.95** 的同时，位置偏差 **>0.10**；精确匹配一致性被 Cohen's κ 校正后**虚高 33–41 个百分点**；
  同一 judge 在不同 benchmark 上排名可移动 **14 位**。
- **2026 年（B6-2）**：成对偏好平均 **13.6%** 翻转，28% 的问题翻转率 >20%，最高 56%；
  **要 11 次重复多数投票才能以 95% 概率恢复 50 次参考判定**（高方差问题 15 次）。
- **判定**：偏差没有随模型变强消失，只是从"显性偏好第一个"变成"高稳定 + 隐性偏差"。
  P13 从"待审"升级为**高优先**；并把"11 次重复"作为高代价判定的建议参数（可作探针强度设定）。
- **更新一处量级**：2023 年的"冗长偏差"在 2026 年队列中已很小（<0.011）——**旧的冗长偏差担忧可降级**。

### ② RQ5 失败模式——**未消失，且新增两类**

- **B6-3（2026-01）**：4 次端到端尝试 3 次失败；失败模式：训练数据默认偏置、**执行压力下的实现漂移**、
  长程记忆/上下文退化、**"过度兴奋"（明显失败仍宣布成功）**、领域智能不足、实验设计品味弱。
- **B6-4（2026-08）**：100 任务 / 7 领域 / 800 轨迹 / 45 个失败模式，归为 4 个根因柱；核心结论：
  当前 agent 缺 **metacognitive loop**——"check what they produced against what they found, revise when it
  does not hold up"；**单次 LLM-as-judge 的 κ 仅 0.53，人类校准的 agent-as-judge 达 0.75**。
- **B6-5（Nature 2026-03，AI Scientist 升级版）**：加入 template-free + agentic tree search 后，
  论文**首轮通过 ICLR workshop 评审（该 workshop 接收率 70%）**；但失败模式仍在：naive/underdeveloped
  ideas、实现错误、方法学严谨性不足、实验实现错误、图重复、**多种幻觉（含引用不准）**；
  作者明言"cannot yet meet the standards of top-tier publications"。
- **判定**：RQ5 的结论不因模型升级而过期；新增两类值得并入 B4 观察：
  **instruction drift / implementation drift（约束与实现漂移）**、**overexcitement（提前宣布成功）**。
  → 并入 P8（约束不可自改）作为第二半："约束须持续被遵守"。

### ③ 评测/验证设计——**2026 年证据支持"多级 + 过程可见"**

- B6-4 的"agent-as-judge 看完整轨迹与中间产物"（κ 0.75 vs 单次 0.53）支持 P7（输出结构）、
  P12（可审查性）、P14（多级检查点）；
- B6-1/B6-2 的"重复测量 + 顺序随机 + 不确定性报告"支持 P13。

## 与 UnivEdge 的关联（增量）

| 判定 | 内容 |
|---|---|
| **强化** | P13（↑高优先，含 11 次重复参数）；P14（多级检查点）；P8（加 instruction drift 一半） |
| **更新量级** | 冗长偏差（2023 显著 → 2026 可忽略）——**不必为它设计检查**；judge 能力（2023 一致率 80%）在 2026 仍成立但需 chance-correction |
| **新增观察** | **overexcitement**（明显失败仍宣布成功）↔ 我们的"完成宣告"机制正是对策；**resource awareness**（预算/算力感知差）↔ 权限门与长作业预算（宿主层） |
| **对我们的元启示** | 2026 年最强的失败根因是"缺元认知环"——**这恰好是 UnivEdge 的锚点链自检 + 独立审查 + 意见核验在做的事**；外部最新结论与内核方向一致 |

## 直引（供核验）

1. （B6-1）"high test–retest reliability (>0.95) coexists with severe position bias (>0.10) in two
   production-deployed judges (instantiating a consistency–bias paradox)"
2. （B6-1）"kappa deflation between exact match and Cohen's kappa is universal (33–41 pp on MT-Bench)"
3. （B6-2）"pairwise preferences flip on average 13.6% of the time, with 28% of questions exceeding a 20%
   flip rate and one question reaching 56%."
4. （B6-2）"11 repeated trials are needed for a majority vote to recover the 50-trial reference verdict with
   95% probability on average, rising to 15 for high-variance questions."
5. （B6-3）"six recurring failure modes: bias toward training data defaults, implementation drift under
   execution pressure, memory and context degradation across long-horizon tasks, overexcitement that declares
   success despite obvious failures, insufficient domain intelligence, and weak scientific taste..."
6. （B6-4）"current agents lack a metacognitive loop—the ability to check what they produced against what they
   found, revise when it does not hold up, and question whether the path they took was sound."
7. （B6-5）"Common failure modes include the generation of naive or underdeveloped ideas, incorrect
   implementations of the main idea, a lack of deep methodological rigour, errors in experimental
   implementation, duplicating figures... and many types of hallucinations, such as inaccurate citations."
8. （B6-5）"The AI Scientist cannot yet meet the standards of top-tier publications nor even do so consistently
   for workshops."

## 时效分级（供裁决包使用）

| 级别 | 含义 | 本调研中的例子 | 使用规则 |
|---|---|---|---|
| **A（2025–2026）** | 现行实践/最新证据 | Anthropic 2025-26 文、MAST、Beel、Ideation-Gap、B6 全部 | 可直接作为判据依据 |
| **B（2024）** | 一年内，机制与量级大体可用 | AI Scientist v1、Virtual Lab、Aviary、Prover-Verifier、CORE-Bench | 可用；量级类结论需标注年份 |
| **C（2023）** | 基础机制，**能力测量类结论需重测** | MT-Bench judge、self-correct、PRM、Voyager、Reflexion、MemGPT、GenAgents | **机制类可用；测量类只作方向，不作阈值依据** |
