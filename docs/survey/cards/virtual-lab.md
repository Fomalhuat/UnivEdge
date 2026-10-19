# The Virtual Lab（Stanford，bioRxiv 2024.11.11.623004）

- **元数据**：Swanson / Wu / Bulaong / Pak / Zou（Stanford + CZ Biohub）｜ 2024-11-11 预印本 ｜ 跨学科 AI 团队
  做纳米抗体设计 ｜ 一手（bioRxiv 全文）｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-virtual-lab.txt`
  （sha256 前 16 位 `47d1692e78aac661`）｜ DOI: 10.1101/2024.11.11.623004
- **备注**：种子清单中我原记的 arXiv ID（2411.10109）**有误**（那是另一篇论文）；正确载体为 bioRxiv 本预印本。

## ① 任务分解与角色架构

- **PI agent**：由人类给项目简述后，**自动生成科学家团队**（自动写 title/expertise/goal/role）并统筹；
- **两类会议**：
  - **Team meeting**：人类写 agenda → PI 给初始思路与议程问题 → N 轮讨论：每个 scientist agent 发言 →
    **Scientific Critic 逐一批评** → PI 综合并追问 → N 轮后 PI 总结；
  - **Individual meeting**：单 agent 干活（写代码/算参数），旁边可配 Scientific Critic；
- **Scientific Critic agent**：专职"识别每个 agent 响应中的错误与局限"（**每轮都批评**，非终局审查）。

## ② 验证/审查机制

- 内环：Critic 的**逐轮批评**（过程内审查）；
- **并行会议 + 合并**：同一会议以高温度 **0.8** 并行跑 N 份 → 单次合并会议以低温度 **0.228** 由 PI 融合
  （"boost creativity while producing a consistently high-quality answer"；数据：提升一致性与质量；
  与传统多数投票的差别是"通过 LLM 会议做更灵活融合"）；
- 外环：**真实湿实验验证**（92 个新纳米抗体，其中 2 个对 JN.1/KP.3 变体结合改善且保持对祖先株结合）。

## ③ 上下文/记忆策略

会议记录构成共享上下文（团队记忆）；无独立机制描述。

## ④ 人工介入点（本卡最有价值的数据）

- 人类角色 = 写 agenda + 高层反馈；**参与度被量化**：全流程人类研究者的书写量 **1,596 words = 1.3%**，
  agents 写 **122,462 words = 98.7%**（含全部 Python 脚本）；
- 会议内话语权：project spec 会议 PI 36.4% > Critic 21.0%；individual meeting 有 Critic 时
  scientist 66% / critic 33% / human 1%；无 Critic 时 agent >80% / human <20%。

## ⑤ 成本/规模实测

未报 token 成本；规模＝92 设计 + 湿实验；人类书写占比 1.3%（如上）。

## ⑥ 失败模式与自述局限

人类监督仍关键（外部评价引文：现阶段不宜完全信任 AI 决定）——论文自身也把人放在 agenda/验证位；
agent 会议时长 5-10 分钟（讨论深度受限，二手来源）；训练数据时效、工具不完美（二手来源转述）。
> 注：上述两条局限来自二手报道，卡片仅作提示，不入判据（按 §0.4 一手性要求）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① Critic 角色 ↔ 怀疑派评估器；② 人类写 agenda/定目标 ↔ 人类掌舵；③ "逐轮批评再综合" ↔ §5.5 测试设计审查 + §5.6 意见核验的"检查→核验"链（我们发生频率更低、更结构化） |
| **已有但更弱** | **"过程内逐轮批评"**：我们的审查是**节点式**（宣称/决策门触发），Virtual Lab 是**每轮都过 Critic**——对应到我们即"每个回合都由 critic 过一遍"，成本极高。**不吸收其频率**，但其**角色专名化**（critic 专职找错，非综合者）可对照我们"评估者不做修订"的边界 |
| **缺失（可吸收，评估）** | **并行采样 + 低温合并**（parallel-then-merge）作为"降方差"手段：与 AI Scientist 的 ensembling 结论互补（后者：降方差但不提性能）。对 UnivEdge 的适用场景：**高风险数值判定的重复实验**（如关键量多路独立计算后合并）——但这更像领域侧方法而非内核条款。→ 记观察，与 P3（end-state）同族 |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核（弱）**：critic 角色边界对照；**领域资产（可能）**：并行采样+合并用于关键数值判定；
**不适用**：自动组队（我们无团队模拟需求）。

## ⑨ 直引

1. "the PI agent automatically creates several scientist agents to work on the project by specifying their
   title, expertise, goal, and role."
2. "each scientist agent provides its response, followed by a critique by the Scientific Critic agent, with
   the PI agent then synthesizing the discussion and asking follow-up questions."
3. "each of the parallel meetings is run with a higher 'creative' temperature of 0.8 while the single merge
   meeting is run with a lower 'consistent' temperature of 0.228."
4. "the human researcher wrote only 1,596 words... which is just 1.3% of all the words written by the Virtual
   Lab... In contrast, the LLM agents wrote 122,462 words (98.7% of all words)."

## ⑩ 探针草案

无（观察项）。
