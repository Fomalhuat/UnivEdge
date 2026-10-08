# 09 - 审查时机判据调研（从"阶段判断"到可判定触发信号）

> 版本：v0.4（调研稿）｜ 日期：2026-10-05 ｜ 整理：Enki ｜ 状态：**待 han 复核**
> v0.4 变更：新增 §5 M1 的**初始参数表（猜测值，待数据校准）**——含毕业阈值与其依据、回退条件、
> "实质发现"的计数定义；§6 逐条给出 O1–O8 的**调研可解性判定**（结论：原则层全部可解，
> 仅 O3/O5 属本地事实核查），并落实 O6/O7 的结论（检查-批准链、轨迹分层）。
> v0.3 变更：补齐 Anthropic 官方第二篇（*Demystifying evals for AI agents*，此前遗漏的调研面）——
> 新增 §3.8（capability / regression 生命周期：直接回答 O2"无历史证据默认审还是不审"）；
> §3.7 收敛表与 §5 M1 判据①随之修订（判据载体 = **工作类型状态表**）；§6 的 O2 给出答案、
> O4 扩为**双向指标**（漏审率 + 过审率）；§7 引用清单补一条一手来源。
> v0.2 变更：增补 OpenAI 来源（§2/§3.6/§3.7/§4 补充表/§7）；M1 由"三重信号"修订为**四重信号**
> （新增"变更事件"，判据①改用基层结构特征、判据②改为可静态化的预分级），并给出历史教训的
> 正确固化管线（失败 → 检查项 → 自动门）；M2 增补"审查内容边界"与"轨迹维度"；§6 开放项更新至 O8。
> 定位：本文是**调研文档**（docs/ 层），不是内核条款——不改变 METHODOLOGY / VERIFICATION 的任何规则。
> 起因：怀疑派审查的**触发时机**无法标准化——现有机制下"何时该审"依赖主观判断，
> 实践中两极摆动：要么过频（烧 token/时间、纠缠细节），要么不知道何时该审。
> 结论若被采纳，落点见 §5（候选改动 M1–M3），需另行走内核版本流程。

---

## 1. 问题陈述（精确化）

原始表述："什么时候应该做审查，很难给一个明确的标准"；"怎样判断'阶段性完成'我也是凭感觉"。

拆解为两个独立问题：

| 编号 | 问题 | 性质 |
|---|---|---|
| Q1 | 审查**何时触发**？ | 触发判据缺失——现有 v0.11 的"阶段门"依赖"阶段"概念，而"阶段"没有可判定定义 |
| Q2 | 审查**用什么强度/什么内容**？ | 成本失控——审查内容未按"机械可查 / 需判断"分层，全部走 LLM 评估器 |

Q1 的症状是"不知道何时审"；Q2 的症状是"审得太贵、太细"。
两者常被混为一谈（"审查太多"既可能是触发过频，也可能是单次审查内容过宽），必须分开治。

**现有机制回顾（v0.11/v0.8）**：
- §1.7 双轨触发：轨道 1 完成宣告（claimed）、轨道 2 阶段门宣告（阶段末可验证交付）；
  其中"阶段"定义为"由任务契约的分解（§1.2）与用户判断定义"——**"用户判断"即本次痛点的来源**；
- §5.1 审查输入包：包含产物 + 锚点 + 审查清单（VERIFICATION 检查项 ID）+ 假设声明；
  **未区分检查项形态**（V/V\*/H/C），即机械可查项与判断型项一并交给评估器；
- §1.3 审查前置：高代价裁决点的审批前置条件为阶段门审查闭环。

---

## 2. 调研来源与方法

| 层级 | 来源 | 用途 |
|---|---|---|
| 一手（原文） | Anthropic Engineering, *Harness design for long-running application development*（Prithvi Rajasekaran, Labs） | 判据设计的主要依据来源 |
| 一手（原文） | Anthropic Engineering, *Demystifying evals for AI agents* | **O2 的直接答案来源**（capability / regression 生命周期、尽早开始、双向平衡测试集）；v0.3 补入 |
| 一手（官方文档） | Claude Code 官方博客：*How to configure hooks*；*How and when to use subagents in Claude Code* | 工程实现形态参考（触发点类型、分层方式） |
| 一手（官方文档） | OpenAI：*Guardrails and human review*（Agents SDK 文档）；*A practical guide to building agents*（官方指南 PDF） | 触发判据的**第二独立来源**（风险分级、阻塞/并行选择、人工介入触发条件） |
| 一手（官方文档）+二手 | OpenAI Evals：grader 类型阶梯（string / Python code / model judge / human）；trace grading | 机械-语义分流的第二依据；**轨迹审查**概念来源 |
| 二手（实践总结） | 社区文章（spillwave / blackwell-systems / timewell / tallyfy / dev.to 等） | 仅作实践佐证，**不作为判据来源**；引用时明确标注 |

方法：以"审查/评估器何时值得其成本"为线索，逐条提取一手来源中关于**触发条件、完成判定、分层机制**的表述，
再与 UnivEdge 现有条款逐项对照，最后推导候选改动。

---

## 3. 核心发现

### 3.1 发现一：源头判据是"能力边界"，不是"阶段"（一手直引）

> "The practical implication is that the evaluator is not a fixed yes-or-no decision. **It is worth the cost
> when the task sits beyond what the current model does reliably solo.**"

原文以实测支撑该判据：同一类构建任务在 Claude Sonnet 4.5 上评估器"caught meaningful issues across the build"；
换到 4.6 后模型能力增强——

> "Tasks that used to need the evaluator's check to be implemented coherently were now often within what the
> generator handled well on its own, and **for tasks within that boundary, the evaluator became unnecessary
> overhead**. But for the parts of the build that were still at the edge of the generator's capabilities,
> the evaluator continued to give real lift."

**含义**：审查是否值得，是**任务属性**（这类工作模型可靠吗）而非**时间点属性**（到阶段了吗）的函数。
后者不可判定，前者可由历史证据判定（见 M1）。

**推论**：不审同样需要正当理由——"边界内的审查是 overhead"意味着**默认不审**在边界内是理性选择，
而非偷懒。这为现有机制补上了缺失的"不审判据"面。

### 3.2 发现二：阶段是"事前契约约定"，不是"事后判断"（一手直引）

> "**Before each sprint, the generator and evaluator negotiated a sprint contract**: agreeing on what
> 'done' looked like for that chunk of work before any code was written. This existed because the product
> spec was intentionally high-level, and I wanted a step to bridge the gap between user stories and
> testable implementation."

契约内容是**可测试行为**，并且判定是硬的：

> "Each criterion had a hard threshold, and **if any one fell below it, the sprint failed** and the
> generator got detailed feedback on what went wrong."

后期他们取消了 sprint 构造：

> "With the sprint construct removed, I moved the evaluator to **a single pass at the end of the run
> rather than grading per sprint**."

**含义**：
1. "何时算阶段性完成"的工程解法不是找判据，而是**在开始时把工作单元与 done 定义写进契约**——
   契约覆盖的工作单元一结束就是审查点，运行时无需任何主观判断；
2. 完成判定的强度语义值得借鉴：**任一 criterion 低于硬阈值即整体不通过**（我们现有 RC-02 只要求
   "逐项给出 pass/fail/need_human 与理由"，没有"任一不达标即整体失败"的强制性）；
3. 取消 sprint 后退化为运行结束单次检查，说明**工作单元粒度是可调参数**，不是固定教条——
   边界粗则审查少，细则多。

### 3.3 发现三：工程实现是"三层验证 + 机械/语义分流"（官方文档 + 二手实践）

Claude Code 官方文档给出的 hooks 适用场景（一手）：

> "When to use Stop: Forcing Claude to continue until all items in a checklist are done / **Verifying that
> tests pass before considering a task complete** / Triggering summary generation at the end of a session /
> **Checking that generated code compiles before stopping**"

官方 subagents 文档列出的审查模式（一手）：

> "**Independent review** — After implementing something complex, verification from a subagent that hasn't
> been influenced by the implementation journey catches what familiarity obscures."

社区实践（**二手**，仅作佐证）归纳出的分层与分流原则：

- 三层验证：PostToolUse hook（微：lint/format/type）→ Stop hook（宏：测试/构建/必需文件，不通过则阻断结束）
  → 只读 validator agent（语义：架构/完整性/质量）；
- 分流原则："use Hooks for mechanical checks, subagents for semantic judgment"；
  "Sending rules you could express in a linter or a test to AI review inflates cost and makes results unstable."

**含义**：评估器的成本问题有成熟解法——**把能用确定性检查表达的判据从 LLM 审查中剥离**。
UnivEdge 已有形态列（V / V\* / H / C）与 `tools/verifiers/`，具备落地基础（见 M2）。

### 3.4 发现四：handoff 点天然是审查点（一手直引）

> "Context resets—clearing the context window entirely and starting a fresh agent, combined with a
> structured handoff that carries the previous agent's state and the next steps—addresses both these issues.
> This differs from compaction..."

配套的 handoff 工件纪律（一手，转引自同文及社区对其的整理）：

> "move progress, completion criteria, startup instructions, and verification evidence out of model memory
> and into artifacts that the next session can inspect"
> "A prose handoff should never outrank executable evidence."

**含义**：跨 session / context reset / 进入下一工作单元的交接工件，是下一个执行者唯一可信的依据——
因此**无需任何"阶段判断"**，凡是即将成为 handoff artifact 的产物就必须先审。这是一个结构性触发点。

### 3.5 附带澄清：context anxiety 的准确定义（与 09-02 诊断对照）

原文对 context anxiety 的定义：

> "Some models also exhibit 'context anxiety,' in which they begin wrapping up work prematurely as they
> approach what they believe is their context limit."

对照 2026-09-02 会话诊断结论（当时结论：频繁确认并非 context anxiety，而是沙箱审批噪声 + 方法论注入塑造的确认密度）：
**定义一致，该结论成立**。但原文补充了一个我们未覆盖的点——context reset（清空上下文重启）与 compaction
是两种不同处置，后者保留连续性但**无法消除 context anxiety**。若未来遇到真正的过早收尾行为，
可通过"reset + handoff 工件"处置，而 handoff 工件正是 §3.4 的审查对象。

### 3.6 发现五：OpenAI 的触发设计——风险分级驱动 + 阻塞/并行选择（一手直引）

OpenAI 的 agent 设计**不使用"阶段"作为触发概念**，而是把触发绑定在**动作的风险属性**与**变更事件**上。

**(a) 阻塞 vs 并行的选择依据 = 下游代价**（Agents SDK 官方文档，一手）：

> "Use blocking execution **when the cost or risk of starting the main agent is too high**. Use parallel
> guardrails when lower latency matters more than avoiding speculative work."

即：下游越贵/风险越高 → 检查越前置（阻断式）；下游廉价 → 检查可并行（乐观执行）。
这与发现一（能力边界）互补：**前者问"值不值得审"，后者问"审在什么位置"**。

**(b) 人工介入的两个触发条件**（*A practical guide to building agents*，一手）：

> "Two primary triggers typically warrant human intervention: **Exceeding failure thresholds**: Set limits
> on agent retries or actions... / **High-risk actions**: Actions that are sensitive, irreversible, or have
> high stakes should trigger human oversight **until confidence in the agent's reliability grows**."

注意末句与 Anthropic"能力边界"判据**同构**：可靠性增长后即可撤除监督——两个独立来源在此汇合。

**(c) 工具风险预分级 = 判据的静态化**（同文，一手）：

> "Assess the risk of each tool available to your agent by assigning a rating—low, medium, or high—based on
> factors like read-only vs. write access, **reversibility**, required account permissions, and financial
> impact. **Use these risk ratings to trigger automated actions**, such as pausing for guardrail checks
> before executing high-risk functions."

**这是本节最重要的工程启示**：把"要不要检查"的判断**提前到登记时刻**（给动作/工具打风险标），
运行时只查表、不判断。**主观判断被一次性静态化**——直接回应"凭感觉"的问题。

**(d) grader 阶梯 = 机械/语义分流的第二依据**（OpenAI Evals，grader 类型官方定义 + 二手归纳）：

| 阶梯 | 适用 | 成本 |
|---|---|---|
| String check（equals/contains） | 正确答案是确定性 token | 最廉 |
| Code grader（Python over sample & trace） | 正确性可表达为代码：解析、schema、测试、工具参数 | 廉、确定性 |
| Model judge | 质量真属主观（语气、可读性、rubric 遵循） | 贵、需校准 |
| Human gold labels | 元评估、其余都无法判的情况 | 最贵 |

原则（二手归纳，与 Anthropic 生态一致）：**reach for the lowest rung that can still tell right from
wrong**；"You need far fewer model judges than you think. **Most of what teams reach for a judge to do is
a deterministic state check in disguise.**"

**(e) 轨迹审查（trace grading）与"审什么细节"的边界**（一手概念 + 二手边界表述）：

- 轨迹审查：除最终产物外，还评"调用了哪些工具、什么顺序、什么参数、是否超步数预算"——
  可捕捉最终产物评分完全漏掉的失败（错误工具、循环）；
- 边界表述（二手，但有判据价值）：**"do not grade preferred implementation details when several paths
  are valid; do grade trajectory invariants when the path changes authority, safety, cost, privacy or
  recoverability."**
  → 即：**不审"实现路径偏好"，审"改变权限/安全/成本/隐私/可复现性的轨迹不变量"**。
  这是对 Q2（审得太细）的一个精确判据。

**(f) 变更驱动 + 失败转回归用例**（Evals / CI 实践，一手概念 + 二手归纳）：

- 触发绑定**变更事件**："A model upgrade, prompt change, retrieval modification or agent code change
  triggers the evaluation suite... If defined gates fail, the deployment stops."；
- **每个真实失败转成永久回归用例**："Grow the dataset by converting every production agent mistake into a
  permanent regression case." / "every production failure becomes a new eval case"。

**含义（对上一轮 M1 的实质修订）**：我上一轮提出"review-lessons 例子层作为审查触发的预测器"，
本节 (f) 给出了**更优且成本更低的替代**——历史教训的正确用法**不是"每次任务读一遍不断增长的例子层"**
（这会把 L3 按需资产变成 L1 常驻成本，违背渐进披露），而是**转换管线**：

```
真实失败 → 提炼为检查项（VERIFICATION 条目）→ 可机械表达者下沉为脚本/自动门（零 token 常驻执行）
                                              └→ 仅判断型保留为评估器审查项
```

这与我们既有的 VERIFICATION 体系（RC/NC/PC/CC + 形态列）方向一致，且**常驻成本为常数**
（检查项数量增长缓慢，且机械项不消耗 LLM）。例子层退居**证据与溯源**角色（L3，按需查阅），
不再承担"每次预测"的职责。

### 3.7 三来源收敛：触发范式的交集

| 触发范式 | Anthropic | OpenAI | 用户实践（09-02~04 实证） |
|---|---|---|---|
| **能力/可靠性边界** | ✅ "beyond what the current model does reliably solo" | ✅ "until confidence in the agent's reliability grows" | 间接（凭感觉时灵时不灵，正因混入了此维度） |
| **风险/不可逆性（下游代价）** | 部分（评估器值不值） | ✅ 工具风险分级 + 阻塞/并行判据 | ✅ 三个审查案例全部命中（PLAN v3 / T9 终审 / P1-1 设计） |
| **生命周期边界**（工作单元 / handoff） | ✅ sprint contract + 运行结束单次检查 | ✅ 审批中断点（可序列化、可恢复） | ✅ 阶段末（但判据主观——正是痛点） |
| **变更事件** | 部分（模型升级导致边界外移） | ✅ CI gate：模型/提示/代码变更触发 | 未观察到（可作为新增维度） |
| **"阶段"作为判据** | ❌ 不用（改用事前契约） | ❌ 不用（改用风险分级与变更） | ⚠️ 使用中（主观，需替换） |

**结论**：三个独立来源都不使用"阶段"作为触发判据。我们在 v0.11 轨道 2 中使用的"阶段末"
是**用户直觉的近似**，其可判定形式应由"生命周期边界 + 风险分级"替换（见 §5 M1 修订）。

### 3.8 发现六：审查强度不是静态默认，而是任务类型的生命周期（一手直引）

Anthropic *Demystifying evals for AI agents* 直接回答了 O2（无历史证据时默认审还是不审）——
答案不是"二选一的默认值"，而是**按通过率演化的三态生命周期**：

> **Capability or "quality" evals** ask, "What can this agent do well?" They should **start at a low pass
> rate**, targeting tasks the agent struggles with and giving teams a hill to climb.

> **Regression evals** ask, "Does the agent still handle all the tasks it used to?" and should have a
> **nearly 100% pass rate**. They protect against backsliding, as a decline in score signals that something
> is broken and needs to be improved.

> After an agent is launched and optimized, **capability evals with high pass rates can "graduate" to become
> a regression suite that is run continuously** to catch any drift.
> Tasks that once measured "Can we do this at all?" then measure "Can we still do this reliably?"

**含义**：
1. **新任务类型（无历史证据）= capability 态 → 审/测，期望低通过率**——此时审的首要目的**不是防错，
   而是定义"什么算成功"并采集边界证据**（"Early on, evals force product teams to specify what success
   means"）；低通过率是**预期状态**，不是失败信号；
2. **稳定后（高通过率）→ 毕业为 regression 态**：转为机械、常驻、低成本地跑（防倒退）；
3. **饱和后**（"Eval saturation occurs when an agent passes all of the solvable tasks, leaving no room
   for improvement"）→ 无改进信号，可降级；
4. 因此 O2 的答案是：**默认审，但审是"采证据"手段且自带退出条件**（毕业机制）——
   "默认不审"只在已毕业（regression/饱和）的工作类型上成立。

**关于"何时开始"的配套表述（一手）**：

> We see teams delay building evals because they think they need hundreds of tasks. In reality,
> **20-50 simple tasks drawn from real failures is a great start.**
> Evals get harder to build the longer you wait. Early on, product requirements naturally translate into
> test cases. Wait too long and you're reverse-engineering success criteria from a live system.

> Some teams create evals at the start of development; others add them once at scale when evals become a
> bottleneck for improving the agent. Evals are especially useful **at the start** of agent development to
> explicitly encode expected behavior.

→ 支持"早开始、小样本起步"，且**两种团队路径都被认可**（起步即建 / 规模化后补建）；
Claude Code 的真实路径亦为后者：先靠人工反馈快速迭代，**后加 eval 且从窄领域开始**
（concision、file edits），再扩展到复杂行为（over-engineering）。

**双向平衡：审查机制本身也需要被评估（对 O4 的实质增强）**——原文 Step 3（一手直引）：

> Test both the cases where a behavior _should_ occur and where it _shouldn't_.
> **One-sided evals create one-sided optimization.** ... queries where the model should search (like finding
> the weather) and queries where it should answer from existing knowledge (like "who founded Apple?").
> Striking the right balance between **undertriggering** (not searching when it should) or **overtriggering**
> (searching when it shouldn't) was difficult.

→ 映射到我们的问题：用户观察到的两极困境正是这两个方向的失衡——
**undertriggering = 该审未审**（"不知道何时该审"）、**overtriggering = 不该审而审**（"过于频繁、纠缠细节"）。
原文的结论是：**只测一边会导致单向优化**，必须双向构造例子并分别度量。
这直接决定 O4 的指标设计必须是**双向**的（漏审率 + 过审率），而非单一"命中率"。

**一个相关的判据警示（一手）**：

> With frontier models, a **0% pass rate across many trials** (i.e. 0% pass@100) is most often a signal of a
> **broken task**, not an incapable agent, and a sign to double-check your task specification and graders.

→ 若某类工作"审查屡屡抓不到问题"，先怀疑**审查设计（清单/判据）**有问题，而非直接判定"该类工作无需审"。
这为"收缩审查"加了一道校验：收缩前需确认审查本身配置正确。

---

## 4. 与现有机制的差距对照

| 维度 | UnivEdge（v0.11/v0.8） | Anthropic / Claude 生态 | 差距性质 |
|---|---|---|---|
| 触发判据 | 双轨（claimed / 阶段门），"阶段"含用户判断 | 能力边界判据 + 生命周期事件（工作单元边界、运行结束、会话结束） | **主观 → 需换可判定信号**（M1） |
| 完成定义 | 契约含 DoD / 验证标准 / 测试计划 | 契约含 done + 可测试行为 + 硬阈值；任一不达标即失败 | 缺**强制性阈值**与**工作单元边界**字段（M3） |
| 审查内容分层 | 输入包含检查项 ID 列表，未区分形态 | 三层：机械 hook / 结构性 gate / 语义评估器 | 缺**机械层下沉**（M2） |
| 不审判据 | 仅 quiet 手动豁免 | "边界内审查 = overhead"（正向不审判据） | 缺**默认不审的正当性**（M1） |
| 交接工件 | §1.6 产物存储；无"交接前必审"条款 | handoff artifact 必须可信（可执行证据优先于叙述） | 缺**结构性触发点**（M1③） |
| 成本度量 | 观察期指标 A/B/C（声明遵守率 / 边际价值 / 打扰度） | —（原文以"是否抓到真问题"定性判断价值） | 我们指标偏流程，缺**审查命中率**（见 §6） |

**OpenAI 侧补充对照**（对应 §3.6）：

| 维度 | UnivEdge（v0.11） | OpenAI（Agents SDK / Evals） | 差距 |
|---|---|---|---|
| 触发位置 | 无分层——审查均发生在**产物已生成之后** | **动作前**（tool guardrail，含阻断式）/ 动作中 / 产物后（output guardrail）分层 | 缺"前置阻断"位置：错误若在动作前可拦，成本最低 |
| 判据形态 | 运行时判断（含"用户判断"） | **静态风险分级**（工具预标 low/medium/high）→ 运行时查表触发 | 缺预分级表——主观判断未静态化 |
| 审查对象 | 产物（报告/数据/脚本） | 产物 + **轨迹**（工具/顺序/参数/步数预算） | 缺轨迹维度（部分由 RC-06 覆盖，未系统化） |
| 高代价处置 | §1.3 审批（人工批准） | 审批中断 + **状态可序列化、可恢复、可延迟批准** | 我们的中断/恢复依赖宿主实现，未入契约 |
| 触发事件 | claimed / 阶段门 | **变更事件**（模型/提示/检索/代码变更 → 跑 eval suite，gate 失败即停） | 缺"变更驱动重审"（见 M1 信号④） |

---

## 5. 候选改动（供选择，本次不落笔）

### M1 四重触发信号（替代对"阶段"的主观判断）—— 已按 §3.6/§3.7 修订

触发改为**任一命中即审**；判据尽量**静态化**（登记时刻一次性判定，运行时查表）：

| 信号 | 判据（可操作形式） | 静态化载体（建议） | 依据 |
|---|---|---|---|
| ① 能力边界 | 双重判据：(a) 是否触及某根因基的**结构特征**（跨实现对照→B4 参照独立性；离散化/插值/截断→B3 有效域；约定类自由度→B2 语义；宣布根因→B1/P）；(b) 该**工作类型的生命周期状态**（§3.8：capability → 审；regression / 饱和 → 机械跑或不审） | **基层判据表**（B1–B4+P，本已常驻，零增量成本）+ **工作类型状态表**（capability / regression / retired，随证据更新） | 发现一 + 发现六 + §3.6(f) |
| ② 下游代价 | 待执行动作/产物的风险等级：是否不可逆？解锁的下游成本（长作业/全链重算/归档/成为锚点）？ | **预分级表**（仿 OpenAI 工具风险分级；与现有权限门 L0/L1/L2 合流），运行时查表不判断 | 发现五(a)(c) + 用户实证 |
| ③ 生命周期边界 | 产物将成 handoff artifact（跨 session / context reset / 进入下一工作单元） | 生命周期事件（宿主可提供信号） | 发现四 |
| ④ 变更事件 | 关键可信要素变化：模型升级 / 参照库或基准更新 / 约定或有效域变更 / 已审产物的依赖项改动 | 变更登记表（模型/参照/工具版本），变更即重审受影响者 | §3.6(f) |

四者皆不命中 → **明确不审，并记录理由**（积累"边界内"证据，支撑判据后续收缩）。

**判据①的设计修正（重要）**：**不使用"查例子层历史命中"**。理由见 §3.6(f)——例子层是 L3
按需资产且持续增长，把它作为每次任务的判据会把常驻成本变成无界增长，违背渐进披露原则。
改为**观察当前工作的结构特征**（判据源 = 已常驻的基层 5 条方向，零增量成本）；历史证据退居 L3，
供溯源与**低频校准**（如"边界是否已随模型升级外移"——这是周期性重估问题，不是每次任务问题）。

**判据①的状态载体（v0.3 新增，据 §3.8）**：在"结构特征"之外增加**工作类型状态表**——
每类工作标注 `capability` / `regression` / `retired`：

| 状态 | 判据 | 审查形态 |
|---|---|---|
| `capability` | 有结构特征命中，或新类型尚无证据 | **审**——且审的目的是**采集证据**（记录是否抓到真问题），低命中率属预期，非失败 |
| `regression` | 该类工作已稳定，审查命中率长期为零 | 转**机械自动门**持续跑（防倒退），不调评估器 |
| `retired` | 饱和，无改进信号 | 退出审查范围 |

状态迁移由**命中率证据**驱动，因此 **O2 与 O4 必须同时落地**——没有命中率数据，毕业与收缩都无从判断
（这也是 O2 不能停留为"默认值"选择的原因：默认值只是初始状态，机制的核心是**迁移规则**）。

### M1 初始参数（**猜测值**，待数据校准）

> 前置说明：以下数值**无文献可直接引用**（两篇原文均未给阈值），为**初始猜测**，
> 目的是让机制先能运行；校准依赖 O4 的双向指标数据（漏审率 / 过审率），
> 建议以 1–2 个月的真实使用数据复核一次。凡"猜测值"处，均应视为**待调参数**而非判据。

| 参数 | 初始猜测 | 依据 / 调整原则 |
|---|---|---|
| 判定"毕业"前需累计的同类审查次数 | **20 次** | 统计直觉：若真实命中率为 10%，连续 20 次零发现可使"命中率 < 10%"的置信度约 90%（(0.9)²⁰ ≈ 0.12）；与 Anthropic "20–50 任务起步"同量级（同一来源的规模感，非直接引用） |
| 毕业条件（capability → regression） | 累计 ≥ 20 次且**实质发现 = 0** | 命中率证据驱动 |
| 回退条件（regression → capability） | 出现 **1 次**实质发现，或发生信号④变更事件（模型 / 参照库 / 约定变更） | 单次实质发现即视为边界外移回；变更事件按 §3.6(f) 一律重审 |
| 样本不足（< 20 次） | 保持 capability（**审**） | 无证据 → 默认审（§3.8） |
| 档位联动 | 仅信号① 命中 → **轻量审**；同时命中信号②或③ → **全量审** | 与轨道 2 档位衔接（M1 表） |
| 校准方向 | 漏审率上升 → 收紧（提高门槛 / 扩大回退范围）；过审率偏高 → 放宽（降低门槛） | 由 O4 双向指标驱动 |

**关键前置定义："实质发现"必须可计数**（否则命中率恒为正，永远无法毕业）：

- **计入**：审查提出的问题经 §5.6 意见核验裁决为 ✅ 成立，**且**影响结论 / 数据 / 误差预算 / 状态标签；
- **不计入**：格式、措辞、排版、风格类意见；以及核验裁决为 ❌ / ⚠️ 的部分（§5.6 已定义核验义务）；
- 该定义本身亦为**猜测值**，若实践中发现某类发现难以归类，应先修订定义再累计计数。

**关于历史教训的正确用法（替代上一轮的"预测器"设想）**：

```
真实失败 → 提炼为检查项（VERIFICATION 条目）→ 可机械表达者下沉为脚本/自动门（零 token 常驻执行）
                                           └→ 仅判断型保留为评估器审查项
```

即教训的固化对象是**检查项与自动门**，不是"供每次阅读的例子文本"。此管线与我们既有的
VERIFICATION 体系（RC/NC/PC/CC + 形态列）方向一致，**常驻成本为常数**（检查项增长缓慢、机械项不耗 LLM），
同时"每个真实失败都被固化"的收益不减。例子层在此管线中承担**证据与溯源**角色（L3）。

**判据②的实证支撑**（2026-09-02~04 的真实审查案例，三例全部命中该信号）：
- PLAN_sc_vs_osculating v3：即将进入多阶段执行（下游 = 全部 A–F 阶段）→ 逐版先审再执行（三轮 R7）；
- T9 阶段2 终审裁决：结论即将归档/收尾（下游 = 论文结论）→ 审出 full41 双参照循环论证；
- P1-1 设计：判别脚本即将用于 5 档全链重算（下游 = 整链重算）→ 审出 np.interp 凸性偏置假象。

三例结构相同：**审查对象即将"解锁/固化"下游大量工作**。该属性可外部观察（且可由预分级表承载），
不需要判断"是不是阶段性完成"。

**判据②的实施要点**：预分级表一旦建立，运行时不再做主观判断——这直接回应"凭感觉"的问题：
**把判断提前到登记时刻（一次性），运行期只查表**（发现五(c) 的核心启示）。


### M2 机械层下沉（治"太贵、太细"）

- **规则**：审查输入包（§5.1）只含 **C/H 形态**检查项；**V / V\* 形态项一律由脚本/verifier 自动执行**，
  不进入评估器 prompt；
- **依据**：发现三（官方文档 + 实践分流原则）；且我们已有形态列与 `tools/verifiers/` 基础设施；
- **需先评估**：现有 V/V\* 项的实际脚本覆盖率（哪些真能零 token 判定，哪些名不副实）——
  这是落笔前的前置工作；
- **预期收益（2026-10-08 盘点后修正）**：机械项全覆盖时，单次审查可移除 V/V\* 共 9 项（27 项中的 33%）
  的 LLM 开销；但**真正的降本大头在 H 项的形式层拆分**（见下方盘点结论），
  而非 V 项本身——原表述"token 与时延显著下降"高估了短期效果，此处更正。

**补充：审查内容的边界（治"审得太细"）**——依据 §3.6(e)：
- **不审**：实现路径偏好（存在多条有效路径时，不得以"未按我的方式做"判不通过）；
- **审**：**改变 authority / safety / cost / privacy / recoverability 的轨迹不变量**——
  映射到科研任务即：是否引入未声明约定（可复现性）、是否越过有效域（安全）、是否绕过独立参照
  （authority）、是否改变误差预算口径（cost）。产物侧表述：**最终状态判完成，轨迹判越界**；
- 落地形式：评估器输入包显式声明"不评判实现风格与路径选择"，仅对上述不变量给 pass/fail。

**补充：轨迹维度**（替代"只看产物"）——依据 §3.6(e)：审查对象 = 产物 + 轨迹
（调用了哪些工具、顺序、参数、是否越过步数/迭代预算），可捕捉产物评分完全漏掉的失败
（错误工具、无效循环、跳过前置步骤）。与 RC-06（根因宣布协议）部分重叠，落笔前需去重（见 O7）。

**盘点结论（2026-10-08，本地事实核查，解 O3/O5）**：

现状数据（`VERIFICATION.md` §3 全表 + `tools/verifiers/` 实际实现；**2026-10-08 复核修正**：
首次统计漏掉 SC 系列，数字已更正）：

| 形态 | 数量 | 已实现 verifier | 覆盖率 |
|---|---|---|---|
| V（机械可查） | 5（SC-01 编译语法 / SC-06 未定义符号 / NC-01 锚点对照 / NC-02 收敛阶 / NC-03 守恒残差） | 1（NC-01；实现完整，含 JSON schema） | 1/5 |
| V\*（部分机械） | 4（SC-02 / SC-03 / SC-04 结构自洽类 / PC-01 量纲单位） | 0 | 0/4 |
| H（人工判读） | 14 | — | — |
| C（角色型机制） | 4 | — | — |
| 合计 | **27**（另有 1 行为 §5 格式示例，不计） | 1 | 机械项 **1/9** |

接口成熟度：`interface.py` 为零第三方依赖的 ABC + `register` + `run_verifiers`，单个 verifier 约 40 行
（参考 `checks/anchor_table.py`）——**补实现成本低，瓶颈不在工程而在产物格式**。

**O3 结论**：机械项（V + V\*）共 **9 项，占 27 项的 33%**；已实现 **1 项（11%）**。
→ M2 的落地形态是**"补工具"而非"改条款"**：条款侧只需明确"V/V\* 项不得进入评估器 prompt"，
真正的工作是补 **8 个 verifier**（含 SC 系列结构检查——其中 SC-02/03/04 依赖符号引擎配合，成本高于纯数值类）。

**O5 结论（更有价值的结构发现）**：**形态列描述的是"判定性质"，不等于"执行者"**——
H 形态项可以拆为两层，其中"**形式层**"可脚本化：

| 分层 | 判什么 | 执行者 | 举例 |
|---|---|---|---|
| **形式层** | 动作是否发生 / 字段是否存在 / 结构是否完整 | **脚本** | NC-04 配置与版本记录字段是否齐全；NC-06 是否存在至少一处非同一代码的对照记录；NC-07 引用是否带可解析出处（arXiv ID / 页码 / 公式号）；NC-08 是否**逐物理量**给出收敛表；RC-02 是否逐项给出 pass/fail/need_human；RC-03 日志是否有对应日期条目；RC-07 是否逐条给出核验结论 |
| **内容层** | 做得对不对 / 数值是否正确 / 论证是否成立 | LLM / 人 | 记录是否真实反映运行、对照是否真独立、判定是否合理、证据是否充分 |

→ 即：**14 个 H 项中绝大多数能拆出"形式层"**，把结构完整性类失败从 LLM 审查中剥离。
这才是 M2 降本的主要来源（而非仅 9 个机械项）。

**但有一个前置条件**：形式层脚本化要求**产物具备可解析结构**（如 NC-01 需要 JSON 对照表）。
当前产物多为自由格式 Markdown 报告 → 需要先有"报告结构约定"（如报告须含"锚点对照表 / 假设清单 /
误差预算 / 收敛表 / 独立参照"等**可定位段**）。因此 M2 的完整落地是**三段路径**：

1. **短期（零成本）**：条款明确"V/V\* 项脚本化，不进评估器"——即时收益有限（当前 9 项中仅 1 项已实现）；
2. **中期（中等成本）**：补 8 个 verifier，机械项全覆盖（其中 SC-02/03/04 需符号引擎配合，成本较高）；
3. **长期（真正的降本）**：建立报告结构约定 + H 项形式层拆分——**这是 M2 的主要工作量所在**。

### M3 契约前置阶段定义（消灭事后判断）

§1.2 任务契约新增字段（草案）：
- **工作单元边界**：本契约覆盖到哪（一个可独立验证的交付单元）；
- **单元结束即审查**：是/否 + 档位（轻量 / 全量）；
- **硬阈值**：任一 criterion 低于阈值即整体不通过（现行 RC-02 的"可打分判定"升级为强制性语义）。

**效果**：审查时机在任务开始时即被确定，运行时只是执行契约，不再依赖"感觉"。
**注意**：这会把"审查会不会太多"的前置判断挪到契约协商阶段——契约粒度成为唯一的调参旋钮
（呼应发现二第 3 点：工作单元粒度是可调参数）。

---

## 6. 待决问题（开放项，需 han 裁决或后续证据）

| 编号 | 问题 | 调研可解性 | 结论 / 剩余事项 |
|---|---|---|---|
| O1 | M1 与现有轨道 2 的关系 | ✅ **已解** | 保留轨道 2 骨架与语义（双对象 / 档位分级 / "审查通过≠verified" / 与 §1.3 联动），**仅替换触发判据**（"阶段末" → 四信号），"阶段门"更名为"成本门 / 交接门"（§3.7）。剩余为 §1.7 的**改写范围**——执行事项，非调研问题 |
| O2 | 无历史证据的任务类型默认审还是不审？ | ✅ **已解** | 默认**审**（capability 态：目的是采集证据、定义"什么算成功"，低命中率为预期状态）；稳定后**毕业**为 regression（机械自动门）/ retired（§3.8）。阈值与"实质发现"计数定义见 **§5 M1 初始参数（猜测值，待校准）** |
| O3 | M2 前置评估：V / V\* 检查项的脚本化覆盖率是多少？哪些项名为机械实需判断？ | ✅ **已解**（2026-10-08 本地盘点，含一次自我修正） | 机械项（V+V\*）共 **9 项**，占 27 项的 **33%**；已实现 1 项（NC-01）→ 覆盖率 **11%**。→ M2 落地形态 = **"补工具"而非"改条款"**：条款侧只须声明"V/V\* 不进评估器"，实际工作是补 **8 个 verifier**（接口成熟、单个约 40 行；SC-02/03/04 需符号引擎配合）。详见 §5 M2 盘点结论 |
| O4 | 成本度量指标：由单一"审查命中率"扩为**双向指标** | ✅ **已解** | **漏审率**（undertrigger，该审未审）+ **过审率**（overtrigger，不该审而审）；原值依据："Test both the cases where a behavior should occur and where it shouldn't. One-sided evals create one-sided optimization." 该文另给度量方法论（双向平衡集、20–50 任务起步、每任务配 reference solution 以校验可解性）。剩余为**本地指标定义**（数据源 = 审查记录） |
| O5 | 判断型（C/H）内部是否还有可半机械化的部分（如"参照独立性"可部分由依赖分析脚本检查）？ | ✅ **已解**（2026-10-08 盘点给出结构结论） | **关键发现：形态列描述"判定性质"，不等于"执行者"**——H 项普遍可拆为**形式层**（动作是否发生/字段是否存在/结构是否完整 → 脚本）与**内容层**（做得对不对/数值是否正确 → LLM）。14 个 H 项大多能拆出形式层，**这才是 M2 降本的主要来源**。前置条件：产物需具备可解析结构（报告结构约定）。详见 §5 M2 盘点结论（含逐项拆分示例） |
| O6 | 四信号与"高代价裁决点审批前置"（§1.3）的关系：信号②与审批前置身分重叠 | ✅ **本轮给出结论** | 二者**不是重复机制，而是一条链的两段**：OpenAI 的实现把 tool guardrail（检查）与 `needsApproval`（批准中断）串联在同一流程中。→ 合并表述为"**检查 → 中断 → 批准**"链：信号②③ 命中触发检查，检查结论随批准请求一并呈交，而非并列两条规则 |
| O7 | 轨迹维度与 RC-06（根因宣布协议）去重：二者都约束"过程"，是否合并为轨迹检查项族？ | ✅ **本轮给出结论** | **层次不同，不应合并**：RC-06 = **结论层**轨迹（宣布根因前的证据义务 / 判别纪律）；轨迹检查 = **执行层**轨迹（工具、顺序、参数、步数预算是否越界）。Anthropic 同时持有"不规定实现路径"与"审产出"两条且不冲突。→ 明确分层写入即可 |
| O8 | 预分级表设计：分级维度（可逆性 / 下游成本 / 是否成为参照）× 登记时机（在任务契约内预先登记？） | ⚠️ **部分可解** | 分级**维度**可借 OpenAI（read-only vs write / reversibility / permissions / impact → 映射：只读或写、可逆性、是否成为参照、下游成本）；**具体分级内容**（哪类动作属哪级、登记时机）须本地自定，并应与现有权限门 L0/L1/L2 合流 |

**收口判定（本轮结论）**：调研能把**原则层**全部解决——O1 / O2 / O4 已解，O6 / O7 本轮给出结论，
O8 的维度已定；**仅 O3、O5 属本地事实核查**（盘点现有检查项与 verifier 的实际覆盖率），
不依赖更多文献。因此**调研阶段可收口**：再扩外部来源的边际收益已低，
后续推进应转向本地盘点与机制落笔。

---

## 7. 引用清单

**一手来源**
1. Anthropic Engineering — *Harness design for long-running application development*
   https://www.anthropic.com/engineering/harness-design-long-running-apps
   （引用位置：能力边界判据段、sprint contract 段、评估器取消 sprint 段、context anxiety / reset 段）
2. Anthropic Engineering — *Demystifying evals for AI agents*（v0.3 补入）
   https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
   （引用位置：capability / regression 生命周期与"毕业"机制、"Step 0. Start early"、
   "Step 3. Build balanced problem sets"（undertrigger / overtrigger）、0% 通过率警示）
3. Claude Code 官方博客 — *How to configure hooks*（Stop / SubagentStop / UserPromptSubmit 的适用场景）
   https://claude.com/blog/how-to-configure-hooks
4. Claude Code 官方博客 — *How and when to use subagents in Claude Code*（Independent review 模式）
   https://claude.com/blog/subagents-in-claude-code

**一手来源（OpenAI）**
5. OpenAI — *Guardrails and human review*（Agents SDK 文档；input/output/tool guardrails、
   tripwire、审批中断与状态恢复、阻塞 vs 并行的选择依据）
   https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
6. OpenAI — *A practical guide to building agents*（官方指南 PDF：人工介入的两个触发条件、
   工具风险分级 low/medium/high、按风险触发自动动作）
   https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
7. OpenAI Evals — grader 类型定义（string / Python code / model judge / human）与 trace grading
   （轨迹评分）；本文引用其类型阶梯概念，具体表述经二手来源核实

**二手来源（仅作实践佐证，未用于判据设计）**
8. spillwave.com — *Claude Code Verification*（三层验证、hooks/subagent 分工的实践归纳）
9. blog.blackwell-systems.com — *Self-Validating Agents*（PostToolUse / Stop / validator agent 三层结构）
10. timewell.jp — *Automating Code Review with Claude Code*（"机械检查交给 hook、语义判断交给 subagent"原则的表述）
11. tallyfy.com — *Three workflow patterns every AI agent needs*（阶段间评估门控的类比）
12. dev.to（aijasonz / shaam_ai）— 评估器与自评的比较、停止条件与迭代上限
13. cohorte.co — *How to Evaluate AI Agents: The Eval Stack*（grader 成本阶梯、"grade the world before
    the words"、"do not grade preferred implementation details... do grade trajectory invariants"）
14. qaskills.sh — *OpenAI Evals Trace Grading*（Python grader vs model grader 的分工、失败转回归用例）
15. aimec.io / openlayer.com / tuningengines.com — OpenAI evals 实践综述（deterministic vs model-graded 的
    适用面与成本对比）
16. ericfu1120.github.io / theneuron.ai — 对 Anthropic *Demystifying evals* 的整理（capability vs
    regression 对照表、/claude-api 工作流），用于交叉核对第 2 条一手来源

> 注：§3.3 的"分流原则"与 §3.4 的 handoff 工件纪律在二手来源中表述最完整；
> 落笔前若需作为条款依据，应回到一手来源逐句核实（Anthropic 另有 *Effective harnesses for
> long-running agents* 一文，本稿未直接引用其原文，仅由二手转述，须补一手核实后方可引为判据）。

---

## 8. 结论摘要

1. **"何时审查"的答案不是找更好的阶段判据，而是换一类判据**：能力边界（任务属性）+ 下游代价
   （结构属性）+ 生命周期边界（事件）+ 变更事件——四者皆可外部观察，且前三者中各有**两个独立来源**
   （Anthropic / OpenAI）相互印证（§3.7）；
2. **判据应静态化**：把"要不要审"的判断提前到**登记时刻**（风险预分级表、基层结构特征表），
   运行期只查表、不判断——这是"凭感觉选时机"的工程解法（发现五(c)）；
3. **"阶段性完成"的正解是事前写进契约**（工作单元边界 + done + 硬阈值），不是事后判断；
   契约粒度是唯一的调参旋钮（发现二）；
4. **"太贵、太细"有两层解法**：① 机械/语义分流——V 形态走脚本（零 token），只有 C/H 调评估器；
   ② 审查内容边界——不审实现路径偏好，只审改变权限/安全/成本/可复现性的**轨迹不变量**（发现三 + §3.6(e)）；
5. **历史教训的正确固化对象是"检查项与自动门"，不是"供每次阅读的例子层"**：
   失败 → 检查项 → 可机械化者下沉为脚本/自动门；例子层退居证据与溯源（L3），
   从而常驻成本为常数（§3.6(f)）——修正了本稿 v0.1 中"例子层作预测器"的设想；
6. **三来源均不使用"阶段"作为触发判据**——v0.11 轨道 2 的"阶段末"判据应予替换，
   但轨道 2 的骨架（双对象、档位、审查通过≠verified、与 §1.3 联动）保留（§3.7 + O1）；
7. **"默认审还是不审"不是静态选择，而是任务类型的生命周期状态**（§3.8，Anthropic 一手）：
   新类型 = capability 态 → **审**（目的是采集证据、明确成功标准；低命中率为预期态）；
   稳定后 **毕业**为 regression（机械自动门持续跑）或 retired（退出）。
   因此默认值只是**初始状态**，机制的核心是**迁移规则**——而迁移依赖双向命中率数据，
   **O2 与 O4 必须同时落地**；
8. **审查机制本身也需要被评估，且评估集必须双向平衡**（§3.8：undertrigger / overtrigger）：
   只测一边会导致单向优化——"该审未审"与"不该审而审"必须分别度量。
   （附警示：某类工作"审查屡屡无功"时，先怀疑审查配置本身有问题，再考虑收缩。）
