# LLM-as-a-judge 的可靠性（MT-Bench judge + Fair Evaluator，两篇合并）

- **元数据**：
  - **B3-1a**：Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*（arXiv 2306.05685，NeurIPS 2023 Datasets & Benchmarks）｜快照 `run/survey/sources/b3-mtbench-judge.txt`（sha256 前 16 位 `e47c52fd43c514c6`）
  - **B3-1b**：Wang et al., *Large Language Models are not Fair Evaluators*（arXiv 2305.17926，ACL 2024）｜快照 `run/survey/sources/b3-fair-evaluator.txt`（sha256 前 16 位 `9cb7e731f3a65c6f`）
  - 均为**一手**（论文），获取 2026-10-16
- **为何合并**：两篇共同构成"LLM 评估者能用，但必须校准"的完整证据链（能力 + 偏差 + 缓解）。

## ① 任务分解与角色架构

单 LLM judge 对两个候选答案做打分/比较（pointwise 或 pairwise）；无多级 agent 架构。

## ② 验证/审查机制（本卡核心）

### 能力上界（B3-1a）
- GPT-4 judge 与人类偏好一致率 **>80%**，"**the same level of agreement between humans**"（3K 专家票 + 3K 众包票）；
- MT-bench（多轮问题集）+ Chatbot Arena（众包对战）两个基准。

### 四类偏差（B3-1a）
| 偏差 | 量级 |
|---|---|
| **位置偏差** | 交换顺序后一致性：**GPT-4 default 仅 65.0%**、Claude-v1 仅 **23.8%**、GPT-3.5 46.2%；"biased toward first" 最高 75% |
| 冗长偏差 | 偏好更长回答（较小，可缓解） |
| 自我增强 | GPT-4 给自己 **+10%** 胜率；Claude-v1 **+25%**；GPT-3.5 不偏向自己（无法定论） |
| 推理能力有限 | 数学/推理题评分能力弱；**CoT 提示下"judge 常犯与被评答案相同的错误"** |

### 缓解手段（两篇合起来）
- **交换位置 / 双向聚合**（B3-1a）；**Balanced Position Calibration（BPC）**：多顺序聚合（B3-1b，**+14.3% 对齐**）；
- **Multiple Evidence Calibration（MEC）**：先产证据再打分（**+9.8%**）；few-shot（但 API 成本 ×4）；
- **reference-guided judge**：给参考解再评（针对数学/推理）；
- **Human-in-the-Loop Calibration（HITLC）**：用"位置多样性熵"度量样例难度 → **难例找人**；
  仅 20% 人工标注即达到/超过平均人类对齐，人工成本降最多 **39%**（B3-1b）。

### 偏差的严重性（B3-1b 的极端演示）
"**Vicuna-13B could beat ChatGPT on 66 over 80 tested queries with ChatGPT as an evaluator**"——
仅靠改变回答出现顺序即可操纵结论。

## ③ 上下文/记忆策略

无关（评估范式的可靠性研究）。

## ④ 人工介入点

**HITLC**：按"评估难度"（分歧熵）选择性引入人类 —— **不是全量人工，也不是全自动**，
给出"何时找人"的可计算信号。

## ⑤ 成本/规模实测

few-shot judge 的调用成本 ×4（B3-1a）；HITLC 在 20% 人工下达到可比对齐、成本降 39%（B3-1b）。

## ⑥ 失败模式与自述局限

位置偏差可**完全翻转**排序；自我增强偏差存在但未定论；数学评分不可靠（CoT 不能修复）；
两篇均为"偏好/答案质量"场景，未覆盖"科研结论正确性"（后者更接近有 oracle 的判定）。

## ⑦ 与 UnivEdge 对照（本卡价值最高）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① 外部评估者而非自评 ↔ §5 怀疑派评估器；② "评估者需校准" ↔ §5.3 调优 + 分歧日志；③ HITLC 的"难例找人" ↔ `need_human` 状态 + §1.3 审批链（但我们的触发靠评估者主观判断） |
| **已有但更弱（重要缺口）** | **① 顺序/表述不变性从未被检验**：我们的审查结论对"证据呈现顺序、措辞、篇幅"的敏感性**没有任何探针**。若审查者存在位置偏差，"同一产物换个顺序就换结论"会直接污染 verified 状态 → **候选 P13（高优先）**；**② 升级信号可计算化**：docs/15 待决①（档位自动升级信号）一直缺"可观测信号"，HITLC 给出范式——**用"同一审查的多顺序/多表述结论分歧度"作为升级/送人信号**（分歧大 → 升 T2 或 need_human）→ 并入 P13；③ 我们无"评估者自我增强"检查（评估者与被审产物同模型时）→ P13 附项 |
| **缺失（可吸收）** | MEC（先证据后打分）与 reference-guided（给参考锚点）两种提示结构——我们的评估器 prompt 是否已含"先列证据再裁决"？→ 与 P7（输出格式）合并核查 |
| **冲突** | 与"单 judge 优于多 judge"（B1-2/B2-1）**不冲突**：本卡的"多顺序聚合"是同一 judge 的重复测量，不是多个 judge 的集成 |

## ⑧ 可移植性判定

**内核**（P13 顺序不变性探针 + 分歧度升级信号；P7 输出结构）；**宿主**（多顺序重复调用的成本控制）。
全部与领域无关，可直接落。

## ⑨ 直引

1. "strong LLM judges like GPT-4 can match both controlled and crowdsourced human preferences well,
   achieving over 80% agreement, the same level of agreement between humans."
2. "Consistency is the percentage of cases where a judge gives consistent results when swapping the order of
   two assistants... GPT-4 default 65.0%... Claude-v1 default 23.8%."（Table 2）
3. "GPT-4 favors itself with a 10% higher win rate; Claude-v1 favors itself with a 25% higher win rate."
4. "even with the CoT prompt, we find that in many cases LLM makes exactly the same mistake as the given
   answers in its problem-solving process"
5. "Vicuna-13B could beat ChatGPT on 66 over 80 tested queries with ChatGPT as an evaluator."（仅靠换顺序）
6. "our MEC and BPC enhance the evaluation alignment of GPT-4 and ChatGPT by 9.8% and 14.3% accuracy,
   respectively."
7. "with only a 20% human annotation cost, GPT-4 and ChatGPT can achieve comparable or even better annotation
   alignment with the average human performance, reducing the annotation cost by up to 39%."

## ⑩ 探针草案（候选 P13）

- 机制：审查结论的**顺序/表述不变性** + 分歧度作为升级信号；
- 探针：取同一份产物与同一组证据，构造 **A/B 两个等价呈现**（顺序互换 + 无关措辞改写）→
  断言两次审查的 S0/S1 集合一致；若不一致 → 触发升级（T2 或 need_human）；
- 负控：真正不同的两份产物应给出不同结论（避免"永远一致"的假通过）；
- 破坏式：移除不变性检查 → 探针在已知偏差样本上必须失败。
