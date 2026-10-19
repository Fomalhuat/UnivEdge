# Towards an AI co-scientist（Google，arXiv 2502.18864）

- **元数据**：Gottweis et al.（Google Cloud AI Research / DeepMind / Stanford 等）｜ 2025 ｜ 生物医学假设生成
  ｜ 一手（论文）｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-coscientist-google.txt`
  （sha256 前 16 位 `a0e0cecae11595fa`）｜ URL: https://arxiv.org/abs/2502.18864
- **备注**：本卡与 Coscientist（Boiko 2023）**不是同一个系统**，勿混。

## ① 任务分解与角色架构

"generate, debate, and evolve"（Gemini 2.0 多 agent + 异步任务队列）：

| Agent | 职责 |
|---|---|
| Supervisor | 解析研究目标 → 计划配置 → 给各 agent 分配权重与资源 → 入任务队列 |
| Generation | 生成假设；用**自批评 + 自对弈**模拟专家辩论多轮；识别可检验的中间假设；研究扩展 |
| **Reflection** | **"simulates the role of a scientific peer reviewer"**——审查正确性/质量/新颖性，评估对现有观察的解释力 |
| Ranking | **Elo 锦标赛**：成对比较（由"模拟科学辩论"承载），持续排名 |
| Proximity | 近似图 → 聚类/去重 |
| Evolution | 精炼排名最高的假设（综合/类比/文献/非常规推理/简化） |
| Meta-review | **综合全部评审 → 提炼反复出现的模式 → 用于优化其他 agent（元层学习环）** + 给科学家出综述 |

**test-time compute 可扩展**（异步框架：加算力即提升假设质量；"continued benefits of test-time compute"）。

## ② 验证/审查机制

- 审查即"模拟同行评审"（Reflection）；排名即"持续锦标赛"（两两对抗 + 辩论）；
- **默认评判标准**：novelty / **testability（"amenable to empirical validation within the constraints
  specified by the scientist"）** / safety；**可由科学家配置附加 criteria**（判据可配置）；
- **安全审查三层**：① 研究目标安全审查（输入层，拒绝不安全目标）；② 假设安全审查（即使目标安全也逐条
  审查，不安全假设**从锦标赛中剔除、不再发展、不呈现**）；③ meta-review 持续监控研究方向并告警；
  另做对抗性目标测试；
- 最终验证靠**真实湿实验**（三个独立协作研究报告；AML 候选、肝纤维化靶点、细菌基因转移机制）。

## ③ 上下文/记忆策略

论文（research plan）持久化 + 评审综合（meta-review 出综述）；无更多细节。

## ④ 人工介入点

科学家给目标 + 配置 criteria；产出为"给科学家审阅的综述 + 假设"——**人在回路的上游（定目标）与
下游（验证）**，中间全自动。

## ⑤ 成本/规模实测

test-time compute 收益持续但未给绝对成本；三领域实证验证（含体外/类器官实验）。

## ⑥ 失败模式与自述局限

"requires extensive investigation beyond the scope"（安全面）；生物医学以外的泛化未验证；
无"自动实验"能力（验证仍依赖人/实验室）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① Reflection≈怀疑派评估器（角色化"同行评审"）；② 安全层拒绝 ↔ 权限门 L0-L2 的一部分；③ "testability"为标准之首 ↔ 我们的"判据可判定"（§5.5 五项之一） |
| **已有但更弱** | **评审标准可配置**：我们 §5.2 评分标准固定；co-scientist 支持"科学家额外配置 criteria/输出格式"——对**不同任务类型定制审查判据**有借鉴（但注意与我们"判据静态化"原则的张力，勿轻加） |
| **缺失（可吸收，评估）** | ① **对候选方案的持续排名/淘汰机制**（Elo 锦标赛）：UnivEdge 的同类场景是"多方案并行时的比较"（少见）；当前由人来裁决。**先记观察**，不急于吸收（无本地失败模式）；② **元层学习环**（meta-review 把"评审中反复出现的模式"用于改下次评审）↔ 我们的教训库/分歧日志已有弱版本；③ 假设级安全审查 ↔ 无对应（科研助手无实验室执行权，暂不适用）；④ **test-time compute 可扩展**的架构 ↔ 我们的审查档位 T1/T2 是"固定档位"，而他们是"同机制加算力持续改善"→ 与 P2/P3 同源，补一个数据点 |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核（评估）**：criteria 可配置性、元层学习环两点值得评估但不急落；
**不适用**：Elo 锦标赛（用于大量候选假设的开放式探索，UnivEdge 场景少）、湿实验验证链、安全层
（我们无执行权）。

## ⑨ 直引

1. "This agent simulates the role of a scientific peer reviewer, critically examining the correctness, quality,
   and novelty of the generated hypotheses and research proposals."（Reflection）
2. "The Ranking agent employs and orchestrates an Elo-based tournament to assess and prioritize the generated
   hypotheses... pairwise comparisons, facilitated by simulated scientific debates."
3. "automated safety evaluation. Goals deemed potentially unsafe are rejected."
4. "Potentially unsafe hypotheses are excluded from the tournament, not developed any further, and are not
   presented to the user."
5. "The system outputs should be amenable to empirical validation within the constraints specified by the
   scientist."（Testability 判据）
6. "synthesizing insights from all reviews, identifying recurring patterns in tournament debates, and using
   these findings to optimize other agents' performance in subsequent iterations."（Meta-review）

## ⑩ 探针草案

无新探针（与 P2/P3 同源的数据点，不单列）。
