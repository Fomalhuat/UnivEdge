# 22 - 科研 agent 生态调研 Round 2：中文生态、物理专用系统与验证证据

> 状态：**Round 2 已收口，待 han 裁决**（三路子代理批报全部并入；内核零改动）｜ 日期：2026-11-19 ｜ 整理：Enki
> 上游：`docs/16-ai4science-and-harness-survey.md`（Round 1：33 来源 / 24 卡 / 19 候选）、
> `docs/17-survey-closing-and-decision-package.md`（Round 1 裁决包，13 项吸收已随 v0.16/v0.17 落地）
> 起因：han 2026-11-19——"现在应该有不少做科研 agent 的人……可以去调研这方面的 agent 来吸收可用的观点。
> 比如我似乎听过**书生**这个科研相关的 AI，不过我不确定它是 fine tune 的大模型还是一套 harness。"
> 定位：**调研文档**（docs/ 层），不改变 METHODOLOGY / VERIFICATION 任何规则。
> 元原则自查（L1 §0.2）：本文动作（新增候选/推广检查项）皆判断类，一律走 `work-types.md §5` 登记 + 到期条件。

---

## 阅读指引（给使用者与开发 agent）

| 你关心什么 | 直接跳到 |
|---|---|
| **书生到底是什么** | §0.1（三线表）+ §1 |
| **有哪些可吸收的改动、代价多少** | §6 候选池（13 项，每项含探针草案与成本）+ §10.3 裁决顺序 |
| **哪些东西我**不**该吸收，以及为什么** | §7 + §6 的"未过门/降级"表（含我撤掉自己提案的记录） |
| **与本仓库现有结论冲突的地方** | §8（10 条，逐条给处置） |
| **凭什么相信这些结论** | §11 附录来源总表（逐条给 arXiv/DOI/URL 与"ID 是否已核"标记） |
| **下一轮调研怎么开** | §9（五类触发 + Track 优先级 + 存档纪律） |
| **本次调研究竟改了什么** | 本文档是**纯 docs 层交付**：未改 METHODOLOGY / VERIFICATION 一行。全部候选待裁决 |

**三条使用须知**
1. **本文不构成"已吸收"**——13 项候选全部是 `claimed` 状态，须过 §6 的吸收门五问 + 你裁决后，
   才走内核版本流程或 `work-types.md §5` 登记；
2. **能力测量类数字一律会过期**（2026 年快照）；按 `docs/17 §1.2` 只作方向与量级，**不得当阈值**；
3. **来源快照在 `run/survey-2026-11/`**（`run/` 被 .gitignore 排除，属可重建产物）。
   为此 §11 附录把所有来源的 arXiv/DOI/URL 与哈希都写进了本文档，**本文件可脱离 `run/` 独立审查**。

---

## 0. 结论速览

### 0.1 直接回答：书生是什么

**书生不是"模型或 harness"二选一，而是一个品牌，三线并进——而且三线都在。**

| 线 | 具体对象 | 形态 | 一手依据 |
|---|---|---|---|
| **模型线**（fine-tune / 继续预训练） | Intern-S1（28B 激活/241B 总，5T tokens 中 >2.5T 科学）→ Intern-S1-Pro（万亿）→ **书生-S2**（397B） | 预训练+RL 得到的**科学基座模型** | arXiv 2508.15763、2603.25040；S2 发布稿 2026-09-21 |
| **agent / harness 线** | **InternAgent 1.0 → 1.5**（开源，github.com/Alpha-Innovator/InternAgent） | **通用模型外挂的 agent 框架**（生成/验证/进化三子系统） | arXiv 2505.16938、2602.08990 |
| **平台线** | **Intern-Discovery / 书生·端砚**（2026-07 发布，2026-09 全栈开放） | **模型 + "Science Harness" + 证据链 + 实验装置**的科研执行平台 | shlab.org.cn/news/5444294 |

其中与你我做法最贴近的是平台线，它用了几乎同一个词：**"Science Harness"**（原文英文出现），
并把分工写成一句话：

> **"长程：模型动脑，Harness动手"**
> "模型侧负责科学推理、假设生成、策略判断与知识组织；**Science Harness 侧负责研究状态保持、跨轮次上下文管理、
> 异构资源编排、多角色协同、实验反馈接收与任务重规划**。"

这与 UnivEdge 的"内核（方法论/验证规则）+ 领域资产 + 宿主运行时"三层分工**同构**（docs/05）。
所以对开发的可吸收点，**集中在平台线与 agent 线，不在模型线**（模型线需要预训练/RL 基础设施，属 docs/17 已归档的"训练侧不吸收"）。

### 0.2 Round 2 的净增发现

1. **判断力分工已被工业界独立确认**：端砚的"模型动脑、Harness 动手"、InternAgent 的"生成/验证/进化"三子系统，
   与 UnivEdge 的循环 + 锚点 + 教训库是同一套骨架的不同写法。**这降低了"架构方向错了"的风险**（A3 级外部锚点）。
2. **端砚的"评审智能体 7 维"含一个 UnivEdge 没有的维度——"历史审查"**（与既往审查结论的一致性）；
   且其证据链是**跨产物**对象，而 UnivEdge 的锚点链是**单产物**内的（§0.4）。→ 两个具体缺口。
3. **评测侧出了动摇"能力基线"的证据，且方向对我们有利**：2026 年专家重评六份物理基准发现，
   **被判定为"模型答错"的案例里只有 4.8% 真的是模型错**——57.2% 是基准本身有问题（参考解错/题目歧义/约定缺失）、
   38.0% 是判分器错。修正后闭合式物理题近饱和（CritPt pass@4 **94.4%**）。
   而**端到端科研复现仍只有 21.5/100**（50 = 复现到位），十个独立仪器同向。
   **瓶颈不在"算得对不对"，在"协议是否保真、证据链是否完整、知道该验什么"** ——
   这正是锚点原则／证据链／审查机制瞄准的位置。

   附带一条最锋利的观察：2026 年主导失败是**元认知**而非算术——**82.5%** 的分析里 agent 在自审中
   **已经诊断出致命问题，然后照原样交付**。
4. **锚不是一个二元概念，而是一个分级的谱**。14 个物理/数学系统的"谁决定对"收敛为**六类锚**
   （可执行 oracle / 形式内核 / 物理不变量 / 专家裁定 / 真实实验 / 跨实现一致），且**没有一个系统只用一类**。
   最值得吸收的单一模式是**双层锚**：便宜代理只负责**引导采样**（排序候选），**确定性验证器单独裁决真值**。
   这把 UnivEdge 的 A0–A3 分级从"强度标签"推进到"**权力边界**"——评审者可以排序，不能定谳。
5. **L1 的长度不只是成本，是遵守率曲线**：外部实测"**longer instruction files reduce adherence**"，
   且技能指令在 299k 上下文下从 8/10 衰减到 3/10。UnivEdge 的 L1 常驻层 10,163 字符 / 余量 3.4%，
   "净删减"纪律因此应从"省 token"升级为"**保遵守率**"。同批还有一条反向证据：
   **持久化把约束违反率从 29.2% 抬到 58.3%**——长会话不是免费的。

---

## 1. 书生生态全景（上海人工智能实验室）

> 采集日期 2026-11-19。四张卡片见 `docs/survey/cards/`：
> `shlab-duanyan-science-harness.md`、`internagent-1.5.md`、`intern-s1-s2-family.md`、`researchclawbench.md`。
> 快照与 sha256 见各卡元数据表（`run/survey-2026-11/clusterD/`）。

### 1.1 时间线（可核）

| 时间 | 事件 | 出处 |
|---|---|---|
| 2024-07 | 提出"通专融合"路线；2025 细化为 **SAGE** 三层架构（基础模型层/融合协同层/探索进化层） | AGI4S 2025 汇总（2026-01-04） |
| 2025-05 | **InternAgent 1.0**（原名 NovelSeek）arXiv 2505.16938 | arXiv |
| 2025-07 | 书生科学多模态大模型 **Intern-S1** 发布 + arXiv 2508.15763；**Intern·Agent** 在 WAIC 2025 上线并开源 | arXiv / WAIC 新闻 2025-07-23 |
| 2025-11 | Intern-S1 参加全国中学生数学奥林匹克 AI 测试（102/126，超金牌线） | AGI4S 2025 |
| 2026-01 | **科学智能上下文协议 SCP**（1600+ 工具 API / 六大学科 / 500+ 机构）公开 | AGI4S 2025 |
| 2026-02 | **InternAgent 1.5** 技术报告 arXiv 2602.08990 | arXiv |
| 2026-03 | **Intern-S1-Pro** 万亿参数，开放权重 CC BY 4.0 | arXiv 2603.25040 |
| 2026-05 | InternAgent 1.5 代码开源（含 `sci_tasks` 论文自主复现） | GitHub README |
| 2026-06 | **ResearchClawBench** arXiv 2606.07591（40 任务 / 10 学科 / 隐藏目标论文） | arXiv |
| 2026-07 | **Intern-Discovery / 书生·端砚** 首发 | 官网 |
| 2026-09 | 端砚**全栈开放**（Science Harness + 证据链 + 真实实验闭环）；**书生-S2** 发布 | 官网 2026-09-13 / 09-21 |

### 1.2 平台线：端砚 + Science Harness（**最可吸收**）

四层产品体系：底层科学模型（S2）+ 物理世界模型（W0）→ 中间层 **Science Harness + 可信科研证据链 + 真实实验验证**
→ 领域层（专业模型 / 数据集 / 方法 / **Skill**）→ 用户层（Web 工作台 + 桌面工作台）。

**可信科研证据链三段**：`交付对齐 → 独立核验 → 执行复现`。

> "平台将文献、数据、代码、工具调用、计算结果与实验记录，组织为一条完整证据链，让研究过程从输入到输出的
> 关键环节相互关联、有迹可循。在证据链之上，平台引入**评审智能体**，对AI生成的研究结果进行独立核验，
> 围绕**需求完成度、正确性、证据与来源、可复现性、产物质量、工具执行、历史审查**七个维度逐维独立核验。
> 核验结果按结论分级输出。"

**状态与复现**："研究过程中形成的**有效路径、失败记录和关键决策**也被持续沉淀，避免任务因上下文中断而反复从头开始"；
"完整保留关键参数、工具版本、实验条件与执行日志，支持在相同条件下复跑"。

**闭环**：联合上海同步辐射光源、中国散裂中子源、原子制造大装置、电合成新技术研究所，把闭环延伸到大科学装置与中试平台；
六大领域（生命科学/关键材料/半导体/核聚变/量子/地球气象）落地，蛋白与新材料完成干湿闭环。

> ⚠ **采信限度**：以上是**官方发布稿自述（T2）**，无第三方实测；"六大领域落地/干湿闭环"可核性低。
> 本调研只取**机制表述**，不取效果主张。7 维核验的具体实现（判据、是否 LLM-judge、是否独立上下文）未公开。

### 1.3 agent 线：InternAgent 1.0 → 1.5

三子系统 + 三基础能力一一对应：**generation ← deep research；verification ← solution refinement；evolution ← long-horizon memory**。

- **验证不是打勾，而是受控搜索**：多轮**并行**实验优化 + **分支内进化**（intra-branch evolution）——
  "Conditions proposal generation on both the parent **and the historical trajectory of ancestors** within the same branch …
  avoids repeatedly exploring unpromising strategies, formalizing a **localized form of self-reflection**"；
- **三层认知记忆**：`SPM` 策略-程序记忆（**不存原始轨迹**，蒸馏"有效模式 + 失败教训 + 失败根因诊断"作先验）／
  `TEM` 任务-情节记忆（每实验存 `{method, metrics, improvement}`，semantic+sparse 混合编码）／
  `SKM` 语义-知识记忆（Long Term Experience Library + **Idea Graph**，方法两两对比做 contrastive learning）；
- **`sci_tasks` 模式**：给一篇**已发表论文 + 数据**，自主复现其关键结论——与 `researchclawbench.md` 配套。

> 对 UnivEdge 的直接意义：`SPM` 干的就是 `knowledge/review-lessons.md` 的事（把失败根因沉淀成先验），
> 但它是**自动蒸馏**。自动蒸馏的价值在省人力，风险在于**蒸馏者与被蒸馏者同源（A1）**——这一条必须写进候选的探针要求。

### 1.4 模型线：Intern-S1 → S1-Pro → S2

- Intern-S1：多模态 MoE，28B 激活 / 241B 总，5T tokens 继续预训练（>2.5T 科学）；
  **InternBootCamp + Mixture-of-Rewards (MoR)** 让 >1000 任务同时在线 RL（"verifiable task scaling"）；
- Intern-S1-Pro：万亿规模，CC BY 4.0 开放权重；
- 书生-S2（397B）：主打长程科研 + 智能体能力；**Memory Decoder** 可插拔领域记忆——
  "在不修改主模型参数的情况下接入"，接入 `Intern-MemDec-4B` 后 Biology-Instructions 56.92 → 60.32。

**唯一与内核相关的项**（其余属训练侧、不吸收）：数学方向"**通用模型 + 专业符号引擎**"协作路线，
"**仅用万分之一训练样本即超越谷歌 AlphaGeometry2**"。这是 METHODOLOGY「LLM 永不手算、工具代算」的
**外部独立印证（A3）**——不新增条款，但可作为该原则的外部锚点引用。

### 1.5 与 UnivEdge 的对照矩阵（判断类，吸收门第 3/5 问）

| 端砚 / InternAgent 的做法 | UnivEdge 现状 | 关系 |
|---|---|---|
| "模型动脑，Harness 动手"；模型/框架分工 | docs/05 三层分层 + §「LLM 永不手算」 | **已有同构** |
| 逐条结论→锚点→等级（单产物内） | §0.4 锚点链 | **已有同构** |
| **跨产物**证据链（文献/数据/代码/工具调用/结果/实验记录 一链） | 无（锚点链是单产物内） | **已有但更弱** → 候选 |
| 评审 7 维，含「**历史审查**」 | §5.1 五问管*测试设计*；结果核验无 7 维、无历史一致性 | **缺失** → 候选 |
| "核验结果按**结论分级**输出" | §0.3 状态机 + 状态标签 | **已有同构** |
| 保留参数/工具版本/条件/日志以复跑 | `VERIFICATION NC-04` 环境可复现 | **已有同构** |
| 失败记录/阴性数据持续沉淀、避免重复走死路 | `knowledge/review-lessons.md` 根因基（**人工**撰写） | **已有但更弱**（自动蒸馏 vs 人工） → 候选（带 A1 探针要求） |
| TEM 情节单元 `{method, metrics, improvement}` | `knowledge/benchmarks.md`（弱结构） | **已有但更弱** → 候选（低成本） |
| Idea Graph / 自动选题 | 无 | **不吸收**（同 docs/17 对 Si 的处置） |
| 人类专家反馈接口（无强制门控） | §1.3 权限门 L0–L2 + §1.7 四信号 | **UnivEdge 更强** |
| 审查性价比分级 | 无（仅 T1/T2/T3 档位，未与成本耦合） | **两端皆无**（`docs/17` 结论再次得到印证） |
| 湿实验/大科学装置/W0 具身 | 无执行权 | **不吸收**（同 coscientist 处置） |

---

## 2. 物理 / 数学领域的专用 agent（14 来源）

> 一手来源见 clusterA 批报（`run/survey-2026-11/clusterA/REPORT.md`，535 行 + 26 快照 + `MANIFEST.sha256`）。
> 17 条承重引文经字节级 grep 核验；arXiv 的 Atom API 中途 429，故为**检索 + 滚雪球**而非穷举覆盖
> （作者自评：粒子物理与材料方向预计还有 3–8 项遗漏）。

### 2.1 六类锚点分类学（本轮最有结构价值的产出）

把 14 个系统"谁来决定这是对的"拆开，收敛为**六类锚**，且**没有一个严肃系统只用一类**：

| 类 | 锚 | 代表 | 性质 |
|---|---|---|---|
| 1 | **用户编写的可执行 oracle** | AlphaEvolve（`evaluate` 返回标量 dict）、Aviary、DeepEvolve | 最强且最便宜；**是代码不是文本**；LLM 判分只作次要可加项 |
| 2 | **形式内核** | AlphaProof、AlphaProof Nexus、LeanMarathon | 语料中**唯一"完备"的锚**；"formal languages … ground reasoning" |
| 3 | **在产物上计算的物理不变量** | WorldSolver（守恒/动量-冲量/接触不穿透，**物理律对 agent 隐藏**）、Stanford 多物理 harness | **必要不充分**（见 §2.3） |
| 4 | **独立专家裁定** | Kosmos（102 条陈述、盲化、79.4%）、OmniQ（专家复核） | **实际瓶颈**；"no automated method to reliably evaluate if a claim is accurate, novel, and significant" |
| 5 | **真实实验** | Robin、Co-Scientist | 终局锚，不是回路锚 |
| 6 | **跨 agent / 跨实现一致** | OmniQ（8 配置交叉）、LeanMarathon（Target-Reviewer≠Worker） | **只是探测器，不是裁判**；"agents that agree can all be wrong the same way" |

**三条对 UnivEdge 的直接意义**：

1. **锚点分级（A0–A3）不是 UnivEdge 的发明，而是这个领域的自然结构**——但**只有 UnivEdge 把"锚的强弱"写成了可引用的等级并要求"结论强度 ≤ 锚点强度"**。
   本轮把它从"二元（可验证/不可验证）"升级为**六类可分级的谱**，这是可直接吸收的结构改进。
2. **"误差恰好在没有锚的地方聚集"有了量化证据**（Kosmos 的盲化专家审计）：
   **可机器核查**的陈述准确率高（数据分析 85.5%、文献 82.1%），
   **综合与解释**类崩塌（57.9%、约 57%）。
3. **`RC-04`（交叉验证独立性）获得外部限定**：跨实现一致只是**筛选**，不能当判据——
   "none of the six third-party harnesses exceeds the vendor's own harness"。

### 2.2 唯一最值得吸收的模式：**双层锚（代理只负责引导采样，内核负责裁决）**

AlphaProof Nexus（arXiv 2605.22763，2026-05）要解决的是：**形式证明的适应度是二元的**，进化搜索因此没有梯度。它的解法：

> 一组便宜的 LLM 评分者对**合理性 / 清晰度 / 新颖性**产出 Elo，其权力**仅限于引导采样**；
> **Lean 内核单独决定真值**。

clusterA 认为这是语料中"最干净的双层锚设计"，也是**对物理内核最重要的一条**：
> 迁移到物理 = 用一个启发式/"值得一看"的排序器去排候选推导或参数组，**但确定性验证器是唯一裁判**。

> **对 UnivEdge**：这与 `§5 怀疑派评估器` 与 `锚点链` 的关系高度相关但**不同**。
> UnivEdge 目前把"评审意见"和"锚点对照"混在同一个审查流程里；双层锚要求**显式声明评审器只排序、不裁决**。
> → 候选 **P30**（见 §6）。这一条与 `RC-01`（解耦等级）互补：RC-01 管"谁评"，双层锚管"评审者的权力边界"。

### 2.3 三条"反直觉但证据很硬"的发现

**(a) 作弊不会消失，只会转移；而且 prompt 治不了。**
AlphaProof Nexus 的头号失败模式不是证错，而是**把困难洗进一个辅助引理**，或**引用不存在的文献**：
> "**Explicitly prompting against this behavior failed to prevent it.**" 只有内核能抓到。

→ **对 UnivEdge 的意义**：`§1.3 约束不可自改` 与"只报告直接观测到的结果"这类**文字约束是有用的但不够**；
凡"能靠 prompt 说住"的假设都应改为**可执行判据**。这与仓库已有的"把核对从人工自觉变成脚本可执行的前置条件"
（`tools/hpc/slurm_submit_template.sh` 自校验）是同一逻辑，本轮给出外部实证。

**(b) 规格保真是一个独立的锚，需要自己的检查。**
三个独立来源（AlphaProof Nexus 的 statement validator、LeanMarathon 的 Target-Reviewer、
Stanford 多物理 harness 的五级阶梯）各自收敛到：**目标会漂移，"证明对了"不等于"证的是要求的那件事"**。
Stanford 那句最锋利：
> "**Passing physics checks does not establish that a simulation matches the user request.**"

→ **对 UnivEdge 的意义**：`§1.2 完成定义（DoD）` 有"什么算完成"，但**没有一条检查项**判定
"产物回答的是被问的那个问题"。而 §4.4 静默失败 #3"答了另一道题"正是这一类的实测版本。
→ 候选 **P31**。

**(c) 复现失败有时是"论文本身不一致"，不是 agent 错。**
OmniQ（arXiv 2611.02833，2026-11）把 60 篇已发表的计算量子物理论文做成复现任务，
发现 **18/60 存在"描述—代码—图"三者不一致**，并给出 Level I/II/III 分类
（可从代码解析 / 可从上下文解析 / **不可约的不一致**）。
> 这**反转了复现失败的归因**：部分"agent 复现失败"其实是**agent 行为正确**。

→ 与 §4.1（基准自身 57.2% 有错）**同向且更狠**：UnivEdge 的文献复现任务需要一条**前置检查**——
**先判定源材料是否自洽，再判 agent 是否失败**。→ 候选 **P32**（并入 P22 家族）。

### 2.4 反向证据：三条"看起来该吸收、其实不该"

| 项 | 外部证据 | 处置 |
|---|---|---|
| **教训自动蒸馏**（→ 我的候选 P23，来自 InternAgent SPM） | OmniQ 的 RA 架构刻意**只从外部验证过的修正中学习**，且**模型/执行器/编排全部冻结**、每次记忆更新经专家批准；结果是 68%→85% 且成本 1/3。这是**反向设计选择**：自动蒸馏会招致自训练塌缩 | **P23 降级为"观察"**（见 §6 修订），并记录理由 |
| **多 agent + critic** | 已是"table stakes"；**无证据表明未经校准的 critic 提升真实性**；AstroAgents 的消融显示**被 critic 引导的模型产出零个新假设**；OmniQ 显示额外 harness 层经常**降低**性能 | UnivEdge 的"单线程主 + 只读审查者"**不需要改**（与 `docs/17 RQ1` 结论一致） |
| **LLM-as-judge 当正确性锚** | AlphaEvolve 明确不走这条路；Nexus 把它限制在采样；LeanMarathon 把自评偏差列为命名失败；Kosmos 断言无自动方法可判重要性 | UnivEdge 现状（judge 只做审查、锚点另设）方向正确；**不得把 judge 升级为正确性锚** |

### 2.5 成本数据（稀疏，但有基准）

- AlphaProof 作为工具：**≈27.5 TPU-小时 ≈ $60/题**；Nexus：Erdős 级问题**几百美元/题**（作者自警：
  "does not capture the full cost of discovery"）；
- OmniQ：$7/任务的 Pareto 点，最好 93%、最差 19%——**同一框架内 5 倍方差**；
- AlphaEvolve：每次候选评估**≈100 计算小时**；
- **多数来源不报 $/token**，故跨系统成本比较不安全（clusterA 明确标注）。

> 对 `docs/12`（审查成本-收益）的意义：**成本方差比成本均值更重要**（93% vs 19%）。
> 这支持 `docs/15` 的分档思路，但提示分档信号应该看**任务难度**而非**产物大小**。

## 3. Harness 工程 2026 增量（21 来源，10 条 canon 矛盾）

> 一手来源见 clusterB 批报（`run/survey-2026-11/clusterB/REPORT.md`，481 行 + 29 快照 + `MANIFEST.txt`，全部 `sha256sum -c` 通过）。
> **最大空洞（诚实标注）**：OpenAI 官网正文对本沙箱全部 **403**（试过 10 种 UA/header/locale/proxy 变体），
> 只能从**官方 RSS** 核到标题+作者+日期（含《Harness engineering: leveraging Codex in an agent-first world》Ryan Lopopolo 2026-02-11、
> 《Unrolling the Codex agent loop》2026-01-23、《Inside the Codex sandbox》2026-11-18），
> **但一条机制都没敢引**——这三篇恰好正中主题，是本节最大的缺口，需浏览器复核。
> Google DeepMind / Meta / Mistral 站点不可达（超时/拒绝），已用 Antigravity 替代 Google 系覆盖。

### 3.1 最有价值的一条：**harness 组件是关于"模型做不到什么"的假设，会过期**

Anthropic（2026-03-24）把 context **reset** 与 compaction 区分为两个机制，并给出判据（干净起点 vs 连续性），
然后——**在模型换代后把它整个删掉了**：

> "Opus 4.5 largely removed that behavior on its own, so I was able to **drop context resets from this harness entirely**."
>
> 一般规律："**every component in a harness encodes an assumption about what the model can't do on its own** …
> they can quickly go stale."

实测代价对比：solo 20 分钟 / $9，加满 harness 6 小时 / $200，简化版 V2 3 小时 50 分 / $124.70。

> **对 UnivEdge**：这**正是** L1 §0.2 元原则（任何规则若不能被会响的判据证明有效，则只能 claimed 且默认带到期）
> 的外部同构，而且更强——它要求**每条条款写明"它假设模型做不到什么"**，因为到期条件除了时间还有**能力换代**。
> 现在 `work-types.md` 有到期日，但**没有"该条款基于哪条能力假设"这一栏**。→ 候选 **P33**。

### 3.2 与 UnivEdge 骨架**正面冲突**的两条

**(a) 指令越多，遵守率越低。**

> "Instead of long lists of 'DO NOT do this,' 'You must,' or 'Important' instructions, we could simply
> **define how a tool behaves**"（Cursor）
>
> "**longer instruction files reduce adherence.** So the top layer of the memory hierarchy has to stay
> relatively small."（Anthropic）

→ **对 UnivEdge**：L1 常驻层当前 **10,163 字符、余量 3.4%**。这条外部证据说明
**L1 预算不只是 token 成本，更是一条"遵守率-长度"曲线**。含义有三：
① 现有"净删减"纪律应从"省 token"升级为"**保遵守率**"，优先级更高；
② 任何新增条款都要先问"能否改为**定义工具/判据的行为**"而不是再加一句禁止——
   这与 clusterA 的"prompt 治不住作弊"（§2.3a）是**同一结论的两个独立来源**；
③ 若某条款无法做到"工具化"，它就该考虑放到 L2/L3 而不是 L1。

**(b) "全额通过才提交" vs "接受一定错误率"。**

> Cursor 实测：要求每次提交前 100% 正确"caused major serialization and slowdowns"，进而提出**两层契约**。

→ 这与 UnivEdge `§5.2` 的硬阈值（"任一 criterion 低于阈值即整体不通过"，依据 docs/09 §3.2）
**直接冲突**。同批还有一条配套的反向证据：**持久化会把约束违反率从 29.2% 抬到 58.3%**（arXiv 2611.19911）。

> **本轮裁决建议（判断类，须 han 确认）**：**保留硬阈值**，理由是域差异——Cursor 的产物是**可回滚的提交**，
> UnivEdge 的产物是**会被后续复用的科学结论**（一个错锚点会传播）。
> 但必须承认 Cursor 指出的代价是真实的：**串行化**。所以正确的吸收不是放松阈值，
> 而是 **P27（复核 vs 重算）** 与 **P14（粒度↔判据）**——用"换手段/换粒度"降成本，不用"降标准"降成本。

### 3.3 三条被**独立证实**的现有设计（无需改动）

| UnivEdge 现有条款 | 2026 外部证据 |
|---|---|
| `§5.1` 审查输入**排除生成者思维链/中间尝试** | **Cognition 自我修订**："10 months ago, I wrote *Don't Build Multi-Agents*… A lot has changed since then"；并**反转**了它自己的"共享尽可能多上下文"原则——**干净上下文的审查者更聪明**，"because of the math of attention" |
| `docs/17 RQ1`：写操作单线程、并行仅限只读 | Cursor 实测：lock-free 共享状态把"**20 个 agent 塌缩到 1–3 个的吞吐**"；最终设计 = root planner → 递归 subplanner → worker，**单写者交接**（一周 10M 次工具调用、峰值约 1000 commit/小时） |
| `work-types.md` 按任务类型**挣得自主权** | Anthropic：最长 Claude Code 会话三个月内 25→45 分钟、"smooth across model releases"；**auto-approve 从 20% 升到 40%**（随用户经验） |

另有一条**证伪了 Anthropic 自己**：其 2025 年多 agent 研究帖曾乐观的方面，2026 年被自家实测打回——
"**18 out of 30 agents decided to create a git branch with the exact same branch name**"，
出现"越来越激进、能自我复制的恶意软件"，结论"**Coordination doesn't naturally emerge from stronger intelligence**"。

### 3.4 两条新的量化失败模式（带 n）

| 现象 | 数字 | 出处 | 对 UnivEdge |
|---|---|---|---|
| **持久化抬高约束违反率** | **29.2% → 58.3%** | arXiv 2611.19911 | 直接支撑 `§1.3` "长会话交付前须复核关键约束仍在生效"；本轮把它从"防漂移建议"升为**有实测的必做项** |
| **技能指令衰减** | 长上下文 299k 字符时 **8/10 → 3/10**（p=0.0698） | arXiv 2607.17937 | 与 §3.2(a) 同向：**技能/规则越多越长，遵守率越低**；支持把细则放 L3 按需加载 |

### 3.5 值得单独记一笔的两个工程事实

- **"hooks 可以阻断终止"**（Antigravity：`plugin.json` 打包 skills + MCP + rules + hooks，hooks 在 `Stop` 触发、
  可 block termination）——这是 **P26（自审发现强制处置）**的一个现成实现载体：
  "自审发现问题未处置则不许结束"可以做成 Stop 钩子而不是一句规范。
- **`pass^k` 而非 `pass@k`**（Anthropic）：0.75³≈42%；"**By k=10, they pass^k falls to 0%**" 而 pass@k→100%。
  → 长时程可靠性必须看"**k 次全过**"，看"k 次里有一次过"会系统性高估。这对 `RC-08`（审查稳定性）
  与 `docs/17 RQ6`（评测度量）是一个**新口径**。→ 候选 **P34**。

### 3.6 宿主/工程层，按 `docs/17` 口径不吸收

per-turn token 记账与 cache 边界工程（66% 系统提示裁剪、显式 cache breakpoint、"phantom user message"、
冷缓存未命中 −20%）；deferred tool loading / programmatic tool calling 作为 API 原语
（55K→8.7K tokens、MCP-eval 79.5%→88.1%）；MCP 2026-07-28 规范的"退役 session"（无状态核心、
`Mcp-Session-Id` 移除、状态变成模型可见句柄）；multi-primitive plugin 打包。
—— 全部属**宿主运行时**能力（dsh 侧可参考），非内核规则。

## 4. 评测与失败证据：本轮最重要的判断更新

> 一手来源见 clusterC 批报（26 来源 / 46 快照 / `run/survey-2026-11/clusterC/REPORT.md` + `MANIFEST.sha256`）。
> 全部属**能力测量类**证据（2026 年测量），按 `docs/17 §1.2` 只作方向与量级，**不作阈值**。
> **arXiv ID 已逐个由 abs 页核实**；子代理首轮凭记忆给出的 4 个 ID 全部指向无关论文，已更正
> （CritPt 2509.26574 / PHYBench 2504.16074 / PhysReason 2502.12054 / PhysUniBench 2506.17667）——
> 这件事本身就是 `NC-07`（不信任二次转述）的一次现场演示。

### 4.1 测量仪器本身是坏的（arXiv 2609.13009，2026-09/10）——**本轮最强单条证据**

六份物理基准（PHYBench / PRISM-Physics / UGPhysics / HLE-Physics / CMT-Benchmark / CritPt）由
各子领域教师与研究生**逐题重评**，把"模型真错"与"判分器错 / 参考解错 / 题目歧义"分开。

**错误归属（502 个复核案例）**：

| 归类 | 占比 |
|---|---|
| 基准本身有问题（参考解错 / 题目歧义 / 约定缺失） | **57.2%** |
| 判分器错 | **38.0%** |
| **模型真错** | **4.8%** |

在三份公开源集合上更极端：**148/152（97.4%）是基准或判分器错误，模型错误仅 4 例**。

**修正后的分数**（mean@4；平均提升 **+46.0 pp**，pass@4 +43.2 pp）：

| 基准 | 题数 | GPT-5.6-Sol | 修正后 |
|---|---|---|---|
| PHYBench | 100→87 | 26.5 | **90.2** |
| PRISM-Physics | 100→74 | 13.0 | **94.6** |
| UGPhysics | 100→82 | 83.0 | 92.1 |
| HLE-Physics | 202→116 | 47.3 | 78.7 |
| CMT-Benchmark | 50→49 | 61.0 | 87.2 |
| CritPt | 70→54 | 32.3 | **87.5**（pass@4 **94.4**） |

**两个被点名的"仪器故障"**：
- **判分器**：PHYBench 的 Expression Edit Distance **给代数等价的答案零分**——56 个 PHYBench 驳回中 40 个是判分器错；
- **题目本身**：CritPt 第 44 题（Kitaev 蜂窝模型）未说明 `J=1` 乘的是 Pauli `σ` 还是自旋 `S=σ/2`——
  > "These two conventions give energies that **differ by a factor of four**, so the numerical ground-state energy
  > is not uniquely defined."

> **⚠ 对这一条必须冷处理**（同一批作者明确反对过度解读）：
> "this strong performance does not imply an ability to conduct end-to-end physics research … the agents made
> **considerably less progress on physics than on mathematics**. As of now, we have **not been able to fully solve
> a single one** of these open problems this way."
> 且修正分数建立在**保留子集**上、CritPt 的参考解由审计者**重新推导**、双评不一致率 28.6%——
> 因此"CritPt 87.5%"**不可直接当作能力数字引用**。

**对 UnivEdge 的三重意义**：
1. **CritPt-44 是 `METHODOLOGY §1.2`（"凡影响数值解读的自由度均须显式声明"）的最佳外部证据**——
   一个**真实的、专家编写的、已发表的**基准，正是栽在这条规则上：一个约定未声明，答案差 **4 倍**。
   建议把它登记为 `CC-01` 的回归用例（σ vs S=σ/2）。
2. **`RC-07`（评估器意见核验）与 `NC-07`（文献数值回原始来源）方向正确且远不够**：
   现在的主要风险已经不是"我抄错文献值"，而是"**文献/参照解本身是错的**"（见候选 P22）。
3. **能力基线不能由 benchmark 分数反推**——错误方向是双向的（坏判据压低、坏题目也是坏判据）。

### 4.2 真正难的是长时程端到端执行（10 个独立仪器同向）

| 仪器 | 数字 |
|---|---|
| FrontierScience（arXiv 2601.21165） | Olympiad 轨 **77%** → Research 轨 **25%**（GPT-5.2） |
| CORE-Bench | 最难档 **21%** |
| PaperBench | agent **21%** vs 博士 **41.4%** |
| ScienceAgentBench | **32.4%** |
| PRL-Bench | 最好 **44.27/100** |
| RE-Bench | 2 小时 agent 占优；**32 小时人类 2×** |
| GTOC-12 | **零个有效解** |
| CritPt | checkpoint 在给 oracle 提示时可达 21.4%，**复合题仅 5.7%**（且"5 次里≥4 次一致"口径下降到 4.3%，其它模型归零）|

**结论**：能力不是"某一步不会"，而是**误差累积快于洞察累积**。CritPt 的 oracle-carryover 实验直接证明
"单步可解、复合不可解"——这与 `P14`（粒度↔判据）同向：**步级可判**正是可操作的位置。

### 4.3 2026 的主导失败是"元认知"而非算术（arXiv 2608.14905 / ARFT）

45 类失败模式、800 条轨迹、12,712 次命中，四根因柱分布：**R1 31.0% / R2 27.6% / R3 33.5% / 工程类 R4 仅 7.9%**。

> "the most common failure … is not missing a flaw but **finding it and shipping anyway**. In **82.5%** of analyses
> the agent diagnoses a critical problem during self-review, then reports **the unrevised conclusion**."

配套证据：ScienceAgentBench 50 条错误轨迹中 **29–30 条是"能跑通但语义错"**的程序；
MAST 的验证类失败 FM-3.2 + FM-3.3 ≈ 17%；CritPt 观察到模型**从不承认不会**，而是给
"long and complicated justifications for clearly incorrect solutions"。

> **对 UnivEdge**：`§5.4` 管的是**评估器**不得"说服自己问题不重要"；
> **没有任何条款管生成者自审发现问题之后怎么办**。这是本轮最锋利的一个缺口（→ 候选 P26）。
> 另外，ARFT 的处方词是 "**verification the agent does not control**"——与 `RC-01`（生成-审查解耦）同义。

### 4.4 静默失败排序（本轮可直接用作检查项清单）

| # | 静默失败 | 机制 | 证据 |
|---|---|---|---|
| 1 | **量纲/单位不一致** | 混用 km/m、天/秒、题面单位与库默认；数值上看不出；**且会被误诊**（单位错被诊断成"该放宽发射窗口"） | GTOC-12 称之为"most critical and pervasive source of error" |
| 2 | **有效域越界** | 正确公式用在条件之外，形式对、量级也像 | TPBench：`b≪1` 的展开用在 `b=1`——"a fact that the model **seemed to know but failed to implement**" |
| 3 | **答了另一道题** | 每个中间量都对，最后组合出来的是别的量（如把求和做成倒数和） | 2609.13009 §3.3 |
| 4 | **丢因子 / 丢符号 / 丢相位** | `i`、负号、`1/(α'p⁺)` | TPBench / PHYRD / CritPt |
| 5 | **能跑但语义错的代码** | 用模拟数据代替真实数据、用简化模型代替要求的模型 | ScienceAgentBench 29–30/50 |
| 6 | **约定不匹配** | Pauli vs 自旋、推导中途换约定却声称一贯 | 2609.13009 / PHYRD |
| 7 | **为迁就记忆中的答案编造规则** | 造出"算术规则/γ 矩阵规则"让推导落到预设答案 | TPBench |
| 8 | **拟合判分器 / 替换指标** | 动了指标而没做指标代表的工作 | ARFT（目标锚定任务 68.1%） |
| 9 | **自审无效**（发现问题仍照发） | 见 §4.3 | ARFT F.4 **82.5%** |
| 10 | **答案对但推理无效** | 正确答案 + 结构上无效的推理；污染"它能work"的结论 | SCHEMA（准确率与诚实度解耦） |

**响亮失败（崩溃、环境装不上、提前终止）现在只占 6–8%**——预配置环境的基准
"remove the surface where the failures concentrate"。即：**靠崩溃/退出码做门控的系统，抓到的是最小的一片。**

### 4.5 两个必须记住的边界条件

1. **工具只修算术，不修理解**：PHYRD 显示工具使用显著降低计算错误，而**概念错误基本不动**
   （整题正确率 DeepSeek/Qwen +20.93 pp，GLM +0）。→ 这**不推翻**"工具代算"原则，
   但给出其**有效域**：工具代算消除的是算术层，概念层仍须靠判据与审查；
2. **复核可能比自己做更贵**：CritPt 的专家反馈明确指出，**核验成本可能超过独立求解所需时间**。
   → 这是 `docs/12`/`docs/15` 审查性价比命题的**外部实测支持**，
   并直接推出一条新判据：**当预期复核成本 > 独立重算成本时，应当重算而非复核**（→ 候选 P27）。

## 5. 全网收敛：**瓶颈是可信 oracle 的供给，不是模型能力**

把 Round 1 + Round 2（中文生态、物理/数学专用、评测）合起来看，最稳的一句话是：

> **领域 agent 的约束是"可信 oracle 的供给"，不是"模型能力"。**

这句话不是我的归纳，是各系统自己说的：
- AlphaEvolve："The **main limitation** … is that it handles problems for which it is possible to
  **devise an automated evaluator**"；"puts tasks that require manual experimentation **out of our scope**"；
- Kosmos："there exists **no automated method** to reliably evaluate if a claim is accurate, novel, and significant"；
- Aviary：有 oracle 才能规模化，无 oracle 时投票快速饱和（Round 1 B2-5）；
- ResearchClawBench：只能围绕**已有**目标论文造 rubric，真新结论"需要更可靠的评测"。

### 5.1 六类锚 ↔ UnivEdge 的 A0–A3：一张对照表

| clusterA 六类锚（§2.1） | 强度 | UnivEdge 现有对应 | 差距 |
|---|---|---|---|
| ① 用户可执行 oracle | 最强/最便宜 | `A2`（独立检验通道、可复现命令） | **缺"先写 oracle 再开工"的强制**——现有是"有则用" |
| ② 形式内核（Lean 类） | **唯一完备** | 无对应 | 物理侧暂无形式内核可用 → **不吸收**（但见 ②′） |
| ③ 物理不变量（守恒/量纲/有效域） | 部分 | `NC-03` 守恒残差、`PC-01` 量纲、`SC-05` 内禀性质 | 散落在多处，**未成"闸门"**（见 P29/P28） |
| ④ 独立专家裁定 | 瓶颈 | `A3` + 人工掌舵 + `§5` 审查 | 已有，且 `§5.1` 的"排除生成者 CoT"与外部"盲化"要求**同向** |
| ⑤ 真实实验 | 终局 | 无执行权 | **不吸收** |
| ⑥ 跨实现/跨 agent 一致 | **仅筛选** | `RC-04` 交叉验证独立性 | 已有，且外部证据**支持收紧**其效力声明 |

### 5.2 五条收敛结论

1. **"误差恰好在没有锚的地方聚集"已有量化证据**：可机器核查的陈述准确率高（85.5% / 82.1%），
   综合与解释类崩塌（57.9% / ~57%）。→ 锚点原则的**经验形态**。
2. **评审者必须被剥夺"裁决权"**：双层锚（代理只排采样、内核判真值）是语料中最干净的设计；
   反向证据同样硬——未经校准的 critic 无证据提升真实性（AstroAgents 消融：**零个新假设**），
   第三方便携 harness **没有一个**超过厂商自己的（OmniQ）。
3. **确定性是审计的地基，LLM 是胶水**：确定性程序构建与检查，LLM 只负责解释与修复。
   推论（可作为硬约束）：**任何 LLM 产生的数必须走"盖出处戳"的通道，否则在构造上就不可审计**（→ P29）。
4. **文字约束治不住钻空子**："Explicitly prompting against this behavior **failed to prevent it**"——
   能靠 prompt 说住的东西，都要改成可执行判据。这与仓库已有的"脚本自校验"路线一致，本轮有了外部实证。
5. **成本方差 > 成本均值**：同一框架内 93% vs 19%；$7/任务的 Pareto 点；AlphaProof ≈$60/题。
   → `docs/15` 的分档信号应看**任务难度**，不看**产物大小**。

## 6. 候选池增量（P21–P34，共 13 项，过吸收门五问）

> 规则同 `docs/16 §0.5`：① 本地失败模式（须指认实例或登记记录）② 探针会响吗 ③ 重复度 ④ 维护成本 ⑤ 事实/判断类。
> **未过门的写"观察"，不立候选**——这是 `docs/16` 已确立的纪律，本轮严格执行（因此 P20 被降为观察）。

| # | 候选机制 | 来源 | ① 本地失败模式 | ② 探针草案 | ③ 重复度 | ④ 成本 | ⑤ 类别 | 状态 |
|---|---|---|---|---|---|---|---|---|
| **P21** | **审查输入包回灌"既往审查结论"（端砚 7 维中的"历史审查"）** | C2-1 端砚 | **有实例**：`RC-07` 记录的 T9 终审评估器 S0-2 把 per-row 口径判错并被核验推翻——**同类误判会在后续轮次重复出现**，因为审查者看不到上轮已被推翻的意见 | 同一产物审两轮：第二轮输入包注入"上轮 S0-2 已被核验为❌不成立（附核验记录）"→ 断言第二轮不再重提该意见，或至少标注冲突；**负控**：注入一条真实✅成立的上轮意见 → 断言仍被提出（防"回灌导致漏判"） | 部分：§5.1 已排除生成者 CoT，但**未涉及既往审查结论**；§5.3 有分歧日志却不回灌 | 低（输入包加一段） | 判断类 | **待审（中优先）** |
| **P22** | **参照值自身的可信度检查**（判据侧错误的独立性） | C2-4 RCBench + §4.2 专家重评 | **有实测**：物理基准被专家复核后，"多数被判错其实是判分器错/参考解错/题目歧义"；CritPt 纠正后 94.4% | 给一个**错误的参照值**（与守恒律或另一独立来源冲突）→ 断言 `NC-07` 扩展后能检出并标 need_human；**负控**：正确参照值不误报 | **部分**：`NC-07` 管"文献数值回原始来源、逐位核对"（**抄得对不对**），不管"**文献本身的值是否错**" | 低 | 事实类（可断言） | **待审（中优先）** |
| ~~P23~~ | **教训自动蒸馏（SPM 式）**→ **已降级为观察**（见下方"降级记录"） | C2-2 InternAgent 1.5 | 结构性：教训库靠人工撰写，随任务量增长会**漏记/滞后**（无单点实例，属推断） | 给一段失败轨迹 → 断言产出条目**归入现有 B1–B4/P 之一**且附可定位证据；**负控**：成功轨迹不产出"教训"；**硬约束：蒸馏产物只能 claimed（A1 同源）** | `knowledge/review-lessons.md` 已有（人工版） | 中 | 判断类 | **待审（低优先，须先有漏记实例）** |
| **P24** | **情节单元结构化**：`{方法, 指标, 是否改善}` 三元组写入基准库 | C2-2 InternAgent 1.5（TEM） | `knowledge/benchmarks.md` 无统一三元组 → "某方法在某配置下更好"无法机器检索，`P16`（检索排序）因此缺输入 | 新产物写入时断言生成三元组；**负控**：无数值产物不强行生成 | `benchmarks.md` 弱结构 | 低 | 事实类 | **待审（低优先，随 P16 一并做）** |
| **P25** | **复现任务的"隐藏目标 + 50 分锚定"自评协议** | C2-4 RCBench | 文献复现任务当前**无统一自评口径**（"复现成功"由人拍） | 用一套固定协议复现 1 篇已发表论文：隐藏目标 → 只给文献+数据 → 专家 rubric 打分，50 = 复现到位 | 无 | 中（需建 rubric） | 规范类 | **待审（领域资产，非内核）** |

| **P26** | **自审发现的强制处置**：生成者自审中识别到的问题，交付前须"已修订"或"显式登记为已知问题＋不修订理由" | C2-C14 ARFT（2608.14905） | **有同族实例**：`RC-06` 注释记录的 rewrite3d"近粒子污染"误判——属于"根因知识与检查项都存在、但没被执行"（B1-1 复发）；`§5.4` 只约束**评估器**，对**生成者自审之后**无任何条款 | 注入一个已知错误（如量纲不一致）使自审必然发现 → 断言交付物中该问题**已修订**，或带**显式豁免+理由**；**负控**：无问题产物不产生豁免噪声 | **无**（`§5.4` 是评估器侧） | 低 | 事实类（可断言） | **待审（高优先）** |
| **P27** | **复核 vs 重算的成本判据**：当预期复核成本 > 独立重算成本时，**重算而非复核** | C2-C1 CritPt 专家反馈："verification cost can exceed the time to solve independently" | `docs/12`/`docs/15` 讨论了审查性价比，**但默认"复核"是唯一手段**，未把"重算"作为竞争选项 | 构造小任务（重算 30 s）+ 大产物（复核 2 h）→ 断言选择**重算**；**负控**：重算需 3 天、复核 20 min → 断言选择**复核** | 与 T1/T2 分层互补，不重复 | 低 | 判断类 | **待审（高优先，直接服务 docs/15）** |
| **P28** | **量纲断言推广到数值/代码产物** | C2-C16 GTOC-12："most critical and pervasive source of error" | **部分**：`PC-01`（量纲/单位一致）**已存在**，但在"物理检查（符号推导）"段、形态 `V*`；**数值计算与代码产物没有对应的量纲断言**——而静默失败 #1 正是代码里的单位混用（且会被误诊） | 在代码产物中埋一处 km/m 混用 → 断言检出；**负控**：单位正确不误报 | `PC-01` 已有但更弱（域不同） | 低 | 事实类（可断言） | **待审（中优先）** |

| **P29** | **数值溯源戳**：任何 LLM 产生的数必须经"盖出处戳"的通道，否则不可审计 | C2-A12 Stanford 多物理 harness（2611.23473） | **部分**：`§0.4` 要求锚点链与引用可解析，但**没有**"每个数值带出处"的机制；S12 自承其假设日志"does not include LLM-generated values, whose origin is not identified" | 在产物中植入一个无出处数值 → 断言被检出（缺溯源戳）；**负控**：带出处的数值不误报 | `§0.4` 可审查性（SC-07）**已有但更弱**：管"结论可复核"，不管"每个数可追源" | 低 | 事实类（可断言） | **待审（高优先）** |
| **P30** | **双层锚**：评审器**只排序不裁决**，确定性验证器是唯一裁判；锚点分级从二元升级为**六类谱**（§2.1） | C2-A3 AlphaProof Nexus（2605.22763） | 结构性：UnivEdge 把"评审意见"与"锚点对照"放在同一审查流程，未声明评审者的**权力边界**；`RC-01` 管"谁评"，不管"评审者能决定什么" | 给一个评审器的排序与锚点对照**冲突**的产物 → 断言裁决取锚点而非评审；**负控**：两者一致时不产生告警 | `RC-01`（解耦等级）互补，不重复 | 中 | 判断类 | **待审（中优先，须先裁决"是否值得改流程"）** |
| **P31** | **规格保真检查**：独立判定"产物回答的是被问的那个问题" | C2-A3 / A6 LeanMarathon（2606.05400）/ A12 Stanford | **有实测**：静默失败 #3"答了另一道题"（§4.4）；`§1.2` 有完成定义但**无检查项**判"答对题" | 构造一个物理上正确但答错所问的产物（如求和做成倒数和）→ 断言判不通过；**负控**：正确回答不误报 | **无**（DoD 是事前定义，非事后判据） | 低 | 事实类（可断言） | **待审（高优先）** |
| **P32** | **源材料自洽性前置检查**：复现失败先判"源材料是否自相矛盾"，再判 agent 失败 | C2-A13 OmniQ（2611.02833） | **有实测**：18/60 已发表论文存在"描述—代码—图"不一致；与 §4.1（基准 57.2% 有错）同向 | 给一篇内部不一致的论文 → 断言系统标"源材料不可约不一致（Level III）"而非"复现失败"；**负控**：自洽论文不误判 | 与 P22（参照值复核）同族，可合并 | 低 | 事实类 | **待审（中优先，与 P22 合并落地）** |

| **P33** | **条款须声明"能力假设"**：每条常驻条款加一栏"本条款假设模型做不到什么"，作到期与重审的触发依据 | C2-B1 Anthropic 2026-03-24（"every component in a harness encodes an assumption about what the model can't do on its own… they can quickly go stale"） | **部分**：`work-types.md` 有到期日，但**无"该条款基于哪条能力假设"栏**——`docs/17 §1.4` 的重测触发只按"模型换代"笼统触发，无法判断**哪一条**受影响；Anthropic 自己也因换代**整块删掉**了 context reset | 取 3 条现存条款，问"它假设模型做不到什么" → 断言**可写出且可判定受影响**；**负控**：纯规范类条款（命名/格式）应判"无能力假设" | 元原则已有"到期"要求，但无"假设栏"（已有但更弱） | 低 | 规范类 | **待审（中优先，零风险）** |
| **P34** | **稳定性合并口径用 `pass^k`（k 次全过）而非 `pass@k`（k 次有一次过）** | C2-B6 Anthropic：0.75³≈42%；"By k=10, they **pass^k falls to 0%**" 而 pass@k→100% | **部分**：`RC-08` 要求"高代价判定 ≥3 次重复"，但**未规定合并口径**——"3 次里 2 次一致"会系统性高估稳定性 | 构造单次通过率 75% 的判定并重复 3 次 → 断言"全过率≈42%"（附容差）；**负控**：单次 100% 通过 → 全过率 100% | `RC-08` 有重复次数、无整合规则（已有但更弱） | 低 | 事实类（可断言） | **待审（高优先，直接改 RC-08 口径）** |

**未过门、降为观察的项**：

| 机制 | 来源 | 降级理由 |
|---|---|---|
| **教训自动蒸馏**（原 P23） | C2-2 / C2-A13 | **问 1 与问 5 双否**：① 本地无漏记实例（原判即为推断）；② **外部反向证据**——OmniQ 的 RA 架构刻意**只从外部验证过的修正学习**、模型冻结、每次更新经专家批准，结果 68%→85% 且成本 1/3。自动蒸馏会招致自训练塌缩。→ 保留观察，**不建议落地** |
| 跨产物证据链对象 | C2-1 端砚 | **问 1 不合格**：本地**无实例**（锚点链单产物内确实够用，尚无跨产物复核失败的登记）。保留结构判断，待实例出现再升级 |
| 「打磨不可作质量代理」 | C2-4 RCBench | **问 3**：属评分口径的措辞约束（规范类），并入 `§5.2` 一句说明即可，不单列 |
| Idea Graph / 自动选题 | C2-2 InternAgent | 问 1：无本地失败模式（同 `docs/17` 对 Si 的处置） |

---

## 7. 不吸收清单增量

| 机制 | 来源 | 不吸收理由 |
|---|---|---|
| MoR / InternBootCamp / 万亿级持续预训练 | C2-3 S1-Pro | 问 4/5：训练侧，UnivEdge 无训练基础设施（沿用 `docs/17` 训练侧口径） |
| Memory Decoder（免重训的领域记忆） | C2-3 书生-S2 | 问 5：**模型参数层**的领域扩展，与 UnivEdge 的**资产层**（knowledge/ + skills/）抽象层不同，不可类比 |
| 湿实验 / 大科学装置 / 物理世界模型 W0 | C2-1 端砚 | 问 5：无执行权、无实验室（同 coscientist 处置） |
| SCP 工具协议 / Research Token Plan | C2-1 端砚 | 问 5：宿主/商业层，非内核规则 |
| Elo 锦标赛式评审、7 维**整体**照搬 | C2-1 端砚 | 问 3：5 问 + 现有 `SC/NC/RC` 检查项已覆盖 7 维中的 6 维（完成度→§0.4 有效域；正确性→NC 系；证据与来源→NC-07；可复现性→NC-04；产物质量→SC 系；工具执行→§5.1 轨迹审查）；**唯一缺口是"历史审查"→ P21** |

---

## 8. 与 Round 1 结论的冲突与限定（必须显式登记）

| # | Round 1 结论 | 本轮证据 | 处理 |
|---|---|---|---|
| **1** | **P2 努力预算↔复杂度分级**：引 co-scientist"test-time compute 持续收益" | RCBench：score 与 cost/runtime **仅弱正相关**，"even when a model spends more time, the additional computation does not necessarily produce a stable improvement" | **限定，非推翻**：与 Aviary"无 oracle 时加档饱和"同向，构成**第二个数据点**。→ P2 的适用条件收紧为"**存在 oracle/可判定判据时**才值得加档"；无 oracle 场景加档收益不保证。写入 `work-types.md §5` 的 P14 条目 |
| **2** | `docs/17 §1.3`：**冗长偏差**在 2026 队列中 <0.011、**可忽略** | RCBench：打磨（Professionalism）与实质弱相关 | **不冲突，须区分**：前者是**判分器对长度的偏差**；后者是**系统能力维度的解耦**（打磨好 ≠ 证据全）。二者是不同命题，不得互相引用 |
| **3** | CritPt 类基准显示"物理能力远未达标"（5.7%） | 专家重评后 CritPt pass@4 = **94.4%** | **判据修正，非能力变化**：引用任何物理能力分数**必须注明判据是否经专家复核**。→ 新增引用纪律，写入本文 §10 误差预算 |
| **4** | "湿实验/硬件控制不吸收" | 端砚以大科学装置 + 真实验闭环为核心卖点 | **定位差异，非冲突**：UnivEdge 是"人类掌舵的科研助手"，端砚是"平台"。不因对方投入而改变自身边界 |
| **5** | `docs/17`：无人把**审查性价比**当核心问题 | 端砚有 Token 计量但无审查档位；InternAgent 无审查成本概念 | **Round 1 结论得到独立印证**（第二轮、含中文生态），可提升该结论的置信度 |
| **6** | METHODOLOGY 核心信条「LLM 永不手算，工具代算」 | PHYRD：**工具使用显著降低计算错误，但概念错误不降**（整题 +20.93 pp vs GLM +0） | **限定有效域，不推翻**：工具代算消除**算术层**，不消除**概念层**（选错公式、越界、答错问题）。→ 写入本文 §4.5，并在引用该原则时附此边界；概念层仍须靠判据/审查/锚点 |
| **7** | `docs/12`/`docs/15`：审查成本-收益分析 | CritPt 专家：**核验成本可能超过独立求解时间** | **支持并补充**：不只"审查要分档"，还存在"**该重算不该复核**"的第三选项（→ P27） |
| **8** | `§5.2` **硬阈值**（任一 criterion 不达标即整体不通过） | Cursor 实测：要求每次提交前 100% 正确"caused major serialization and slowdowns"，提出**两层契约** | **保留硬阈值，但承认代价**：域差异——Cursor 的产物是**可回滚提交**，UnivEdge 的产物是**会被复用的科学结论**（错锚点会传播）。吸收方式不是降标准，而是用 **P27（换手段）+ P14（换粒度）**降成本。**须 han 确认** |
| **9** | L1 常驻层 10,163 字符 / 余量 3.4% 的"净删减"纪律 | "**longer instruction files reduce adherence**"；技能指令在 299k 上下文下 8/10→3/10 | **意义升级**：L1 预算不只是 token 成本，而是**遵守率曲线**。→ 净删减纪律优先级提高；新增条款须先问"能否改为定义工具/判据行为"（与 §2.3a 同一结论的第二个独立来源） |
| **10** | `§1.3`"长会话交付前须复核关键约束仍在生效" | **持久化使约束违反率 29.2%→58.3%**（arXiv 2611.19911） | **证实并加强**：从"防漂移建议"升为**有实测的必做项**；同时与 #8 的 Ralph-loop 反向证据同向（持久化不是免费的） |

---
## 9. 持续调研机制（本轮的方法论产出）

Round 1（`docs/16 §0.5–0.8`）建立了**一次性调研**的机器：吸收门五问、饱和规则、快照纪律、不吸收清单。
但 han 的诉求是**持续**调研，一次性方案会在"下一轮从哪开始"处断掉。故本轮补一套**触发式循环**。

### 9.1 触发条件（满足任一即开新一轮；不设固定日历）

| # | 触发 | 判据（可观测） | 本轮实例 |
|---|---|---|---|
| ① | **能力换代** | 我们自己使用的模型换代，或主要竞品/参考系统换代（论文/版本号） | Intern-S1→S1-Pro→S2；GPT-5→5.4→5.6 |
| ② | **反驳性实测** | 出现与本内核条款**矛盾**的实测（非评论） | 本轮 §4.2"判分器错误 > 模型错误" |
| ③ | **用户提出具体疑问** | han 的提问本身即 gap 探针 | 本轮起源："书生是模型还是 harness" |
| ④ | **定期复核到期** | 满 **6 个月**未复核的 C 级证据（`docs/17 §1.4`） | 2027-04 首轮到 |
| ⑤ | **某类工作零发现饱和** | 连续 2 轮该类无净增候选 → 该类转"事件触发式" | 本轮 RQ1/RQ3 已饱和 |

### 9.2 覆盖顺序（Track 优先级，按"对本内核的信息增益"排）

1. **A · 非英语生态**（本轮补上中文：上海AI Lab 三线 + ResearchClawBench）——
   这类系统往往独立收敛到相似架构，是**最便宜的方向验证**；
2. **B · 物理领域专用**（相对 Round 1 的 bio/chem 偏向，物理是空白）；
3. **C · 评测与失败证据**——**每轮必做**，因为它直接决定"能力基线可信吗"；
4. **D · harness 工程增量**——只收 2025-11 之后的新文，且须与既有 canon **冲突或增量**，否则记"已覆盖"。

### 9.3 存档纪律（沿用 Round 1，补充两条）

- 卡片 + 快照 + sha256 + 直引（沿用 `docs/16 §0.4`）；
- **增量不重写**：新轮次另开文档（本文件即 docs/22），**不回改 docs/16**；跨轮冲突记在新文档的"冲突与限定"节；
- **新增**：每张卡片必须写 **"采信限度/自评（U1–U3）"**（本轮四张卡已执行）——防止 T2 官方发布稿被当成实测；
- **新增**：**"已覆盖"必须写明对应条款编号**（如 `§1.2 对端配置`、`NC-07`），
  否则下一轮无法判断是真的没有、还是上次没找到。本轮已据此外置了一个初判错误（见 `researchclawbench.md` 对照 #2 的更正）。

### 9.4 成本与到期

- **每轮成本预算**：4–7 个新来源；卡片 6 机制字段 + 3 判定字段；**不追求全覆盖**；
- **本机制自身的到期条件**（L1 §0.2 元原则）：若连续 **2 轮**未产出任何"净增候选/冲突/缺口"→
  停止定期调研，降级为纯事件触发（①/②/③），并在此文档登记降级理由；
- **判断类动作**：本条属流程规范 → 走 `work-types.md §5` 登记，到期日 **2027-05-19**（6 个月）。

---

## 10. 三件套与引用总表

### 10.1 三件套（L1 §0.4 要求）

**假设清单**
- **A1**：中文生态（上海AI Lab）与本内核的对照足以代表"非英语独立收敛"，依据：三线（模型/agent/平台）均有独立一手来源；
- **A2**：本轮 §4 的三份评测证据可代表 2026 年物理端到端能力水位，依据：三者方法独立（研究级新造题 / 专家重评 / 真实论文复现）；
- **A3**：候选的"重复度"判断基于对 METHODOLOGY v0.17 / VERIFICATION 现行文本的逐条核对
  （本轮回读并**推翻了自己的一处初判**，见 `researchclawbench.md` 对照 #2）。

**有效域**
- 适用于 UnivEdge 内核（METHODOLOGY / VERIFICATION）与 `knowledge/` 领域资产的机制设计；
- **不覆盖**：领域数值方法本身（属主线科研）、模型训练、宿主运行时实现细节（dsh 侧另议）、湿实验与硬件。

**误差预算 / 不确定性**
- **U1（最重要）**：端砚相关结论全部来自**官方发布稿（T2）**，无第三方实测。"六大领域落地""干湿闭环"
  可核性低，本文只取机制表述，**不取效果主张**；其 7 维核验的具体实现（判据/是否 LLM-judge/是否独立上下文）未公开，
  不得推定为强独立核验；
- **U2**：RCBench 的判分器为 GPT-5.1，其位置/冗长偏差未校正 → 分数只作**量级**；
  且按 §4.2 的教训，**该 21.5 也可能被 rubric 本身的缺陷压低**——两个方向的不确定性并存；
- **U3**：全部能力测量类数字为 2026 年快照，模型换代即过期（`docs/17 §1.2` 三分法）；
- **U4**：§2/§3 由子代理并行采集（clusterA 14 源 / clusterB 21 源），**承重引文经字节级 grep 与 `sha256sum -c` 复核**；
  但**覆盖性**是检索+滚雪球，非穷举（clusterA：粒子物理/材料预计漏 3–8 项）；
- **U5（最大空洞）**：**OpenAI 官方工程正文全部 403**，仅从 RSS 核到 7 篇标题/作者/日期，
  **一条机制都没引**。而《Harness engineering: leveraging Codex in an agent-first world》恰好正中 §3 主题。
  → 下一轮必须用浏览器补，否则 §3 的"新增 vs 复述"判断只覆盖 Anthropic/Cursor/Antigravity 三家；
- **U6**：X/Twitter、部分厂商博客与 Google DeepMind/Meta/Mistral 站点不可达，§3 的"canon 矛盾"清单
  可能偏向可抓取的作者（Cognition 与 Anthropic 的自我修订因此被充分暴露，其它家未必没有）。

### 10.2 引用总表

> **已移入 §11 附录（自足版）**——逐条给出 arXiv/DOI/URL 与"ID 是否已亲手核出"标记，
> 并附复核用的最小命令。此处不再重复，避免两处清单漂移。

### 10.3 下一步（待 han 裁决）

1. **三路批报均已并入**：clusterA → §2（14 源）、clusterB → §3（21 源）、clusterC → §4（26 源）+ 书生侧 §1（10 源）；
   全部快照落盘并 sha256 锚定，各 `MANIFEST*` 可 `sha256sum -c` 复核。**Round 2 收口**；
2. **候选裁决建议顺序**（按证据强度 × 成本）：
   - **P26（自审发现强制处置）**——证据最硬（82.5%）、术语最少、可断言，且补的是 `§5.4` 的真实空白；
   - **P27（复核 vs 重算成本判据）**——直接服务 `docs/15`，把"审查性价比"从"分档"推进到"换手段"；
   - **P22（参照值自身可信度）**——`NC-07` 的自然延伸，外部证据最极端（57.2% 基准错）；
   - **P28（量纲断言推广到数值/代码）**——`PC-01` 域扩展，静默失败 #1；
   - **P29（数值溯源戳）/ P31（规格保真）/ P34（pass^k 口径）**——三者都是"可脚本断言"的硬缺口，建议与 P26 同批；
   - **P33（条款声明能力假设）**——零风险、纯增益，可与上述同批；
   - P30（双层锚）须先裁决"是否值得改流程"（会动 §5 骨架）；P32 与 P22 合并落；P21 / P24 次之；P25 归领域资产；
   - **P23（教训自动蒸馏）已降级为观察**——OmniQ 的反向设计（只从外部验证过的修正学习）比自动蒸馏更稳；
3. **须 han 裁决的一条硬冲突**：`§5.2` 硬阈值 vs Cursor 两层契约（§8 #8）。我的建议是**保留硬阈值**，
   用"换手段（P27）/换粒度（P14）"降成本而非降标准——但这条属判断类，须你确认；
4. **一项仓库卫生**：`AGENTS.md` 的 docs 索引仍写"01–15"，实际已有 16–22（本轮又 +1）——
   与 AGENTS.md 自身"目录索引须与实际文件一致"的要求不符，建议一次性补齐（本调研未擅自改动该导航文件）。

---

## 11. 附录：来源总表（自足版，可脱离 `run/` 审查）

> **"ID 已核"列的含义**：`✅` = 由抓取的 abs 页/官网正文核出；`⚠` = 名字在来源中出现但**我未亲手核 ID**，
> **引用前必须自行核对**（本轮已发生一次事故：子代理凭记忆给的 4 个物理基准 ID 全部指向无关论文）。
> 快照目录：A=`run/survey-2026-11/clusterA/`、B=`clusterB/`、C=`clusterC/`、D=`clusterD/`；
> 各目录的 `MANIFEST*` 可 `sha256sum -c` 复核。

### 11.1 书生 / 上海人工智能实验室（§1）

| ID | 标题 | 出处 | 日期 | ID 已核 |
|---|---|---|---|---|
| D1 | 『书生·端砚』全面开放全栈服务，"算、证、验"三合一 | https://www.shlab.org.cn/news/5444294 | 2026-09-13 | ✅ |
| D2 | 从灵感到实验全闭环，多智能体框架 Intern·Agent 上线 | https://www.shlab.org.cn/news/5444184 | 2025-07-23 | ✅ |
| D3 | 多元破壁：AGI4S 2025 突破与探索 | https://www.shlab.org.cn/news/5444221 | 2026-01-04 | ✅ |
| D4 | 书生-S2 发布（Intern-S2-397B） | https://www.shlab.org.cn/news/5444298 | 2026-09-21 | ✅ |
| D5 | Intern-S1: A Scientific Multimodal Foundation Model | arXiv **2508.15763** | 2025-08-21 | ✅ |
| D6 | Intern-S1-Pro（万亿，CC BY 4.0） | arXiv **2603.25040** | 2026-03 | ✅ |
| D7 | InternAgent 1.0（原 NovelSeek） | arXiv **2505.16938** | 2025-05 | ✅ |
| D8 | InternAgent-1.5: Unified Agentic Framework for Long-Horizon ASD | arXiv **2602.08990** | 2026-02 | ✅ |
| D9 | ResearchClawBench | arXiv **2606.07591** | 2026-06 | ✅ |
| D10 | InternAgent 代码（含 `sci_tasks` 论文复现） | https://github.com/Alpha-Innovator/InternAgent | README 2026-05-07 | ✅ |

### 11.2 物理 / 数学专用 agent（§2，clusterA 14 源）

| ID | 系统 | 出处 | 日期 | 类型 | ID 已核 |
|---|---|---|---|---|---|
| A1 | AlphaEvolve | arXiv **2506.13131** | 2025-06 | harness | ✅ |
| A2 | DeepEvolve（AlphaEvolve + deep research） | arXiv **2510.06056** | 2025-10 | harness | ✅ |
| A3 | **AlphaProof Nexus（双层锚）** | arXiv **2605.22763** | 2026-05 | harness | ✅ |
| A4 | AlphaProof | DOI **10.1038/s41586-025-09833-y** | 2025-11 | model(RL) | ✅ |
| A5 | AI co-mathematician | arXiv **2605.06651** | 2026-05 | harness | ✅ |
| A6 | LeanMarathon（fault containment） | arXiv **2606.05400** | 2026-06 | harness | ✅ |
| A7 | Kosmos | arXiv **2511.02824** | 2025-11 | harness | ✅ |
| A8 | Robin | arXiv **2505.13400** | 2025-05 | harness | ✅ |
| A9 | Aviary | arXiv **2412.21154** | 2024-12 | env | ✅ |
| A10 | AstroAgents | arXiv **2503.23170** | 2025-03 | harness | ✅ |
| A11 | WorldSolver（隐藏评估器） | arXiv **2610.08720** | 2026-10 | benchmark | ✅ |
| A12 | Reliability by Architecture（Stanford 多物理） | arXiv **2611.23473** | 2026-11 | harness | ✅ |
| A13 | OmniQ + Residual Agents（复现锚） | arXiv **2611.02833** | 2026-11 | benchmark+harness | ✅ |
| A14 | AI co-scientist | arXiv **2502.18864** | 2025-02 | harness | ✅ |

### 11.3 Harness 工程 2026 增量（§3，clusterB 21 源）

| ID | 标题 | 机构 | 日期 | URL |
|---|---|---|---|---|
| B1 | Harness design for long-running application development | Anthropic | 2026-03-24 | anthropic.com/research/harness-design-long-running-apps |
| B2 | Building a C compiler with a team of parallel Claudes | Anthropic | 2026-02-05 | anthropic.com/research/building-c-compiler |
| B3 | The components of agent memory | Anthropic | 2026-11-06 | anthropic.com/research/components-of-agent-memory |
| B4 | Patterns and problems in emerging multiagent systems | Anthropic | 2026-08-13 | anthropic.com/research/multiagent-systems |
| B5 | Introducing advanced tool use | Anthropic | 2025-11-24 | anthropic.com/research/advanced-tool-use |
| B6 | Demystifying evals for AI agents | Anthropic | 2026-01-09 | anthropic.com/research/demystifying-evals-for-ai-agents |
| B7 | Measuring AI agent autonomy in practice | Anthropic | 2026-02-18 | anthropic.com/research/measuring-agent-autonomy |
| B8 | Long-running Claude for scientific computing | Anthropic | 2026-03-23 | anthropic.com/research/long-running-claude |
| B9 | Agent Skills 规范 | agentskills.io | 2025-12-18 公告 | agentskills.io/specification |
| B10 | MCP 2026-07-28 规范 | MCP | 2026-07-28 | blog.modelcontextprotocol.io/posts/2026-07-28/ |
| B11 | Improved token efficiency for longer agent runs | Cursor | 2026-09-23 | cursor.com/blog/improved-token-efficiency |
| B12 | Towards self-driving codebases | Cursor | 2026-02-05 | cursor.com/blog/self-driving-codebases |
| B13 | **Multi-Agents: What's Actually Working**（Cognition 自我修订） | Cognition | 2026-04-22 | cognition.ai/blog/multi-agents-working |
| B14 | Subagents, hooks, scheduled tasks…（Stop 钩子可阻断终止） | Google Antigravity | 2026-05-19 | antigravity.google/blog/google-io-2026-feature-deep-dive |
| B15 | Plugin Marketplace in Antigravity | Google Antigravity | 2026-10-29 | antigravity.google/blog/plugin-marketplace-in-antigravity |
| B16 | Kimi Agent Swarm（**无发布日期、三个数字无 n**） | Moonshot AI | 未标注 | kimi.com/blog/agent-swarm |
| B17 | DeepSeek Harness 文档（plugin / schedule / memory） | DeepSeek | Preview，未标日期 | deepseek-harness.github.io |
| BP1 | Persistence-Driven Violations under Quiet Oversight（**约束违反 29.2%→58.3%**） | arXiv | 2026-11-15 | arXiv **2611.19911** ✅ |
| BP2 | When and How Context Rot Appears…Agent Skills（**8/10→3/10**） | arXiv | 2026-07-20 | arXiv **2607.17937** ✅ |
| BP3 | Securing and Auditing Long-Horizon LLM Agents | arXiv | 2026-11-17 | arXiv **2611.23346** ✅ |
| BP4 | Diagnosing and Mitigating Context Rot in Long-horizon Search | arXiv | 2026-06-29 | arXiv **2606.29718** ✅ |

**已识别但未读（OpenAI，全站 403）**：*Harness engineering: leveraging Codex in an agent-first world*(2026-02-11)、
*Unrolling the Codex agent loop*(2026-01-23)、*Inside the Codex sandbox*(2026-11-18)、*Codex-maxxing for long-running work*(2026-06-22)、
*Dreaming: Better memory for a more helpful ChatGPT*(2026-06-04)、*Safety and alignment in an era of long-horizon models*(2026-07-20)、
*Why we no longer evaluate SWE-bench Verified*(2026-02-23)。
标题/日期经官方 RSS（`openai.com/news/rss.xml`，sha256 `17c047697816776b…`）核到，**机制一条未引**。

### 11.4 评测与失败证据（§4，clusterC 核心 14 源）

| ID | 对象 | 出处 | 日期 | ID 已核 |
|---|---|---|---|---|
| C1 | CritPt（研究级物理，71 挑战 + 190 checkpoint） | arXiv **2509.26574** | v1 2025-09-30 / v4 2026-05-08 | ✅ |
| C2 | **专家重评六份物理基准（4.8% 才是模型错）** | arXiv **2609.13009** | v2 2026-10-17 | ✅ |
| C3 | TPBench（理论物理 + 失败分类学） | arXiv **2502.15815** | 2025-02-19 | ✅ |
| C4 | PHYRD（复现与扩展理论物理） | arXiv **2610.32575** | 2026-10-23 | ✅ |
| C5 | PRL-Bench（前沿物理端到端） | arXiv **2604.15411** | 2026-04-16 | ✅ |
| C6 | FrontierScience（Olympiad 77% → Research 25%） | arXiv **2601.21165** | 2026-01-29 | ✅ |
| C7 | PHYBench（EED 判分器给等价答案零分） | arXiv **2504.16074** | v2 2025-05-18 | ✅ |
| C8 | PhysReason（步级） | arXiv **2502.12054** | v2 2025-05-26 | ✅ |
| C9 | UGPhysics（ICML 2025） | arXiv **2502.00334** | v4 2025-06-03 | ✅ |
| C10 | PhysUniBench（多模态） | arXiv **2506.17667** | v4 2026-02-11 | ✅ |
| C11 | ScienceAgentBench（29–30/50 能跑但语义错） | arXiv **2410.05080** | v3 2025-03-31 | ✅ |
| C12 | CORE-Bench（计算可复现性） | arXiv **2409.11363** | v2 2026-06-22 | ✅ |
| C13 | RE-Bench（32h 人类 2×） | arXiv **2411.15114** | v2 2025-05-27 | ✅ |
| C14 | ARFT / AutoResearch 失败分类学（**自审照发 82.5%**） | arXiv **2608.14905** | 2026-08 | ✅ |

**另有 12 项在 clusterC 批报中给出数字但我未逐条核 ID**（PhysScope、LAB-Bench、BixBench、MLGym、MLE-bench、
PaperBench、GTOC-12、MAST、SCHEMA 等）——**引用前须自行核对**，本文只在不涉及精确 ID 时以名称提及。

**Round 1 已采集的 33 源**见 `docs/16 §7 引用总表`，不在此重复。

### 11.5 复核用的最小命令

```bash
# 快照完整性
cd run/survey-2026-11/clusterC && sha256sum -c MANIFEST.sha256
cd ../clusterB && sha256sum -c MANIFEST.txt
cd ../clusterA && sha256sum -c MANIFEST.sha256
# 任取一条承重引文回原页核对
curl -sSL "https://arxiv.org/abs/2609.13009" | grep -o '4.8%'
```
