# 研究想法的评价陷阱：Si et al.（2409.04109）+ Ideation–Execution Gap（2506.20803）

- **元数据**：
  - **B5-2a** Si / Yang / Hashimoto（Stanford），*Can LLMs Generate Novel Research Ideas? A Large-Scale Human
    Study with 100+ NLP Researchers*｜2024｜快照 `run/survey/sources/b5-si.txt`｜URL: arxiv.org/abs/2409.04109
  - **B5-2b** 同组，*The Ideation–Execution Gap: Execution Outcomes of LLM-Generated versus Human Research
    Ideas*｜2025-06｜快照 `run/survey/sources/b5-gap.txt`｜URL: arxiv.org/abs/2506.20803
  - 均一手；获取 2026-10-19。**b 是对 a 的追踪研究**（同一批想法的执行后复评）。
- **为何合并**：a 证明"想法阶段 AI 得分更高"，b 证明"执行后优势消失甚至反转"——合起来才是完整教训。

## ① 任务分解与角色架构

- a：100+ NLP 研究者写想法 + 盲审 AI/人类想法（控制主题、格式、评审盲法）；AI 侧 = RAG + 过生成 + 重排；
- b：43 位专家随机领想法，**每人投入 >100 小时**实现并写 4 页短文，再盲审。

## ② 验证/审查机制（核心：评价的有效性取决于是否执行）

| 指标 | 人类想法 | AI 想法 | AI+人工重排 |
|---|---|---|---|
| 新颖性（想法阶段） | 4.84 | **5.64** (p<0.01) | 5.81 |
| 兴奋度 | 4.55 | 5.19 (p<0.05) | 5.46 |
| 可行性 | 6.61 | 6.34（n.s.） | 6.44 |
| 预期有效性 | 5.13 | 5.47（n.s.） | — |

**执行后（b）**：同一批想法重新评审，**AI 想法得分下降显著多于人类想法**（novelty/excitement/effectiveness/overall
均 p<0.05）；多项指标**排名反转**（人类高于 AI）。
结论原文："**This ideation–execution gap highlights ... the challenge of evaluating research ideas in the
absence of execution outcomes.**"

## ③ 上下文/记忆策略

无（评测研究）。

## ④ 人工介入点

两类都靠人类专家盲审（a：100+；b：43 位执行者 + 盲审）。

## ⑤ 成本/规模实测

a：100+ 研究者、7 主题、~110 想法/条件；b：43 专家 × >100 h ≈ **4300+ 人时**的执行成本。

## ⑥ 失败模式与自述局限

- **自评失效**（a 明确列为开放问题）；**生成多样性不足**（a）；
- 人类对"新颖性"的判断本身不稳（a 自述）；
- 想法阶段的评分**无法预测执行结果**（b 的直接结论）；
- 局限：NLP 领域、单次执行研究；执行质量也受执行者影响。

## ⑦ 与 UnivEdge 对照（对"前瞻审查"最关键的一批证据）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "审查通过 ≠ verified"（§1.7 明写：只确认"本单元可验证、下一单元计划可执行"）↔ b 的核心教训；② 任务契约须含**测试计划**（§1.2、§5.5）↔ b 的"执行才有判别力"；③ §3.5 最小可验证单元先行 ↔ 用小规模执行替代纸面判断 |
| **已有但更弱（关键）** | **"计划阶段评分不可作为通过依据"的强度不足**：我们允许"前瞻审查"给计划背书（虽然注明 ≠ verified）。b 显示：**想法阶段的高分在执行后系统性塌陷**。建议在 §1.7 双对象的"前瞻"处加一句：**前瞻审查只能判"是否值得执行"，不得判"方案正确"；高风险方案须附最小执行证据**（与 §3.5 呼应）→ **候选 P18**（判断类；可能与 §3.5/§1.7 重复，须过吸收门第 3 问） |
| **缺失（可吸收）** | "人类对新颖性的判断也不稳"→ 对我们审查的启示：**审查结论本身应记录置信度/分歧**（与 P13 一致，不新增） |
| **冲突** | 与 B2-1（AI Scientist 自动评审近人类）无冲突：那是"评论文/答案质量"，本卡是"评想法/方案"——**对象不同，结论不同**（评方案更难） |

## ⑧ 可移植性判定

**内核**（P18：前瞻审查的判据边界）；**不适用**：想法生成与重排（我们不做自动选题）。

## ⑨ 直引

1. （a）"we find LLM-generated ideas are judged as more novel (p < 0.05) than human expert ideas while being
   judged slightly weaker on feasibility."
2. （a）"we identify open problems in building and evaluating research agents, including **failures of LLM
   self-evaluation** and their **lack of diversity in generation**."
3. （b）"Each expert spent over 100 hours implementing the idea and wrote a 4-page short paper."
4. （b）"the scores of the LLM-generated ideas decrease significantly more than expert-written ideas on all
   evaluation metrics (novelty, excitement, effectiveness, and overall; p < 0.05)"
5. （b）"we even observe that for many metrics there is a **flip in rankings** where human ideas score higher
   than LLM ideas."
6. （b）"this ideation–execution gap highlights ... the challenge of evaluating research ideas in the absence of
   execution outcomes."

## ⑩ 探针草案（候选 P18）

- 机制：前瞻审查只判"值得执行"，高风险方案须附最小执行证据；
- 探针：给一份"看起来完备但未执行"的方案 → 断言审查输出为"可执行（待验证）"，不得为"方案正确"；
  负控：附最小执行证据的方案 → 可给"已验证（该单元）"。
- 破坏式：若把前瞻审查当作通过依据 → 探针在"高分但执行塌陷"的样例上失败（可用 b 的数据构造）。
