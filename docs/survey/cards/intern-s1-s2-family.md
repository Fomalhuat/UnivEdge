# 书生科学基座模型家族：Intern-S1 → S1-Pro → S2（上海AI实验室）

> 调研轮次：Round 2（2026-11-19）｜ 卡片编号：C2-3 ｜ 采集人：Enki
> **定位**：本卡用来回答"书生到底是微调模型还是 harness"——它是**模型线**，与 `shlab-duanyan-science-harness.md`（harness 线）、`internagent-1.5.md`（agent 线）并列。

## 元数据

| 字段 | 值 |
|---|---|
| Intern-S1 | arXiv 2508.15763，2025-08-21（v2 08-24），上海AI实验室等 177+ 作者 |
| Intern-S1-Pro | arXiv 2603.25040，2026-03，"Scientific Multimodal Foundation Model at Trillion Scale"，CC BY 4.0，开放权重（HF `internlm/Intern-S1-Pro`） |
| 书生-S2 | 官方发布 2026-09-21（浦江创新论坛）；`Intern-S2-397B`，HF `Internlm/Intern-S2-397B` / ModelScope `Shanghai_AI_Laboratory/Intern-S2-397B`；代码入口 github.com/InternLM/Intern-S1 |
| 一手性等级 | S1 / S1-Pro = **T1 技术报告**；S2 = **T2 官方发布稿**（未见 arXiv） |
| 获取日期 | 2026-11-19 |
| 快照 | `interns1-abs.html` sha256 `b8707134a1230e9245586570d7c2823e486f1c7f0352e76daaeba9e18d59ee31`；`interns1pro-abs.html` sha256 `786b7704837411449b9f4c1447a42b4b6334e55ff3ba68570ed8e724520fe639`；`shlab-s2.html` sha256 `a6ba2f9bcfbf835859f907b1e1c29c420fba5531986c977f1f11cf0ea8a1f965` |

## 机制提取

### ① 模型形态与规模

- **Intern-S1**：多模态 MoE，**28B 激活 / 241B 总参数**；continual pre-training **5T tokens**，其中 **>2.5T 为科学领域**。自我定位 "a specialized generalist"。
- **Intern-S1-Pro**：万亿规模版本，开放权重 CC BY 4.0。
- **书生-S2**：397B；主打"长程科研能力 + 智能体能力"。

### ② 训练侧机制（对 UnivEdge 属训练侧，见判定）

- **InternBootCamp + Mixture-of-Rewards (MoR)**：>1000 个任务同时做在线 RL，"synergize the RL training on more than 1000 tasks simultaneously"；InternBootCamp 的立意是**可验证任务扩展**（verifiable task scaling）。
- **Memory Decoder（S2）**：可插拔专业记忆——"不同领域的专业知识可以通过独立的记忆模块进行学习，并在**不修改主模型参数**的情况下接入"；实测接入 `Intern-MemDec-4B` 后 Biology-Instructions 平均 **56.92 → 60.32**（接近 S1-Pro→S2 的跨代提升）。

### ③ 与"工具代算"直接相关的一条（**本卡最有价值项**）

数学方向，"通用模型 + 专业符号引擎"协作路线：

> "数学方面，首创'**通用模型+专业符号引擎**'协作路线，克服了传统专用模型缺乏泛化性的瓶颈。在几何证明场景中，**仅用万分之一训练样本即超越谷歌AlphaGeometry2**。"（来源：`shlab-agi4s2025.html`，2026-01-04）

物理方向：大规模多阶段 RL；**FrontierScience-Olympiad** 榜上自述"超越所有开源模型"。

### ④ 能力主张（测量类，会过期）

S1 自述在分子合成规划、反应条件预测、晶体热力学稳定性等专业任务上**超过闭源 SOTA**；S2 自述在 IMO-Proof / AdvancedMathBench 上"达到 Gemini 3.1 Pro 水平"，并能围绕一道数学博资考题"数小时的持续探索、推理与验证"。

## 对照与判定

| # | 对照项 | 关系 |
|---|---|---|
| 1 | "通用模型 + 专业符号引擎"协作 | **外部独立印证（A3）**：与 METHODOLOGY「LLM 永不手算，推导由符号引擎代算」同一路线；且给出量化收益（1/10000 样本超 AlphaGeometry2）。**不新增条款，但可作为该原则的外部锚点引用** |
| 2 | MoR / InternBootCamp / 训练管线 | **不吸收**：训练侧，UnivEdge 无训练基础设施（沿用 docs/17 训练侧口径） |
| 3 | Memory Decoder（免重训的领域记忆） | **记观察**：它是*模型参数层*的领域扩展，与 UnivEdge 的*资产层*（knowledge/ + skills/）抽象层不同，不可类比吸收 |
| 4 | 长程"数小时推理+验证" | 与 `researchclawbench.md` 的端到端实测存在**张力**：模型自述的长程能力 ≠ 能完成端到端复现（后者最强系统仅 21.5/100）。**采信端到端实测** |

**可移植性判定**：训练侧全部不吸收；**唯一沉淀**是"通用模型 + 专业符号引擎"这一路线的外部锚点（写入调研文档，不入内核）。

## 直引

1. "Intern-S1 is a multimodal Mixture-of-Experts (MoE) model with 28 billion activated parameters and 241 billion total parameters, continually pre-trained on 5T tokens, including over 2.5T tokens from scientific domains."
2. "we propose Mixture-of-Rewards (MoR) to synergize the RL training on more than 1000 tasks simultaneously"
3. "仅用万分之一训练样本即超越谷歌AlphaGeometry2"（AGI4S 2025 汇总，2026-01-04）
4. "不同领域的专业知识可以通过独立的记忆模块进行学习，并在不修改主模型参数的情况下接入书生-S2"（S2 发布稿）
