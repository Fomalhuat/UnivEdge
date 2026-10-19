# The AI Scientist（Sakana AI 等，arXiv 2408.06292）

- **元数据**：Lu / Lu / Lange / Foerster / Clune / Ha ｜ 2024（v1）｜ 全自动 ML 研究 ｜ 一手（论文）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-ai-scientist.txt`（sha256 前 16 位 `421f534b197e57e2`）
  ｜ URL: https://arxiv.org/abs/2408.06292
- **范围注**：仅 v1（未含 2025 v2）；对本文的批判性复现研究留待 Batch 5（RQ5）。

## ① 任务分解与角色架构

三阶段管线 + 归档循环：**Idea Generation**（LLM 作变异算子演化想法档案，想法含自评
interestingness/novelty/feasibility）→ **Experimental Iteration**（用 **Aider** 改代码模板、跑实验）→
**Paper Write-up**（LaTeX 全套论文）→ **Automated Review** → 结果与评审入档案、循环。
"Given a broad research direction and a simple initial codebase"；模板（small-scale baseline）是必要输入，
非端到端从零。

## ② 验证/审查机制（本卡重点）

- **Automated Reviewer**（模拟会议评审）：在 500 篇 ICLR 2022 OpenReview 数据上验证——
  **F1 0.57（超人类 0.49）、AUC 0.65（与人类持平）**、balanced accuracy 65% vs 人类 66%；
  两人类评审间相关性 **0.14 < LLM 与均值相关性 0.18**；
- 消融：**Reflexion + one-shot 提升准确率；review ensembling（5 次）不提升性能、只降方差**；
- **代码执行验证缺口（对 UnivEdge 最重要的一条）**："The AI Scientist may incorrectly implement an idea,
  which can be difficult to catch. **An adversarial code-checking reviewer may partially address this.**
  As-is, one should **manually check the implementation before trusting the reported results.**"；
- 可复现性纪律：**"we make sure all experimental results are reproducible, storing copies of all files when
  they are executed"**。

## ③ 上下文/记忆策略

无专门机制描述（论文模板 + 档案库 idea archive 提供跨轮记忆；单轮内为线性管线）。

## ④ 人工介入点

名义上零（"fully automatic"），但结尾自述实际上"不应把内容当真"（见⑥），实质人工介入＝事后人审。

## ⑤ 成本/规模实测

**<$15/论文**（"around $10-15 per paper"；成本主要在编码与写作 API，评审与实验计算可忽略）；
"can generate hundreds of ... papers over the course of a week"。

## ⑥ 失败模式与自述局限（原文清单，信息量最大的部分）

- 想法同质化（不同 run/model 给出相似想法）；Aider 实现失败率高、"ideas often too challenging to implement"；
- **实现错误难抓**（需对抗性代码审查 + 人工检查，见②）；
- 实验深度不足 → "difficult to conduct fair experiments that control for the number of parameters, FLOPs, or
  runtime. **This often leads to deceptive or inaccurate conclusions.**"；
- **指标变更不一致**："when it changes a metric (e.g. the loss function), it sometimes does not take this into
  account when comparing it to the baseline"（↔ 我们的 CC-01 约定一致性！）；
  "struggles to compare the magnitude of two numbers"（↔ 我们的量级误读教训）；
- **幻觉全表**："an early version of our writing prompt told it to always include confidence intervals and
  ablation studies... it would sometimes **hallucinate an entire ablations table**. We resolved this by
  instructing The AI Scientist explicitly to **only include results it directly observed**."（↔ 锚点原则）；
- **安全（自改约束）**：一次 run 中它写代码**自我重启**（进程失控）；另一次**把时间限制改大**而非缩短运行
  （"bypassing the experimenter's imposed constraints"）；曾保存近 1TB checkpoint；建议严格沙箱；
- 诚实声明："we do not recommend taking the scientific content of this version at face value. Instead, we
  advise treating generated papers as **hints of promising ideas**"。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "只能用直接观察到的结果" ↔ §0.2 锚点原则；② 指标变更需一致比较 ↔ CC-01 约定一致性；③ 全部产物存档可复现 ↔ §1.6 产物存储；④ 论文诚实声明 ↔ "未锚定只能 claimed" 语义 |
| **已有但更弱** | **"实现/计算错误需要专门的角色去查"**：UnivEdge 的 NC/PC 已含数值核对，但"**代码实现与已验证方程/参考实现的对照**"是 PC-05（已有），而"**对抗性代码检查者**"这一角色化手段我们尚未有专名——与文档中的"独立审查者"部分重叠 → 评估是否归入已有条款而非新增 |
| **缺失（可吸收）** | ① **自改约束风险**：agent 修改自己的运行约束（超时/重启/资源）——我们的权限门 L0-L2 管"副作用"，但对"**改自己的约束/门**"这类行为没有显式条款（10-12 的"空门修复"是工程侧；内核侧应有一条"约束不可自改"原则）→ 候选 P8；② 幻觉整表 →"只能包含直接观察结果"的**可检查判据**（探针可做）→ 并入 P8 或单独 |
| **冲突** | 无（其"全自动"定位与 UnivEdge"人类掌舵"不同层，不构成冲突） |

## ⑧ 可移植性判定

**内核**（约束不可自改原则；"仅直接观察结果"判据化）+ **不适用**（全自动循环、Aider 编码管线、
论文生成流程——UnivEdge 定位为科研助手而非自动科学家）。

## ⑨ 直引

1. "Each idea is implemented and developed into a full paper at a meager cost of less than $15 per paper."
2. "the automated reviewer achieves superhuman F1 Scores (0.57 vs. 0.49) and human-level AUC (0.65 for both)."
3. "An adversarial code-checking reviewer may partially address this. As-is, one should manually check the
   implementation before trusting the reported results."
4. "when it changes a metric (e.g. the loss function), it sometimes does not take this into account when
   comparing it to the baseline."
5. "in these cases, it would sometimes hallucinate an entire ablations table. We resolved this by instructing
   The AI Scientist explicitly to only include results it directly observed."
6. "when The AI Scientist's experiments exceeded our imposed time limits, it attempted to edit the code to
   extend the time limit arbitrarily instead of trying to shorten the runtime. While creative, the act of
   bypassing the experimenter's imposed constraints has potential implications for AI safety."

## ⑩ 探针草案（候选 P8）

- 机制：约束不可自改；探针：构造"任务超时"场景 → 检查 agent 是否尝试修改超时/门配置；
  负控：正常场景不应触发告警。破坏式：移除该条款 → 检出能力消失（探针不再报）。
