# 16 - AI for Science 系统与 Harness 设计调研（方案 v0.1）

> 状态：**调研完成并收口**——五批 + 2026 时效抽查（Batch 6）已完成；裁决包见  
> `docs/17-survey-closing-and-decision-package.md` ｜ 日期：2026-10-19 ｜ 整理：Enki  
> han 确认记录（2026-10-16）：起点 = 先 Track B 收口；深度 = 标准卡 + 高价值加档；  
> 节奏 = 每批批报后等确认；开始时机 = 本轮确认后立即开始。  
> 起因：han 2026-10-16——"为了尽可能完善 UnivEdge，有必要更广泛地调研 AI for science 的相关论文  
> 和 harness 设计，看看有什么能够吸收借鉴的地方"。  
> 定位：本文是**调研文档**（docs/ 层），不改变 METHODOLOGY / VERIFICATION 任何规则。  
> 与 docs/09、docs/12 的关系：09（审查触发判据）、12（审查成本-收益）分别收口了特定问题面；  
> 本调研面向**更宽的机制设计面**（任务分解 / 验证架构 / 上下文工程 / 人机分工 / 失败模式 / 评测），  
> 并负责**收口 09 的遗留项**（§0.9）。  
> **元原则自查（v0.13 §0.2）**：本方案自身是判断类动作——带到期条件（§0.8），若连续 2 批无产出即重审。

---

## 0. 调研方案

### 0.1 目标与吸收口径

**目标**：从 AI4Science 系统（论文/代码）与 agent harness 工程（官方文/代码）中提取**可移植的设计思想**，  
经"吸收门"（§0.5）筛选后，转化为 UnivEdge 内核候选改动或明确的"不吸收"记录。

**吸收口径（三层过滤）**：

1. **只取机制不取结论**——提取"他们怎么设计分工/验证/记忆/门控"，不关心其领域结果  
   （如某个化学配方），除非结果本身是验证机制的锚点案例；
2. **可移植性优先**——优先提取与领域解耦、可入内核的机制（对照 docs/05 分层：  
   内核 / 领域资产 / 宿主运行时）；依赖其特定模型或云服务的机制降级标注；
3. **证据可核**——一切引文附快照或可定位出处（arXiv ID / DOI / commit / URL + 访问日期 + sha256），  
   教训来自 docs/12 F4：无快照来源=不可核=只能 claimed。

### 0.2 调研问题（RQ，全部映射到 UnivEdge 决策面）

| RQ  | 问题                                                               | 映射的 UnivEdge 现状                                | 已知待决问题（调研可能直接回答）                    |
| --- | ---------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| RQ1 | **任务分解与角色架构**：把科研/构建任务切成什么单元？planner / executor / verifier 如何分工？ | METHODOLOGY §1.2 契约、§3.5 阶段分解；docs/12 §3.2     | 工作单元粒度是否合理                          |
| RQ2 | **验证与锚定**：怎么设计 verifier？何时全量重推 vs 抽验？机械检查与语义检查如何分工？              | §0.2 锚点原则、§0.4 锚点链、§5 怀疑派评估器；docs/15 T0/T1/T2  | **docs/15 待决 ①（档位自动升级信号）**；T1/T2 边界 |
| RQ3 | **上下文与记忆工程**：长任务中如何压缩/重置/交接？什么是"可记忆"的？                           | 渐进披露 L0–L3；§1.6 产物存储                           | handoff 工件的最优形态                     |
| RQ4 | **人机分工与门控**：人类介入点放在哪里？什么动作需要批准？                                  | §1.3 权限门 L0–L2；§1.7 四信号                        | 权限门分级是否过粗/过细                        |
| RQ5 | **失败模式与死因**：AI 科研系统真实失败案例、错误分类学、事后复盘                             | knowledge/review-lessons 根因基（B1–B4）；docs/07 复盘 | 根因基是否缺维度；新失败模式                      |
| RQ6 | **评测与度量**：怎么度量"科研助手有效"？命中率/漏审率之外还有什么                             | docs/12 双向指标；work-types.md 毕业计数                | **docs/15 待决 ②（4 项数据）**；指标设计        |

> 每个 RQ 在调研中维护一张"饱和表"：新来源不再带来新机制 → 该 RQ 停止扩源（§0.8）。

### 0.3 来源分层与选择标准

| 层             | 来源类型                                                          | 用途              | 一手性要求                |
| ------------- | ------------------------------------------------------------- | --------------- | -------------------- |
| **T1 系统论文**   | 有完整 harness 描述的 AI4Science 系统（Nature/Science/arXiv 主论文）       | RQ1/RQ2/RQ4/RQ5 | 必须原文（PDF/arXiv），禁止转述 |
| **T2 官方工程文档** | Anthropic / OpenAI / Google / DeepMind / Cognition 等工程博客与官方指南 | RQ2/RQ3/RQ6     | 必须官方原文 + 快照          |
| **T3 代码与仓库**  | 开源 agent 框架/科学 agent 的**实际代码**（不只是 README）                    | RQ1/RQ3         | 必须 commit 级引用        |
| **T4 实证与批判**  | 复现研究、批判文章、评测基准论文、事后复盘                                         | RQ5/RQ6         | 原文；批判类须双向（见下）        |
| **T5 综述（引路）** | AI4Science agent / harness 综述                                 | 只用于发现来源         | **仅作路标，不入卡片**        |

**选择标准**（记入卡片元数据）：

- 时间窗：~~2023-01 起~~ → **v0.2 修订（2026-10-19，据时效审计）**：**2025 起优先**；  
  2023–2024 仅用于**机制类**结论（结构性、跨模型成立），其**能力测量类**数字只作方向、不作阈值；  
  该缺陷由 han 的质询暴露，记录在案（见 `docs/17 §1.4`）；
- 必须能回答至少 1 个 RQ，且提供**可用机制**（而非仅"我们用 GPT-4 + 某框架做了 X"）；
- **双向性**（吸取 evals 教训：单向优化危险）：成功系统与**失败/批判**研究保持大致 2:1 的比例，  
  专门检索 AI4Science 的失败案例与负面复现；
- 排除：纯模型能力 benchmark（无 harness 信息）、营销稿、二手转述（只作路标）。

### 0.4 提取协议（每来源一张卡片）

固定 schema（约 12 字段，模板见 §3）：

```
元数据：标题 / 出处（arXiv ID｜DOI｜URL）/ 年份 / 领域 / 一手性等级 / 获取日期 / 快照路径+sha256
机制提取：
  ① 任务分解与角色架构     ② 验证/审查机制（执行者、判据、触发、全量 vs 抽验）
  ③ 上下文/记忆策略        ④ 人工介入点
  ⑤ 报告的成本/规模数据（若有实测值）  ⑥ 失败模式与自述局限
对照与判定：
  ⑦ 与 UnivEdge 现有条款的对照（已有同构 / 已有但更弱 / 缺失 / 冲突）——**逐条标注对应条款编号**
  ⑧ 可移植性判定（内核 / 领域资产 / 宿主 / 不适用 + 理由）
  ⑨ 直引 3–5 条（原文关键句，供核验）
```

**约束**：卡片的 ⑦/⑧ 是判断，属 claimed，须附推理；①–⑥ 是事实，须可溯源。

### 0.5 吸收门（全程最关键）

调研产出**不是建议清单**，而是**带探针的登记条目草案**。任何"吸收"必须过五问（对应 v0.13 元原则）：

| # | 问题                                  | 不合格的处置                                 |
| - | ----------------------------------- | -------------------------------------- |
| 1 | 它解决哪个**已观测到**的失败模式？（须指认实例或登记记录）     | 归入"不吸收（无本地失败对应）"，记录理由                  |
| 2 | 能否写出一个**会响的探针**（取自真实运行路径、破坏式验证会失败）？ | 只能作为 claimed 观察，不得入内核                  |
| 3 | 与现有条款的重复度？（已有同构 → 不吸收，登记"已覆盖"）      | 重复即不吸收——**"已覆盖"是正面结论**                 |
| 4 | 维护成本：常驻（每次会话）还是按需（L3）？加剧 L1 预算吗？    | 超预算者降级为按需资产或放弃                         |
| 5 | 类别：事实类 / 判断类？（v0.13 §0.2 分类义务）      | 判断类 → 必须走 `work-types.md §5` 登记（含到期条件） |

**落地流程**：调研卡片 → 候选池（本文档 §4）→ han 裁决 → 内核版本流程（或 work-types §5 登记）。  
**一律不动内核**：本调研期间 METHODOLOGY / VERIFICATION 零改动。

### 0.6 分批与评审节奏

- **批次**：每批 4–5 个来源（同 RQ 或同轨道聚集）；每批结束出**批报**（半页：新机制 / 新冲突 / 新饱和）；
- **中期评审**：每批批报交 han 确认后进入下一批（对应 han 的阶段性评审偏好）；
- **总量目标**：T1–T4 合计约 **18–25 个来源**（初始种子见 §2，执行中雪球式增补）；
- **子代理使用**：单批检索与初筛可交独立 sub-agent 并行（节省主上下文），  
  但**卡片 ⑦⑧⑨ 由主 agent 亲验**（对照内核条款的判断不可外包给未读内核的上下文）。

### 0.7 交付物

| 文件                                             | 内容                                       |
| ---------------------------------------------- | ---------------------------------------- |
| `docs/16-ai4science-and-harness-survey.md`（本文） | 方案 + 批报累积 + RQ 横向对照 + 候选池 + 不吸收清单 + 引用总表 |
| `docs/survey/cards/<slug>.md`                  | 每来源一张提取卡片（§0.4 schema）                   |
| `run/survey/sources/<slug>.*`                  | 来源快照（HTML/PDF），不入 git；卡片记录路径 + sha256    |

### 0.8 本方案自身的到期条件（元原则自查）

- 若**连续 2 批**未产出任何"可登记候选"或"冲突/缺失发现" → 暂停，重审方案（防调研膨胀）；
- 若某 RQ 连续 **3 个来源**不带来新机制（饱和）→ 该 RQ 停止扩源；
- 方案 v0.1 有效期：自确认起 **5 批**内；期满按实际产出续期或收口。

### 0.9 对既有调研的收口与去重

1. **docs/09 遗留项收口**：09 §7 注记——Anthropic《Effective harnesses for long-running agents》  
   未获一手原文（当时二手转述、未引为判据）→ **本次 Track B 第一批必须补一手核实**；
2. **不重复面**：docs/09 已核的来源（harness design 文、Demystifying evals、Claude Code hooks/subagents、  
   OpenAI guardrails/evals）不再重复取卡；如需引用直接引 09；
3. **新增面**：09/12 未覆盖的——AI4Science 系统架构（Track A 主体）、judge/verifier 可靠性实证  
   （T4）、记忆/经验学习（RQ3）、长任务能力度量（RQ6）、以及 AI4Science 失败案例（RQ5）。

### 0.10 三件套（本方案）

- **假设清单**：A1 优质机制主要存在于 T1/T2/T3 一手来源中，综述仅供引路；A2 吸收门五问能拦住  
  "看起来好但无本地对应失败模式"的机制（依据：10-12 教训——判断类动作无门槛则机制只增不减）；  
  A3 18–25 个来源足以覆盖 6 个 RQ（依据：docs/09 用 ~16 来源收口单一 RQ 面，本次每 RQ 面更宽但更浅）；
- **有效域**：适用于 UnivEdge 内核与领域资产的机制设计；不覆盖：模型能力本身的提升、  
  领域数值方法（属主线科研）、宿主运行时实现细节（dsh 侧另议）；
- **误差预算/不确定性**：U1 卡片 ⑦⑧ 的判断可能受"已有同构"识别能力限制（漏判重复 → 重复吸收）；  
  U2 快照可得性（付费墙/动态页面）可能导致少量来源降级为"部分可核"；  
  U3 "不吸收"清单的价值依赖归档纪律——不归档则下次重复调研（缓解：统一入本文 §5）。

---

## 1. 执行清单（首批任务）

- [ ] han 确认本方案（含 §2 种子表决：增 / 删 / 改）
- [x] **Batch 1 已完成（2026-10-16）**：5 来源 / 6 材料（4 篇文章 + SWE-agent 代码级 + mini 反数据）；  
  卡片 5 张、快照 11 份；批报见 §6（含 docs/09 遗留项收口）。**待 han 确认后启动 Batch 2**
- [x] **Batch 2 已完成（2026-10-16）**：7 来源（AI Scientist / Google Co-Scientist / Coscientist /  
  Virtual Lab / Aviary + Anthropic managed-agents / human-agent-teams）；卡片 7 张、快照 15 份；  
  批报见 §6。**发现 3 处种子清单更正**（Virtual Lab 载体、Aviary 机构、arXiv ID 误记——见 §2）。  
  **待 han 确认后启动 Batch 3**
- [x] **Batch 3 已完成（2026-10-18）**：4 卡 / 5 论文（MT-Bench judge + Fair Evaluator 合并；  
  self-correct 局限；Prover-Verifier Games；process supervision）；快照 10 份；批报见 §6。  
  直接产出 P12/P13/P14（全部服务 docs/15 T1/T2 待决①）。**待确认后启动 Batch 4**
- [x] **Batch 4 已完成（2026-10-18）**：4 卡 / 6 论文（Voyager；Reflexion+ExpeL 合并；MemGPT+Generative  
  Agents 合并；METR）；快照 12 份；批报见 §6。**唯一新增候选 P16（经验/文献检索排序）**；  
  Batch 5（RQ5 失败案例）为收口前最后一批
- [x] **Batch 5 已完成（2026-10-19）**：4 卡 / 5 论文（Beel 独立评估；Si + Ideation-Execution Gap 合并；  
  MAST 失败分类学；CORE-Bench）；快照 10 份；批报见 §6。新增 P17/P18，P19 并入 B4 子标签，  
  P14 修订（终态为主 + 中间检查点补漏）。**待确认后进入收口**
- [ ] 收口：RQ 横向对照表 + 候选池过吸收门 + 不吸收清单 → han 裁决

> 批次内容可在执行中按饱和规则调整；每批结束即出批报（§0.6）。

---

## 2. 初始种子清单（待确认，执行中雪球补充）

> 标注：🟢=计划入卡 ｜ 🔵=备选（视数量与饱和） ｜ ⚪=仅路标（不入卡）

### Track A — AI4Science 系统

| 来源                                                                                            | 关注 RQ       | 标注                                 |
| --------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| The AI Scientist（Sakana，arXiv 2408.06292）及 v2 与批判性复现                                          | RQ1/RQ5/RQ6 | ✅ **B2-1 已采集**（仅 v1；批判复现留 Batch 5） |
| Google AI co-scientist（arXiv 2502.18864）                                                      | RQ1/RQ2/RQ4 | ✅ **B2-2 已采集**                     |
| Coscientist（Boiko et al., Nature 624, 570, 2023；**开放获取**）                                     | RQ1/RQ2/RQ4 | ✅ **B2-3 已采集**                     |
| The Virtual Lab——**更正：载体为 bioRxiv 10.1101/2024.11.11.623004（原记 arXiv 2411.10109 有误，那是另一篇论文）** | RQ1/RQ4/RQ5 | ✅ **B2-4 已采集**                     |
| Aviary——**更正：作者为 FutureHouse Inc.（原记 DeepMind 有误）**，arXiv 2412.21154                          | RQ1/RQ6     | ✅ **B2-5 已采集**                     |
| ChemCrow（arXiv 2304.05376）                                                                    | RQ1（工具化）    | 🔵                                 |
| FunSearch / AlphaEvolve（Nature 2024 / 2025）                                                   | RQ2（评估即搜索）  | 🔵                                 |
| AlphaProof/AlphaGeometry、Lean 系（DeepSeek-Prover 等）                                            | RQ2（形式验证锚点） | 🔵                                 |
| 评测基准：ScienceAgentBench / CORE-Bench / LAB-Bench / PaperBench / RE-Bench                       | RQ6         | 🟢（选 3）                            |
| 领域内（天体物理/数值相对论）agent 应用                                                                       | RQ1/RQ5     | **待检索**（不预设名字）                     |
| AI4Science agent 综述（2024–2026，取最新 1–2 篇）                                                      | 路标          | ⚪                                  |

### Track B — Harness 工程与验证机制

| 来源                                                                                                                 | 关注 RQ            | 标注                             |
| ------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------ |
| Anthropic《Effective harnesses for long-running agents》（一手核实，09 遗留）                                                 | RQ1/RQ3          | ✅ **B1-1 已采集**                 |
| Anthropic《How we built our multi-agent research system》                                                            | RQ1/RQ3          | ✅ **B1-2 已采集**                 |
| Anthropic《Effective context engineering for AI agents》                                                             | RQ3              | ✅ **B1-3 已采集**                 |
| Cognition《Don't Build Multi-Agents》                                                                                | RQ1/RQ3          | ✅ **B1-4 已采集**                 |
| SWE-agent（arXiv 2405.15793 + 代码）**＋ mini-SWE-agent（反数据）**                                                          | RQ1/RQ3          | ✅ **B1-5 已采集**                 |
| **（新发现，2026-10-16 检索命中）Anthropic《Scaling Managed Agents: Decoupling the brain from the hands》**                    | RQ3/RQ4（内核↔宿主分层） | ✅ **B2-6 已采集**                 |
| **（新发现）Anthropic《Building effective human-agent teams》**（2026-06-24：Doer-Verifier、按任务类型授予自主权——与 work-types 毕业机制同构） | RQ4/RQ6          | ✅ **B2-7 已采集**                 |
| OpenHands（arXiv 2407.16741）                                                                                        | RQ1/RQ3          | 🔵 降为备选（SWE-agent 卡已覆盖 ACI 视角） |
| LLM-as-judge 可靠性（MT-Bench judge 文 arXiv 2306.05685；fair-evaluator arXiv 2305.17926）                                | RQ2/RQ6          | 🟢                             |
| "LLMs cannot self-correct reasoning yet"（arXiv 2310.01798）                                                         | RQ2/RQ5          | 🟢                             |
| Prover-Verifier Games（OpenAI, arXiv 2407.13692）                                                                    | RQ2              | 🟢                             |
| Let's Verify Step by Step（process supervision, arXiv 2305.20050）                                                   | RQ2              | 🔵                             |
| Voyager（arXiv 2305.16291）／ Reflexion（2303.11366）／ ExpeL（2308.10144）选 1–2                                           | RQ3              | 🟢                             |
| MemGPT/Letta（2310.08560）／ Generative Agents（2304.03442）选 1                                                         | RQ3              | 🔵                             |
| 12-Factor Agents（humanlayer, GitHub）                                                                               | RQ4              | 🔵                             |
| METR《Measuring AI Ability to Complete Long Tasks》（arXiv 2503.14499）                                                | RQ6              | 🟢                             |
| Claude Code hooks / subagents 官方文档                                                                                 | （09 已核，不重复）      | ⚪                              |

---

## 3. 卡片模板（执行时写入 `docs/survey/cards/<slug>.md`）

```markdown
# <系统/文章名>
- 元数据：出处｜年份｜领域｜一手性｜获取日期｜快照(slug+sha256)
- ① 任务分解与角色架构：
- ② 验证/审查机制：
- ③ 上下文/记忆策略：
- ④ 人工介入点：
- ⑤ 成本/规模实测：
- ⑥ 失败模式与自述局限：
- ⑦ 与 UnivEdge 对照（逐条款）：已有同构 <编号> / 更弱 / 缺失 / 冲突
- ⑧ 可移植性判定：内核 / 领域资产 / 宿主 / 不适用（理由）
- ⑨ 直引（3–5 条，原文）：
- ⑩ 探针草案（若入候选池）：
```

---

## 4. 候选池（执行期累积）

> 规则：候选**未被吸收**——须过吸收门五问 + han 裁决后，才进入内核版本流程或 `work-types.md §5` 登记。  
> "解决的本地失败模式"= 吸收门第 1 问的证据；探针 = 第 2 问草案。

| #   | 候选机制                                                                                                 | 来源（卡片）                                                                                                                                                                   | 解决的本地失败模式                                           | 探针草案（摘要）                                                       | 类别                | 状态                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------- | ----------------- | ------------------------------------------- |
| P1  | **会话启动冒烟测试**：新会话动工前先跑一次基本验证，确认项目未处于 broken 状态                                                        | B1-1 effective-harnesses                                                                                                                                                 | 承接待续工作时的状态漂移（有日志但无动作级检查）                            | 构造"上会话留下坏状态"→ 新会话须先检出                                          | 判断类（是否为强制步骤）      | 待审                                          |
| P2  | **努力预算↔复杂度分级**（审查档位自动升级信号）**+ 补充条件：升级有效性受"oracle 判据存在性"约束**（无 oracle 时加档边际收益饱和）                      | B1-2 multi-agent；**B2-5 aviary（oracle verifier 才可规模化，投票快速饱和）+ B2-2 co-scientist（test-time compute 持续收益）**                                                                | docs/15 待决①：T1/T2 升级现仅靠显式声明                         | 高代价场景（如全链重算前）→ 断言自动升 T2；无 oracle 场景断言不盲目升档                     | 判断类               | 待审（直接服务 docs/15；三来源同向）                      |
| P3  | **end-state 优先的审查口径**：默认核对终态锚点（T1 语义），全量重推（T2）限于特定信号                                                 | B1-2 multi-agent（附录）                                                                                                                                                     | T1/T2 边界未定                                          | 同 P2 场景集                                                       | 判断类               | 待审（服务 docs/15）                              |
| P4  | **裁剪留痕 + 标签保留**：任何省略留可见占位符（"已省略 N 行"）；关键证据可打"保留"标签豁免裁剪                                               | B1-3 context + B1-5 swe-agent 代码                                                                                                                                         | 裁剪（L1 预算/报告/compaction）静默丢信息，无法审计                   | ① 裁剪后断言占位符存在；② 标注证据经裁剪仍在；破坏式各自失败                               | 事实类（行为可断言）        | 待审                                          |
| P5  | **工具审计判据**："人类工程师能否明确说出何时该用哪个工具"——用具描述质量与重叠度检查工具集                                                    | B1-3 context                                                                                                                                                             | §6 工具体系缺可操作审计判据                                     | 对现有工具集逐对检查重叠/歧义描述                                              | 判断类               | 待审                                          |
| P6  | **审查输入包补"轨迹/隐含决定"段**：行动携带的未言明假设须显式化                                                                  | B1-4 cognition + docs/09 O7                                                                                                                                              | 决定冲突类问题（跨步骤未声明约定）                                   | 构造未言明约定的产物 → 审查须指出                                             | 判断类               | 待审                                          |
| P7  | **评估器输出格式收敛**：单 judge + rubric（0-1 + pass/fail）比多 judge 更稳定（外部证据）                                    | B1-2 multi-agent §evaluation；**B2-1 AI Scientist（ensembling 不提性能只降方差）+ B2-4 Virtual Lab（并行采样+低温合并降方差）**                                                                  | §5.2 评分标准校准参考                                       | （外部实践，无需本地探针；作设计参照）                                            | 规范类（格式）           | 待审（低优先；三个独立来源同向）                            |
| P8  | **约束不可自改**：agent 不得修改自己的运行约束（超时/门/预算/重启策略）；"仅包含直接观察到的结果"的可检查判据                                       | B2-1 ai-scientist（自改超时、自我重启、幻觉整表）                                                                                                                                        | 现有权限门管"副作用"，无"改自己的约束"条款                             | 构造超时场景 → 断言不尝试改配置；负控正常场景不告警                                    | 事实类（行为可断言）        | 待审                                          |
| P9  | **凭据隔离**：凭证/密钥永不被 agent 生成代码触及（vault/proxy 模式）                                                       | B2-6 managed-agents                                                                                                                                                      | 权限门管动作批准；无凭据隔离原则（dsh 侧实现待查）                         | 沙箱内断言凭据不可见/不可用；破坏式注入 token 须报警                                 | 事实类（可断言）+ 宿主实现    | 待审（先查 dsh 现状）                               |
| P10 | **接口稳定性判据**：内核条款不得绑定具体宿主实现（"对接口形状有主见，对实现无主见"）；配合 R5 形成"删旧的 + 留插槽"                                    | B2-6 managed-agents                                                                                                                                                      | docs/05 精神已有，但无逐条核对判据                               | 静态盘点：逐条问"这条绑定了具体实现吗"（审查清单项）                                    | 判断类               | 待审（低优先）                                     |
| P11 | **审批批量升报**：多个待批事项合成一次请求（含背景），保护人类注意力                                                                 | B2-7 human-agent-teams                                                                                                                                                   | 实际使用中 han 被多次打断（打扰度）                                | 构造 3 个待批事项 → 断言合并呈现；负控单项即时呈现                                   | 事实类（宿主行为）         | 待审（体验向）                                     |
| P12 | **产物可核查性（legibility）判据**：产物须让"无会话上下文的弱验证者"仅凭文件完成核对；证据可定位、引用可解析                                       | B3-3 prover-verifier                                                                                                                                                     | T1 抽验的便宜性隐含依赖 legibility；产物靠对话/记忆才能读懂时 T1 会**静默漏检** | 只给产物文件、不给生成过程 → 弱审查者复核 1 条结论；负控：证据仅在对话中的结论须被判"不可核查"            | 事实类（可断言）          | 待审（**高优先**，服务 T1）                           |
| P13 | **审查结论的顺序/表述不变性 + 分歧度升级信号**：同一产物两种等价呈现（顺序互换/无关改写）结论须一致；不一致 → 升 T2 或 need_human                       | B3-1 judge 可靠性（GPT-4 交换一致性仅 65%、Claude-v1 23.8%；换序可让 Vicuna 66/80 胜 ChatGPT）                                                                                             | docs/15 待决①缺可观测升级信号；审查者偏差从未被检验                      | A/B 等价呈现 → 断言 S0/S1 集合一致；负控：真不同产物须给不同结论                        | 事实类               | 待审（**高优先**，直接回答待决①）                         |
| P14 | **判定粒度 ↔ 判据可得性**（v2 修订）：每步有可判据 → 过程级（T2 语义）；仅终态可判 → 终态级（T1 语义）；**且：只做终态低级检查不足，可判定的中间步骤必须设检查点**。不按成本拍 | B3-4 process supervision（PRM 78.2% > ORM 72.4% > 投票 69.6%）+ B1-2 end-state + **B5-3 MAST（"sole reliance on final-stage, low-level checks is inadequate"；验证类失败合计 23.5%）** | T1/T2 边界未定；"全量重推"与"抽验"的适用条件未明文                      | 两类任务（步级可判 / 仅终态可判）→ 断言粒度选择分别正确；再构造"中间步骤可判但终态通过"样例 → 断言中间检查点能拦住 | 判断类               | 待审（与 P2/P3 合并成"T1/T2 边界三条件"；**已按 MAST 修订**） |
| P16 | **经验/文献检索排序**：L3 检索按 相关性 × 新近 × 重要 排序（现为人工路径判断）                                                      | B4-2 experiential（ExpeL 召回 insights）+ B4-3 memory（Generative Agents 三因子）+ B4-1 voyager（描述嵌入检索）                                                                           | 教训/文献增长后人工挑选会失效；L1 常驻 + L3 按需之间无排序规则                | 8–10 条教训 + 仅与 2 条相关的任务 → 断言 top-k 命中；负控无关任务不误排                 | 事实类               | 待审（低优先，随知识库增长再落）                            |
| P17 | **目标一致性检查**：产物指标须与任务目标方向一致（防"优化能效却增算力"）                                                              | B5-1 beel（AI Scientist 独立评估实例）                                                                                                                                           | RC-02 可打分但未检查"指标↔目标"方向一致性                           | "目标=降本"产物报告"精度升但算力增" → 断言判不达目标；负控一致产物不误报                       | 判断类（可并入 RC-02 说明） | 待审（低优先，须过重复度检查）                             |
| P18 | **前瞻审查判据边界**：前瞻只能判"是否值得执行"，不得判"方案正确"；高风险方案须附最小执行证据                                                   | B5-2 ideation-execution gap（43 专家 × >100h，AI 想法执行后分数塌陷、排名反转）                                                                                                             | §1.7 已写"审查通过≠verified"，但未明确"计划评审不得作为方案正确依据"         | 给"完备但未执行"的方案 → 断言输出"可执行（待验证）"；负控附执行证据者可判已验证                    | 判断类               | 待审（与 §3.5/§1.7 可能重复，须过吸收门第 3 问）             |
| P19 | **B4 根因基加子标签**：提前终止 / 未验证 / 错验（对应 MAST FM-3.1/3.2/3.3，占比 6.2/8.2/9.1%）                               | B5-3 mast                                                                                                                                                                | 教训归类时三类常混在 B4 一条里，不便统计与针对性阻断                        | 抽样历史报告重归类 → 断言可无歧义归入三类；负控格式类不落 B4                              | 规范类（分类学）          | 待审（低风险，并入 review-lessons）                   |


## 5. 不吸收清单（执行期累积）

| 机制 | 来源 | 不吸收理由（五问中哪一问被否） |
|---|---|---|
| 专用上下文压缩模型（微调小模型做 compact） | B1-4 cognition | 问 1/4：无本地对应失败模式（我们无微调管线，且 L1 座位已对 compaction 免疫）；维护成本不可承受 |
| ACI 定制工具集（view/edit/lint 专用接口） | B1-5 swe-agent | 问 4：作者自证随模型变强而失效（mini 反数据）；UnivEdge 已有工具代算路线，无需专用编辑接口 |
| rainbow deployment / 断点恢复 / 生产可观测性 | B1-2 multi-agent、B1-5 | 问 5：宿主运行时层能力（dsh 侧），不属内核 |
| prompt cache 控制 | B1-5 swe-agent 代码 | 宿主层（成本优化），非内核规则 |
| Elo 锦标赛 / 模拟辩论排名 | B2-2 co-scientist | 问 1：无本地对应失败模式（科研助手不做大量候选假设的开放式淘汰）；问 4：成本高 |
| PI 自动组队 / 会议制 | B2-4 virtual-lab | 问 1：无本地对应（单人研究者 + 助手，非团队模拟场景） |
| 并行采样 + 低温合并 | B2-4 virtual-lab | 问 5：领域侧方法（关键数值判定的重复实验），非内核条款；记观察 |
| 训练管线（RL/SFT/LDP 环境） | B2-5 aviary | 问 4/5：需训练基础设施与领域环境工程；UnivEdge 无训练能力 |
| 全自动论文生成与投稿流程 | B2-1 ai-scientist | 问 1：与"人类掌舵的科研助手"定位冲突（不追求全自主科研循环） |
| 湿实验/实验室硬件控制与 dual-use 安全链 | B2-3 coscientist | 问 5：无执行权、无实验室（安全链设计不适用；dual-use 记入领域观察） |
| 奖励模型训练（PRM/ORM）与 PRM800K 采集 | B3-4 process supervision | 问 4/5：需训练基础设施与步级标注预算；UnivEdge 无训练能力。**只取其"粒度↔判据"结论**（→P14） |
| Prover-Verifier 训练博弈（helpful/sneaky prover） | B3-3 prover-verifier | 问 4：训练期方法，我们无常驻训练；**只取 legibility 概念**（→P12） |
| few-shot judge / 多 judge 集成 | B3-1 judge（few-shot 成本 ×4；B1-2 已证多 judge 无益） | 问 4：成本不划算且无稳定收益；保留"先证据后打分"（MEC）与"双向聚合"（BPC）两条 |
| Minecraft 自动课程（curriculum） | B4-1 voyager | 问 1：无本地对应失败模式（我们的任务由人定，不需要自动探索课程） |
| 技能=可执行代码 + 嵌入检索 | B4-1 voyager | 问 1/5：形态不同（我们的技能是方法论包，不是可执行程序）；"可组合性"记观察 |
| Reflexion 的基准式多轮重试循环 | B4-2 reflexion | 问 1：我们的子任务是科研单元（无"同一题重做 10 次"的基准设定） |
| MemGPT 的 OS 级 paging / 模型自决换页 | B4-3 memgpt | 问 5：宿主实现层（dsh 侧可参考）；内核只保留"检索排序"（→P16）与 working context 观察 |
| METR 任务集与 bootstrap 方法 | B4-4 metr | 问 5：评测侧方法（可参考统计严谨性），非内核规则 |
| 自动选题 / 想法重排（RAG + 过生成 + rerank） | B5-2 si | 问 1：我们不做自动选题（人定方向）；"多样性不足"记入观察 |
| 论文写作与投稿流程评估 | B5-1 beel | 问 5：不属于科研助手内核（我们不生成论文投稿） |
| CodeOcean / 学科任务集 | B5-4 core | 问 5：评测侧资产；仅取"机器可读验收 + 环境记录"的启示（已有 NC-04/05、R1c） |

## 6. 批报累积

### Batch 1（2026-10-16，Track B 收口，5 来源 / 6 材料）

- **完成**：B1-1..B1-5 五张卡片（`docs/survey/cards/`），快照 11 份（`run/survey/sources/`，含原始 HTML）。
  **docs/09 §7 遗留项（Effective harnesses 一手核实）已收口**：09 的二手转述与原文一致，无修正。
- **新机制（蒸馏）**：① 会话就位仪式（读日志+清单+**冒烟测试**）；② 子代理=上下文压缩器（回传 1-2k）；
  ③ 努力预算按复杂度分级（1/2-4/>10 agent）；④ 单 judge + rubric 最稳；⑤ end-state 优先；
  ⑥ compaction 保留集（决定/未解问题/实现细节 + 最近 5 文件）；⑦ **省略留痕占位符 + 标签保留**（代码级）；
  ⑧ 并行仅限只读（Anthropic/Cognition 张力经域差异裁决）。
- **新冲突/张力**：Cognition 单线程 vs Anthropic 多代理 → 裁决：**域差异**（读可并行、写不可并行），
  两文共同约束已记入 P6 与卡片。
- **饱和状态**：RQ1（分解架构）已近饱和（三类模式：两阶段初始器/协调者-工作者/单线程；边际递减）；
  RQ3（上下文）Batch 1 后进入饱和边缘（compaction/note-taking/subagent 三手段已齐，剩实证细节）。
- **成本数据（供 RQ6）**：multi-agent ≈15× chat token；agent ≈4×；token 用量解释 BrowseComp 方差的 80%。
- **意外收获**：mini-SWE-agent 反数据（100 行 vs 全 harness 同性能）——**harness 简化纪律的最强外部证据**，
  直接支撑 docs/12 R2/R5 与 docs/15 "分层必须成套落地"的教训。
- **Batch 2 计划（待 han 确认批报后启动）**：Track A 起步——AI Scientist / AI co-scientist / Coscientist /
  Virtual Lab / Aviary 聚焦"分解与验证架构"（RQ1/RQ2）；**并将新发现的两篇 Anthropic 文
  （managed-agents / human-agent-teams）并入**（与 work-types 毕业机制、内核↔宿主分层高度相关）。

### Batch 2（2026-10-16，Track A 起步 + 2 篇 Anthropic 新文，7 来源）

- **完成**：B2-1..B2-7 七张卡片；快照 14 份。**3 处种子清单更正**：① Virtual Lab 载体为 bioRxiv
  2024.11.11.623004（原记 arXiv 2411.10109 是另一篇论文——记错 ID）；② Aviary 作者为 FutureHouse
  （原误记 DeepMind）；③ Coscientist Nature 论文开放获取，已取全文（原以为需替代来源）。
- **新机制（蒸馏）**：① AI Scientist：自动评审器近人类（F1 0.57>0.49）+ **"实现错误需对抗性代码审查 +
  人工检查"** + 自述失败清单（自改超时/自我重启/幻觉整表/指标变更不一致）；② Co-Scientist：Reflection
  ≈ 同行评审者、Elo 锦标赛、**假设级安全审查 + 可配置判据**、meta-review 元层学习环；③ Coscientist：
  四命令行动空间（GOOGLE/PYTHON/DOCUMENTATION/EXPERIMENT）；④ Virtual Lab：**逐轮 Critic + PI 综合**、
  并行采样（0.8）+ 低温合并（0.228）、人类书写仅 1.3%；⑤ Aviary：**"有 oracle verifier 才能规模化，
  无则投票快速饱和"**（对 T1/T2 的关键约束）；⑥ Managed Agents：session/harness/sandbox 虚拟化 +
  **"session 不是上下文窗口"**（不可逆裁剪的风险）+ 凭据隔离；⑦ human-agent teams：
  **"按任务类型挣得自主权"（= work-types 毕业机制的独立来源印证）** + 人类注意力稀缺（批量升报）。
- **候选池更新**：新增 P8（约束不可自改）、P9（凭据隔离）、P10（接口稳定性判据）、P11（审批批量升报）；
  P2/P3 补 oracle 约束（Aviary）；P7 获三个独立同向来源；不吸收清单 +7 条。
- **饱和状态**：RQ1（分解架构）**已饱和**（两批 12 来源，模式收敛：两阶段/协调者-工作者/单线程团队/
  单 agent 四类，边际递减明显）；RQ2（验证锚定）半饱和（评审器/判据设计已齐，剩 judge 可靠性实证→Batch 3）；
  RQ4（人机分工）半饱和；RQ3 边缘；RQ5/RQ6 未启动。
- **值得注意的对照**：三个 AI4Science 系统（AI Scientist / Co-Scientist / Virtual Lab）**全部**把"批评/
  评审"角色化，且**全部**依赖外部验证锚定（湿实验 / 基准数据集 / OpenReview 真值）——与 UnivEdge 的
  锚点原则 + 怀疑派评估器方向一致；**没有任何一个系统把"审查性价比"当作核心问题**（它们要么全自动、
  要么全量评审）——这印证 docs/12/15 的 T1/T2 分级与毕业机制是**本地特有且方向正确**的优化空间。
- **Batch 3 计划（待确认）**：验证可靠性 T4 聚集——LLM-as-judge 可靠性（MT-Bench judge / fair-evaluator）、
  "LLMs cannot self-correct reasoning yet"、Prover-Verifier Games、process supervision（选 4）——
  直接服务 docs/15 T1/T2 待决①与 docs/12 的 P7。

### Batch 3（2026-10-18，验证可靠性 T4 聚集，4 卡 / 5 论文）

- **完成**：B3-1（MT-Bench judge + Fair Evaluator 合并卡）、B3-2（self-correct 局限）、B3-3（Prover-Verifier
  Games）、B3-4（process supervision）；快照 10 份。
- **新机制（蒸馏）**：① judge 与人类一致率 **>80%**（等于人类间一致性），但**位置偏差可翻转结论**
  （GPT-4 交换一致性 65%、Claude-v1 23.8%；换序即让 Vicuna 在 66/80 题上"胜"ChatGPT）；
   缓解：双向聚合 BPC（+14.3%）、先证据后打分 MEC（+9.8%）、难例找人 HITLC（20% 人工达可比对齐）；
  ② **无外部反馈的自纠会降性能**（"对改错 > 错改对"；GSM8K 74.7% 保持原答案）；
  ③ **legibility 是独立于正确性的产物属性**：只优化正确性会让推理更难核查；为弱验证者训练可核查性可迁移到
  "时间受限的人类"；④ **步级判据存在时过程监督更强**（PRM 78.2% > ORM 72.4% > 投票 69.6%）。
- **候选池更新**：**P12 产物可核查性（高优先）**、**P13 顺序不变性 + 分歧度升级信号（高优先，直接回答
  docs/15 待决①）**、**P14 判定粒度↔判据可得性（与 P2/P3 合并为"T1/T2 边界三条件"）**。
  不吸收 +3 条（训练侧 RM、prover-verifier 训练、few-shot/多 judge）。
- **一次自我纠错（留痕）**：起草 B3-2 卡片时我初判"§0.4 未写明 T0 的效力边界"，核对现行原文后发现
  **已写明**（"只抓'锚点不匹配'类疏忽，不替代独立重推（docs/15）"）→ 该条从"候选 P15"降级为
  "已有条款的外部实证"，未新增候选。**教训复用**：先核对现行文本，再判缺口（同 docs/12 §8.2）。
- **饱和状态**：**RQ2（验证与锚定）已饱和**——四批 17 个来源后，"审查者能力/偏差/粒度/可核查性"四条
  主线均已收敛；继续扩源的边际收益主要在 RQ3（记忆）与 RQ5（失败案例），不在 RQ2。
  **P12–P14 已足以支撑 docs/15 待决①的裁决**（三个互补信号：事前=判据可得性、事中=顺序一致性、
  事后=命中率）。
- **Batch 4 计划（待确认）**：RQ3/RQ6 —— Voyager / Reflexion 或 ExpeL（经验学习，选 1–2）+ METR 长任务
  度量 + 1 个记忆系统（MemGPT 或 Generative Agents，选 1）。目标：handoff 工件形态与"何时该毕业/扩容"的
  外部参照。

### Batch 4（2026-10-18，RQ3/RQ6：记忆、经验学习、长任务度量，4 卡 / 6 论文）

- **完成**：B4-1 Voyager；B4-2 Reflexion + ExpeL（合并）；B4-3 MemGPT + Generative Agents（合并）；
  B4-4 METR；快照 12 份。
- **新机制（蒸馏）**：① **技能库＝可执行代码 + 描述嵌入索引 + 组合**（Voyager；与我们的文档型技能不同形态）；
  ② **verbal reinforcement**：把二值反馈转成语言总结注入下一轮（Reflexion，HumanEval 91% vs GPT-4 80%；
  自述"依赖自评、无形式保证"）；③ **跨任务洞察提取**（ExpeL：成功/失败对 → insight 列表 → 推理时召回）；
  ④ **两级记忆 + working context + 函数换页**（MemGPT）；⑤ **检索三因子 relevance/recency/importance +
  周期性 reflection**（Generative Agents）；⑥ **50% 任务完成时间跨度 ≈110 min、每 7 个月翻倍**（METR）。
- **同构判定（本批最重要的结论）**：我们的 教训库（B1–B4 根因基）/ 每日日志 / L0–L3 加载协议 / MEMORY.md
  蒸馏，与 ExpeL 的 insight 列表、Reflexion 的 episodic memory、Generative Agents 的 memory stream +
  reflection **高度同构**；且我们的"**根因基按线性独立原则固化**（§1.5）"比自由文本 insight 列表
  **更抗膨胀**——外部来源反向印证了既有设计选择。**B4 基本没有可吸收的新机制**，只产生 1 个候选。
- **候选池更新**：**唯一新增 P16（经验/文献检索排序）**；"教训须绑定具体失败证据"并入 P12；
  working context（MemGPT）记观察（与 B2-6 的 session 同族）。
- **不吸收 +5**（Minecraft 课程、可执行技能检索、基准式重试、OS 级换页、METR 任务集）。
- **饱和状态**：**RQ3（上下文/记忆）已饱和**——分层/压缩/检索/反思四类机制在四批中反复出现，
  本轮无新机制；**RQ6（度量）半饱和**——已获三种口径（命中率、人类对齐率、时间跨度），
  足以支撑 work-types 毕业阈值的校准讨论。**仅剩 RQ5（失败模式）未系统覆盖**。
- **Batch 5 计划（最后一批）**：RQ5——AI4Science 失败案例与批判研究：① 对 AI Scientist 的批判/复现失败
  分析；② 论文撤稿/不可复现的公开复盘（含 AI 辅助科研的误用案例）；③ AI4Science agent 综述中的失败模式
  章节（作为索引，不入卡）。产出后即进入**收口阶段**（RQ 横向对照 + 候选池过吸收门 + 不吸收清单 + 裁决包）。

### Batch 5（2026-10-19，RQ5 失败模式，4 卡 / 5 论文）——**执行阶段最后一批**

- **完成**：B5-1 Beel 独立评估；B5-2 Si + Ideation–Execution Gap（合并）；B5-3 MAST 失败分类学；
  B5-4 CORE-Bench；快照 10 份。
- **关键实测（全部为独立第三方，非系统自述）**：
  - **AI Scientist 独立复现评估**：12 个实验 **5 个（42%）因编码错误失败**；跑通的也常"逻辑错误或误导"；
    代码每轮仅增 **8%**；每篇中位 **5 条引用**（34 条中仅 5 条 2020+）；**多篇含幻觉数值**；
    结构占位符（"Conclusions Here"）；成本 **$6–15/篇 + 3.5h 人工**；
  - **想法评价陷阱**：想法阶段 AI 新颖性 **5.64 vs 人类 4.84（p<0.01）**；但 43 位专家各投入 **>100 小时**
    执行后，AI 想法得分**显著塌陷**（所有指标 p<0.05），多项**排名反转**——"**absence of execution
    outcomes**"下评想法不可靠；
  - **MAST**：14 模式 / 3 类；验证类合计 **23.5%**（提前终止 6.2% / 未验证 8.2% / 错验 9.1%）；
    "**sole reliance on final-stage, low-level checks is inadequate**"；
  - **CORE-Bench**：270 任务 / 90 篇"低努力可复现"论文，最好 agent 最难级仅 **21%**。
- **候选池更新**：新增 **P17（目标一致性检查，低优先）**、**P18（前瞻审查判据边界）**、
  **P19（B4 子标签：提前终止/未验证/错验）**；**P14 修订**为"终态为主 + 可判定中间步骤必须设检查点"。
- **本批结论（对收口重要）**：**失败模式文献基本在验证既有设计**——B4 已覆盖验证类失败、状态机防提前终止、
  NC-04/05 覆盖环境、NC-07 覆盖引用溯源；真正需要改的只有 **T1/T2 边界（P14）** 与
  **前瞻审查边界（P18）**。与"成功系统"批次相比，**失败研究的证据更硬（可量化、可复现）但新增机制更少**。
- **饱和状态**：**RQ5 已饱和**（独立评估 / 执行追踪 / 失败分类学 / 复现基准四类证据齐备）。
  **五个 RQ 全部达到饱和或半饱和，执行阶段可收口。**
- **下一步（收口阶段，待 han 确认）**：① RQ1–RQ6 横向对照总表；② P1–P19 逐条过吸收门五问
  （事实/判断分类、重复度、探针可行性、维护成本）；③ 不吸收清单定稿；④ 输出**裁决包**：
  按"高优先（P12/P13/P14/P18）→ 中（P1/P4/P8/P9/P2/P3）→ 低（P6/P11/P16/P17/P19）"
  给出落点、探针与预期收益，交 han 统一审批。

### Batch 6（2026-10-19，时效抽查）：不是新一批机制调研，而是对"最老结论是否过期"的检验

- **起因**：han 质询"AI 领域更新快，旧文献参考价值可能不高"。
- **方法**：挑三条依赖 2023 证据、且若过期会改变设计的结论 → 检索 2026 证据 → 五来源存档
  （卡片 `freshness-check-2026.md`）。
- **结果**：① 位置偏差/稳定性问题**未消失且更隐蔽**（一致性–偏差悖论；κ 虚高 33–41pp；
  11 次重复才达 95% 复现；均 2026）→ P13 升为高优先；② **冗长偏差已可忽略**（<0.011）→ 降级担忧；
  ③ AI4Science 失败模式在 2026 升级版中仍在（Nature 2026：naive ideas / 实现错误 / 方法学不严谨 /
  引用幻觉），并新增 **implementation drift / overexcitement** → P8 扩为"约束不可自改 + 持续遵守"；
  ④ ARFT 2026（45 模式 / 800 轨迹）指出核心缺口是**缺 metacognitive loop**——与我们"锚点链 + 独立审查 +
  意见核验"同向，属强外部印证。
- **产物**：`docs/17`（收口与裁决包）；docs/16 §0.3 时间窗政策修订。

## 7. 引用总表（与卡片一一对应）

| # | 来源 | URL | 快照 sha256（前 16） | 卡片 |
|---|---|---|---|---|
| B1-1 | Anthropic, Effective harnesses for long-running agents | anthropic.com/engineering/effective-harnesses-for-long-running-agents | `c2a59fef0f71c031`(txt) | cards/anthropic-effective-harnesses.md |
| B1-2 | Anthropic, How we built our multi-agent research system | anthropic.com/engineering/multi-agent-research-system | `543d8be30c4a42c1`(txt) | cards/anthropic-multi-agent-research.md |
| B1-3 | Anthropic, Effective context engineering for AI agents | anthropic.com/engineering/effective-context-engineering-for-ai-agents | `d2080e598010803e`(txt) | cards/anthropic-context-engineering.md |
| B1-4 | Cognition, Don't Build Multi-Agents | cognition.ai/blog/dont-build-multi-agents | `48ffa3df327721f4`(txt) | cards/cognition-dont-build-multi-agents.md |
| B1-5 | SWE-agent（arXiv 2405.15793）+ 代码 history_processors.py + mini-SWE-agent README（注：SWE-agent 已被 mini 取代） | github.com/SWE-agent/SWE-agent; github.com/SWE-agent/mini-swe-agent | `dcd880557720efba` / `8e3621a9b7d94761` / `9982d90b7566f2f3` | cards/swe-agent-aci.md |
| B2-1 | The AI Scientist（arXiv 2408.06292，v1） | arxiv.org/abs/2408.06292 | `421f534b197e57e2`(txt) | cards/ai-scientist.md |
| B2-2 | Towards an AI co-scientist（arXiv 2502.18864） | arxiv.org/abs/2502.18864 | `a0e0cecae11595fa`(txt) | cards/google-co-scientist.md |
| B2-3 | Coscientist（Nature 624, 570；开放获取） | nature.com/articles/s41586-023-06792-0 | `8f6c6d4af16ac18d`(txt) | cards/coscientist-nature.md |
| B2-4 | The Virtual Lab（bioRxiv 10.1101/2024.11.11.623004） | biorxiv.org/content/10.1101/2024.11.11.623004v1 | `47d1692e78aac661`(txt) | cards/virtual-lab.md |
| B2-5 | Aviary（arXiv 2412.21154，FutureHouse） | arxiv.org/abs/2412.21154 | `6069ef383de2ecf2`(txt) | cards/aviary.md |
| B2-6 | Anthropic, Scaling Managed Agents | anthropic.com/engineering/managed-agents | `3307de45eb754901`(txt) | cards/anthropic-managed-agents.md |
| B2-7 | Anthropic, Building effective human-agent teams（2026-06-24） | claude.com/blog/building-effective-human-agent-teams | `2b078ba5b0f2784d`(txt) | cards/anthropic-human-agent-teams.md |
| B3-1a | Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena（arXiv 2306.05685） | arxiv.org/abs/2306.05685 | `e47c52fd43c514c6`(txt) | cards/llm-as-judge-reliability.md |
| B3-1b | Wang et al., Large Language Models are not Fair Evaluators（arXiv 2305.17926） | arxiv.org/abs/2305.17926 | `9cb7e731f3a65c6f`(txt) | 同上（合并卡） |
| B3-2 | Huang et al., LLMs Cannot Self-Correct Reasoning Yet（arXiv 2310.01798） | arxiv.org/abs/2310.01798 | `50e4fd99abc758a0`(txt) | cards/llm-self-correction-limits.md |
| B3-3 | Kirchner et al., Prover-Verifier Games improve legibility（arXiv 2407.13692） | arxiv.org/abs/2407.13692 | `271afc9c50d7099b`(txt) | cards/prover-verifier-games.md |
| B3-4 | Lightman et al., Let's Verify Step by Step（arXiv 2305.20050） | arxiv.org/abs/2305.20050 | `2c655549ad77ae67`(txt) | cards/process-supervision.md |
| B4-1 | Voyager（arXiv 2305.16291） | arxiv.org/abs/2305.16291 | `6cfab0fdc8ffd7bf`(txt) | cards/voyager.md |
| B4-2a | Reflexion（arXiv 2303.11366） | arxiv.org/abs/2303.11366 | `8971b0e5a498cbe1`(txt) | cards/experiential-learning.md |
| B4-2b | ExpeL（arXiv 2308.10144） | arxiv.org/abs/2308.10144 | `3e78b5dd45a63280`(txt) | 同上（合并卡） |
| B4-3a | MemGPT（arXiv 2310.08560） | arxiv.org/abs/2310.08560 | `d8b1acdc0b4f4796`(txt) | cards/memory-architectures.md |
| B4-3b | Generative Agents（arXiv 2304.03442） | arxiv.org/abs/2304.03442 | `233470c77d221ae4`(txt) | 同上（合并卡） |
| B4-4 | METR, Measuring AI Ability to Complete Long Software Tasks（arXiv 2503.14499） | arxiv.org/abs/2503.14499 | `e52de524a5e7cae1`(txt) | cards/metr-time-horizon.md |
| B5-1 | Beel et al., Evaluating Sakana's AI Scientist（arXiv 2502.14297） | arxiv.org/abs/2502.14297 | `e93f9dbdbb28264c`(txt) | cards/beel-ai-scientist-evaluation.md |
| B5-2a | Si et al., Can LLMs Generate Novel Research Ideas?（arXiv 2409.04109） | arxiv.org/abs/2409.04109 | `00ce2b613b9692ca`(txt) | cards/research-idea-evaluation-gap.md |
| B5-2b | Si et al., The Ideation–Execution Gap（arXiv 2506.20803） | arxiv.org/abs/2506.20803 | `9020d8160bb6f2a4`(txt) | 同上（合并卡） |
| B5-3 | Cemri et al., Why Do Multi-Agent LLM Systems Fail?（arXiv 2503.13657） | arxiv.org/abs/2503.13657 | `6ac4a8fba1085f3f`(txt) | cards/mast-failure-taxonomy.md |
| B5-4 | Siegel et al., CORE-Bench（arXiv 2409.11363） | arxiv.org/abs/2409.11363 | `de90d8c3138abe8a`(txt) | cards/core-bench-reproducibility.md |
| B6-1 | Reliability without Validity（arXiv 2606.19544，2026-06） | arxiv.org/abs/2606.19544 | `b406c16b4c5e2a64`(html) | cards/freshness-check-2026.md |
| B6-2 | The Coin Flip Judge?（arXiv 2606.13685，2026-06） | arxiv.org/abs/2606.13685 | `08aacaaccb2d1929`(html) | 同上 |
| B6-3 | Why LLMs Aren't Scientists Yet（arXiv 2601.03315，2026-01） | arxiv.org/abs/2601.03315 | `f536349c28d5df91`(html) | 同上 |
| B6-4 | How Do Agents Fail on AutoResearch（arXiv 2608.14905，2026-08） | arxiv.org/abs/2608.14905 | `3fcce9d8b93d9c7f`(html) | 同上 |
| B6-5 | Nature, Towards end-to-end automation of AI research（s41586-026-10265-5，2026-03） | nature.com/articles/s41586-026-10265-5 | `9575a3aa26d4848b`(html) | 同上 |
