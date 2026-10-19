# Large Language Models Cannot Self-Correct Reasoning Yet（arXiv 2310.01798）

- **元数据**：Huang / Chen / Mishra / Zheng / Yu / Song / Zhou（Google DeepMind / UIUC 等）｜ 2023（ICLR 2024）
  ｜ 自我纠错的能力边界 ｜ 一手（论文）｜ 获取 2026-10-16
  ｜ 快照 `run/survey/sources/b3-self-correct.txt`（sha256 前 16 位 `50e4fd99abc758a0`）
  ｜ URL: https://arxiv.org/abs/2310.01798

## ① 任务分解与角色架构

非系统论文：对"self-correction"范式做受控检验。区分两类：

- **intrinsic self-correction**：仅凭模型自身能力（无外部反馈）改自己的答案；
- **with oracle labels / external feedback**：有正确答案或外部工具信号时纠错。

## ② 验证/审查机制（核心结论）

- **无外部反馈时，自我纠错在推理任务上失败，且常常降低性能**："without the use of oracle labels,
  self-correction **consistently results in a decrease in performance**"；
- 机制诊断（GSM8K，GPT-3.5）：两轮自纠后 **74.7% 保持原答案**；在改动的样本中，
  **"more likely to modify a correct answer to an incorrect one than to revise an incorrect answer to a
  correct one"**；根因："LLMs cannot properly judge the correct[ness]"；
- 结论：自我纠错的有效性依赖**外部信号**（oracle、工具、人或更强验证者），而非"再想一遍"。

## ③ 上下文/记忆策略

无关。

## ④ 人工介入点

隐含：外部反馈是其有效性的必要条件（人/oracle 属外部反馈）。

## ⑤ 成本/规模实测

受控实验（多数据集、多模型，含 GPT-3.5/GPT-4/GPT-4-Turbo/Llama-2），无成本数据。

## ⑥ 失败模式与自述局限

- 自纠把对的改错 > 把错的改对；"多数投票/多轮自省"不能替代外部验证；
- 局限：结论限于**推理任务**（数学/多跳问答）；对"有明确判据的格式化任务"未必适用（作者亦不主张过度外推）。

## ⑦ 与 UnivEdge 对照（对 T0 的边界极重要）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "外部评估者不可省" ↔ 怀疑派评估器 + L2 解耦；② "LLM 无权自行声称已验证" ↔ §0.3 状态机；③ 生成者不得自评通过 ↔ §1.7 |
| **已有同构（且有外部实证支持，非缺口）** | **T0 自检的效力边界已写明**（核对现行 §0.4 原文）："*只抓'锚点不匹配'类疏忽，不替代独立重推（`docs/15`）*"——与本文结论（无外部反馈的自纠不可靠）方向一致。**本文为该已写条款提供外部实证**（并可补一句量化论据：自纠"对改错 > 错改对"）；**不需要新增条款**（推翻我起草时的第一版判断：原以为边界未写，核对后发现已写——留痕） |
| **缺失（可吸收，弱）** | 自纠失败的**方向性统计**（对改错 > 错改对）可作为"为什么审查者必须独立"的量化论据，补入 §5.1 的解耦理由（外部锚，非新条款） |
| **冲突** | 无（T0 是对锚点核对，不是自由自省；边界已有文字） |

## ⑧ 可移植性判定

**内核**（P15 边界条款 + §5.1 论据）；无宿主依赖。

## ⑨ 直引

1. "LLMs struggle to self-correct their responses without external feedback, and at times, their performance
   even degrades after self-correction."
2. "without the use of oracle labels, self-correction consistently results in a decrease in performance."
3. "For GSM8K, 74.7% of the time, GPT-3.5 retains its initial answer. Among the remaining instances, the model
   is more likely to modify a correct answer to an incorrect one than to revise an incorrect answer to a
   correct one."
4. "The fundamental issue is that LLMs cannot properly judge the correct[ness]..."

## ⑩ 探针草案

**不单列候选**（条款已存在）。可作为 §0.4 已有条款的**回归探针**（若 docs/15 已布置类似断言则复用，
需在收口时与 T1/T2 的测试集合并去重）：构造"锚点链字段齐全但结论数值错"的样例 → 断言 T0 结构通过
**且**状态仍为 `claimed`；负控：结构缺失 → T0 必须失败。
