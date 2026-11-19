# InternAgent-1.5（上海AI实验室 / InternScience，arXiv 2602.08990）

> 调研轮次：Round 2（2026-11-19）｜ 卡片编号：C2-2 ｜ 采集人：Enki

## 元数据

| 字段 | 值 |
|---|---|
| 标题 | InternAgent-1.5: A Unified Agentic Framework for Long-Horizon Autonomous Scientific Discovery |
| 出处 | arXiv 2602.08990（2026-02）｜HF papers 2602.08990 ｜ 前身 1.0 = arXiv 2505.16938（2025-05，原名 NovelSeek） |
| 一手性等级 | **T1 系统论文** + **T3 代码**（github.com/Alpha-Innovator/InternAgent，1.5 于 2026-05-07 开源） |
| 获取日期 | 2026-11-19 |
| 快照 | `run/survey-2026-11/clusterD/abs-2602.08990.html` sha256 `c444c60d3bbb1b5725ee06587a127c5575cd5858bbcd283af767d0d07cde6d95`；全文 `internagent15-full.html` sha256 `327d21da29020030c3a845757d4cdbead648ad9b1e602d8a851f20bb1bbc08eb`；README `internagent-readme.md` sha256 `9bba3bdcc37ac1fe9abe919f4c7b29206676e32cd369cf7710cb3bae223ffc0b` |
| 领域 | 计算与实证科学（Earth / Life / Biological / **Physical**）+ 算法发现 |
| 关联 | 论文平台 = Intern-Discovery / 书生·端砚（见 `shlab-duanyan-science-harness.md`）；评测 = `researchclawbench.md` |

## 机制提取

### ① 任务分解与角色架构

三个协调子系统 + 三项基础能力，一一对应：

> "three coordinated subsystems for **generation, verification, and evolution** … **deep research** supports the Generation subsystem, **solution refinement** supports the Verification subsystem, and **long horizon memory** supports the Evolution subsystem."

1.0 的三条卖点（arXiv 2505.16938）：**Scalability**（12 类科研任务）、**Interactivity**（人类专家反馈接口，"allowing for the seamless integration of domain expert knowledge"）、**Efficiency**。

### ② 验证/审查机制

Verification 侧不做"打勾式检查"，而是把验证实现为**受控搜索**：多轮**并行**实验优化与执行框架，配合**分支内进化**：

> "**Intra-branch Evolution.** Conditions proposal generation on both the parent and the historical trajectory of ancestors within the same branch. By analyzing recent successes and failures, it reinforces productive design changes and avoids repeatedly exploring unpromising strategies, formalizing a **localized form of self-reflection**."

验证产出 "structured evidence for downstream refinement"。判定者 = 自动指标（任务内 baseline 对比），湿实验任务则交给真实实验。

### ③ 上下文/记忆策略（Structured Cognitive Memory，三层）

| 层 | 名称 | 存什么 | 混合方式 |
|---|---|---|---|
| 策略-程序 | Strategy-Procedural Memory (SPM) | **不存原始轨迹**，蒸馏"已验证有效模式 + 失败教训 + **失败根因诊断**"，作 strategic priors | — |
| 任务-情节 | Task-Episodic Memory (TEM) | 每次实验的 `{method m, metrics y, improvement judgment}` 单元 | semantic embedding + sparse lexical 混合编码 |
| 语义-知识 | Semantic-Knowledge Memory (SKM) | Long Term Experience Library + **Idea Graph**（已探索方向的语义拓扑） | 对生成方法两两组合做 **contrastive learning**，提取高层方法论原则与低层实验启发式 |

> "Instead of storing raw trajectories, the system distills reusable procedural structures … including both validated effective patterns and lessons learned from unsuccessful attempts."

### ④ 人工介入点

README/1.0 均提供人类专家反馈接口；论文未给出强制门控与批准规则。

### ⑤ 成本/规模数据（论文实测）

> 引用前注意：**能力测量类，2026-02 测量，会过期**（docs/17 §1.2）。

- HLE：text-only **40.87%**，full **40.00%**（自述超 Gemini-3-pro-preview 与 GPT-5）；
- AutoPower 电网潮流（IEEE 39-bus）：RMSE **0.00318** vs SenseFlow 0.00473；
- AutoTSF（ETTh1，MAE）：**0.423** vs DLinear 0.4382；
- AutoMem（Locomo，F1，Qwen2.5-3B）：**0.2785** vs A-MEM 0.2338；
- AutoLM（MATH500，Intern-S1-mini，16k context）：0.880 → **0.904**；
- 另有 `sci_tasks` 模式：给定**论文 + 数据**，自主复现关键结论（配 ResearchClawBench），含 "Astronomy_000" 等任务。

### ⑥ 失败模式与自述局限

论文自述局限少（明显缺口）。**读卡时必须补的怀疑**：
- 记忆层的"教训蒸馏"由同一模型族完成 → 蒸馏质量属 **A1 同源主张**，不能自证；
- HLE/GPQA 类分数与"科研能力"的关系已被 `researchclawbench.md` 的端到端实测**大幅削弱**（见该卡 ③）。

## 对照与判定

| # | 对照项 | 关系 |
|---|---|---|
| 1 | 生成/验证/进化三子系统 | 与 METHODOLOGY 物理方法循环（提出→建模→推导→计算→检验→结论）+ 教训库**同构但粗粒度**；无需吸收 |
| 2 | SPM：蒸馏"失败根因诊断"为先验 | **已有但更弱**：`knowledge/review-lessons.md` 基层是**人工撰写**的根因基；SPM 主张自动蒸馏 → 增量在"自动化"，但引入 A1 风险 |
| 3 | intra-branch evolution：避免重复探索失败方向 | **已有同构**：教训库的设计目的即此 |
| 4 | TEM 情节单元 `{method, metrics, improvement}` | **已有但更弱**：`knowledge/benchmarks.md` + 产物存储有事实，但无统一的"方法↔指标↔进步判定"三元组格式 |
| 5 | Idea Graph（方向语义拓扑） | **无对应**，且无本地失败模式（UnivEdge 不做自动选题） |
| 6 | 人类专家反馈接口（无强制门控） | **UnivEdge 更强**：§1.3 权限门 L0–L2 + §1.7 四信号 |
| 7 | 审查成本分级 | **两端皆无** |

**可移植性判定**：
- 教训**自动蒸馏** → 候选（内核/知识库，须人工裁决 + A1 标注）；
- TEM 三元组格式 → **领域资产**（knowledge/benchmarks 结构化，低成本）；
- Idea Graph、自动选题 → **不吸收**（同 docs/17 对 Si 的处置：不做自动选题）。

## 直引

1. "three coordinated subsystems for generation, verification, and evolution"
2. "Instead of storing raw trajectories, the system distills reusable procedural structures from past reasoning processes, including both validated effective patterns and lessons learned from unsuccessful attempts."
3. "By analyzing recent successes and failures, it reinforces productive design changes and avoids repeatedly exploring unpromising strategies, formalizing a localized form of self-reflection."
4. "After each experiment, the system stores an episodic unit containing the attempted method m, extracted metrics y, and an improvement judgment."
5. "The agent … is given a published paper and its data, and asked to reproduce the key findings autonomously."（README，sci_tasks）
