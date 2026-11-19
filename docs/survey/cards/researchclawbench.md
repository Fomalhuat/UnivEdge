# ResearchClawBench（InternScience，arXiv 2606.07591）——端到端自主科研的复现评测

> 调研轮次：Round 2（2026-11-19）｜ 卡片编号：C2-4 ｜ 采集人：Enki
> **为什么这张卡重要**：它是目前唯一**以"能否复现真实论文"为口径、直接测 agent（而非模型）** 的公开评测，且给出了失败类型的量化分布——直接对应 UnivEdge 的"文献复现"任务类型。

## 元数据

| 字段 | 值 |
|---|---|
| 标题 | ResearchClawBench: A Benchmark for End-to-End Autonomous Scientific Research |
| 出处 | arXiv 2606.07591（2026-06）｜代码 github.com/InternScience/ResearchClawBench ｜ 数据集 HF / ModelScope `InternScience/ResearchClawBench` |
| 一手性等级 | **T1 评测论文** + **T3 代码/数据** |
| 获取日期 | 2026-11-19 |
| 快照 | `rcb-full.html` sha256 `8f1ddd54a490a56ce393dc3bd62904d2c25a7cf3edbfa701a3b1dba1254cb4b5`；README sha256 `16caadd3584467b70472be9b09a409eb7f77b4f8700ea634a57e6139145188a4` |

## 机制提取

### ① 任务与协议（**可移植的核心**）

- 40 任务 × 10 学科：Astronomy / Chemistry / Earth / Energy / Information / Life / Material / Mathematics / Neuroscience / **Physics**（凝聚态与量子：nanocluster 理论、超导、量子采样、Floquet 态）；
- 每个任务源自**真实已发表论文**，提供相关文献 + 原始数据 + 可执行环境，**评测时隐藏目标论文**（防抄答案 / 污染控制）；
- **专家标注多模态 rubric**：拆成可核查的加权子判据，分 `text` / `image` 两类，含 keywords + weights；
- 两阶段：自主研究 → 同行评审式评估；7 个自主 agent + 17 个原生 LLM（经轻量 `ResearchHarness`）统一协议比较 → **它测的是 agent（harness），不是单纯模型**。

### ② 评分口径（**可直接借用的设计**）

> "we set **50 rather than 100** as the re-discovery boundary. Scores below 50 are below target-paper level, **50 means the model recovered the target result**, and scores above 50 indicate discoveries beyond existing work."

即：**锚点 = 目标论文本身**，50 分 = 复现到位，>50 = 有新发现。两类任务：target optimization（奖励更强定量结果）与 diagnostic analysis（奖励更完整解释/机制）。

### ③ 实测结果（2026-06 测量，GPT-5.1 判分；**能力测量类，会过期**）

| 对象 | 均值（满分 100，50=复现到位） |
|---|---|
| 最强自主 agent（Claude Code） | **21.5** |
| 7 agent 的逐任务前沿均值 | 24.6 |
| 最强原生 LLM（Claude-Opus-4.7，经 ResearchHarness） | 20.7 |
| 17 LLM 前沿均值 | **26.5** |

- **全部远低于 50** → 当前系统离"复现目标论文"仍有系统性差距；
- Claude Code 仅赢 **14/40** 任务；7 个 agent 的两两任务级相关中位数 **0.79**（0.64–0.86）→ **难度是任务的属性，不是 harness 的属性**（换 harness 不会改变难度序）；
- 领域领先者各异：**Qwen3.7-Max 领先 Physics**、DeepSeek-V4-Pro 领先 Material、GLM-5.1 领先 Chemistry、Claude-Opus-4.7 领先 Neuroscience。

### ④ 失败分类学（280 次运行，6 类）——**本卡最关键**

主导失败是 **Experiment Design Mismatch / Evidence Mismatch / Scientific Core Missing**；而不是 Goal Misalignment / Reliability-Reporting Failure / Execution Failure。

> "the main problem is not that agents cannot generate reports or that execution simply fails. Instead, agents **gradually depart from the target paper in protocol, key evidence, or mechanistic interpretation**, such as by selecting the wrong data-processing method, baseline, validation setting, or experimental protocol."

**物理实例（Physics_002，随机量子线路采样 / XEB 保真度估计）**：OpenClaw 为该任务最强 agent，仍只得 **27.45**。它恢复了最直接的计数加权线性 XEB 趋势（rubric 项 47/50、40/50），但**证据链残缺**：缺 log-XEB 与多指标一致性、缺 MB 回归与 depth-24 mirror-circuit 推断、**门计数错误模型完全缺失**。

> "agent analysis often **stops at the most direct observable trend while missing the finer verification steps and physical modeling** required for target-paper-level re-discovery."

### ⑤ 成本/收益

- 补充四维（Comprehensiveness / Depth / Instruction Following / Professionalism）：系统在 **Professionalism 常 >70**，而 rubric 分仅 20 左右，**两者弱相关**；
- > "the central challenge is not producing a polished report, but recovering rubric-critical scientific evidence."
- > "score appears to have only a **weak positive relationship** with resource investment … even when a model spends more time, the additional computation does not necessarily produce a stable improvement."
- Pareto 拐点：cost 维 = Qwen3.7-Max，runtime 维 = OpenClaw。

### ⑥ 自述局限

1. 只覆盖 **dry-lab**（不能评估湿实验）；
2. **"current scoring mainly targets the final report rather than fine-grained research steps"**；
3. 真正新结论"requires more reliable evaluation methods than rubrics constructed around existing target papers"。

## 对照与判定

| # | 对照项 | 关系 |
|---|---|---|
| 1 | NC-07（文献数值回原始来源）+ NC-01（锚点对照表） | **已覆盖**：正对 RCBench 的 Evidence Mismatch 类。**这是正面结论——UnivEdge 的检查项命中了外部实测的头号失败类** |
| 2 | "实验设计/协议对齐"检查（数据预处理、baseline、验证设置、procedure 是否与被复现论文一致） | **已有同构（初判有误，2026-11-19 复核后更正）**：`§1.2` 副作用前核对清单已含"**对端配置（对照实现是否用同一套参数）**"，`§3.3` 已写"'最小改动'= 最小变更面（完整复刻已验证的生产链，只改目标变量），**不是最小复制面**"，且 `P` 维专管"未完整复刻生产链"。RCBench 头号失败类正被这三条覆盖。**残留缺口很窄**：现有核对清单是**提交 HPC 前**的、数值型对照专用；对被复现的**文献论文**本身（他人代码/他人 preprocessing）没有对应核对项，且无"结论时点"的协议保真复核 → 只作"推广"，不新增机制 |
| 3 | "打磨 ≠ 实质"（Professionalism 常 >70 vs rubric ~21，四维与 rubric 分**弱相关**） | **缺失（但须精确表述）**：UnivEdge §5.4 只禁"说服自己问题不重要"，无"不得以表达完整性作质量代理"的约束。**注意证据边界**：本文测到的是"系统"在打磨与实质之间**弱相关**，即**把打磨当质量代理无效**；它**并未**测判分器是否被打磨带偏（那是 docs/16 B3-1 判据偏差族的事，且 docs/17 §1.3 已证冗长偏差在 2026 可忽略）。→ 候选只写"代理无效"，不写"判分器偏差" |
| 4 | 50 分锚定协议 + 隐藏目标论文 | **可直接借用**：UnivEdge 的"文献复现"任务可用同一口径自评（隐藏目标 → 只给文献+数据 → 用专家 rubric 评分，50=复现到位）→ 领域资产/测试设计 |
| 5 | 资源投入↔分数弱相关 | **与 docs/16 P2 形成限定**：P2 引 co-scientist"test-time compute 持续收益"；RCBench 给出**无 oracle 场景下加算力不必然改善**的第二数据点，与 Aviary"无 oracle 时加档饱和"同向。→ 写入冲突记录，不新增条款 |
| 6 | 任务级难度相关 0.79（跨 harness 一致） | **外部证据**：难度主要来自任务/领域，不支持"换更强 harness 就能解决"；支持 UnivEdge 把力气放在**判据与锚点**而非编排 |

**可移植性判定**：
- 协议对齐（头号失败类）→ **已覆盖，不吸收**（见对照 #2 的更正；仅登记"文献复现类任务可复用该核对清单"这一推广，零新增条款）；
- "打磨不可作质量代理" → **内核**（§5.2 一条说明，**不新增检查项**——它是评分口径的措辞约束，属规范类；判分器偏差另有 B3-1 族处理）；
- 50 分锚定 + 隐藏目标协议 → **领域资产**（复现任务模板）；
- 成本弱相关 → **调研文档记录**，作 docs/15 档位升级的限定条件。

## 直引

1. "50 means the model recovered the target result, and scores above 50 indicate discoveries beyond existing work."
2. "the strongest autonomous agent, Claude Code, averages 21.5 … with an LLM frontier mean of only 26.5"
3. "agents gradually depart from the target paper in protocol, key evidence, or mechanistic interpretation"
4. "the central challenge is not producing a polished report, but recovering rubric-critical scientific evidence."
5. "agent analysis often stops at the most direct observable trend while missing the finer verification steps and physical modeling"
6. "current scoring mainly targets the final report rather than fine-grained research steps."

## 卡片自评（误差预算）

- U1：判分器为 GPT-5.1（LLM-judge），其偏差（位置/冗长/κ 虚高）未在本文校正 → 分数**只作量级**，不引为阈值（与 docs/17 §1.2 一致）；
- U2：40 任务/10 学科的样本量对"物理"仅约 4 任务，领域结论（Qwen 领先 Physics）**不可外推**到"物理 agent 普遍能力"；
- U3：全部分数为 2026-06 快照，模型换代即过期。
