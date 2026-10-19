# Prover-Verifier Games improve legibility of LLM outputs（OpenAI，arXiv 2407.13692）

- **元数据**：Kirchner / Chen / Edwards / Leike / McAleese / Burda（OpenAI Superalignment Games）｜ 2024
  ｜ 输出可核查性（legibility）｜ 一手（论文）｜ 获取 2026-10-16
  ｜ 快照 `run/survey/sources/b3-prover-verifier.txt`（sha256 前 16 位 `271afc9c50d7099b`）
  ｜ URL: https://arxiv.org/abs/2407.13692

## ① 任务分解与角色架构

训练期三角色（非推理期架构）：

- **small verifier**：预测解答是否正确（弱验证者）；
- **helpful prover**：产生"正确且验证者能接受的"解答；
- **sneaky prover**：产生"错误但能骗过验证者"的解答（对抗方）；
- 迭代训练（prover 与 verifier 互为对手）。

## ② 验证/审查机制（核心：legibility 是独立属性）

- **定义**：legibility = "reasoning that is clear and easy to check"；
- **关键发现**：**只按答案正确性优化 CoT，会让推理变得更不可核查**（"optimizing chain-of-thought
  solutions only for answer correctness can make them less legible"）；
- 训练结果：helpful prover 准确率与 verifier 抗对抗鲁棒性**同步上升**；
- **可迁移到人**：训练后的 legibility 让"时间受限的人类"核查准确率上升（查 helpful prover 时升，
  查 sneaky prover 时降）——即 **"为小验证者训练可核查性"能改善人类核查效率**。

## ③ 上下文/记忆策略

无关。

## ④ 人工介入点

人是最终验证者；研究目标即"降低人的核查成本"。时间受限（time-constrained）是明确设定的约束。

## ⑤ 成本/规模实测

小学数学（grade-school math）域；无 token 成本；给出"人类时间受限下准确率变化"的度量范式。

## ⑥ 失败模式与自述局限

仅数学域；legibility 与正确性可能此消彼长（需联合优化）；训练方法需要可训练的 prover（我们无常驻训练）；
sneaky prover 的对抗强度依赖训练强度。

## ⑦ 与 UnivEdge 对照（对 T1/T2 设计有直接用处）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "结论必须可被独立核查" ↔ 锚点原则 + 锚点链（"该表即审查者的核对对象，免其重做全链"）；② "弱验证者也能核" ↔ T1 抽验（低成本档）的隐含前提 |
| **已有但更弱（关键缺口）** | **产物的"可核查性"不是显式要求**：§0.4 要求三件套 + 锚点链，但**没有判据检验"一个不了解过程的审查者能否仅凭产物完成核对"**。T1 之所以能便宜，前提正是 legibility；若产物靠"作者记忆/对话上下文"才能读懂，T1 会**静默漏检** → **候选 P12**（产物可核查性判据 + 探针：弱审查者仅凭产物复核 1 条结论） |
| **缺失（可吸收）** | ① **"正确性优化会降低可核查性"** 这一反向压力：我们的产物若只追求"结论对/字段齐"，可能越写越难查（长推导、隐含步骤）→ 需在 §0.4 明确"步骤可定位、引用可解析"；② **时间受限核查**作为度量口径：审查成本应按"审查者所需时间/步数"度量（服务 docs/15 的 4 项待补数据之一：审查成本占比） |
| **冲突** | 无。与 Anthropic"end-state 评估"不冲突：legibility 讲"产物形态"，end-state 讲"判定对象" |

## ⑧ 可移植性判定

**内核**（P12：可核查性判据 + 度量口径）；**不适用**：训练期 prover-verifier 博弈（无常驻训练能力）。

## ⑨ 直引

1. "One way to increase confidence in the outputs of Large Language Models (LLMs) is to support them with
   reasoning that is clear and easy to check — a property we call legibility."
2. "optimizing chain-of-thought solutions only for answer correctness can make them less legible."
3. "we show that legibility training transfers to time-constrained humans tasked with verifying solution
   correctness."
4. "the helpful prover's accuracy and the verifier's robustness to adversarial attacks increase over the course
   of training."

## ⑩ 探针草案（候选 P12）

- 机制：产物可核查性（弱验证者仅凭产物可复核）；
- 探针：取一份真实产物 + 一条结论，交给**无会话上下文**的审查者（或模拟弱验证者的受限提示：
  只给产物文件，不给生成过程），要求复核 → 断言能在产物内定位到全部证据链；
- 负控：另一条"证据仅在对话中"的结论 → 必须被判为不可核查（→ 产物缺陷）；
- 破坏式：移除"可定位证据"要求 → 探针在靠记忆补全的产物上失败。
