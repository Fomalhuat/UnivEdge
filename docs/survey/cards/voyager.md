# Voyager: An Open-Ended Embodied Agent with LLMs（arXiv 2305.16291）

- **元数据**：Wang / Xie / Jiang / Mandlekar / Xiao / Zhu / Fan / Anandkumar（NVIDIA/Caltech 等）｜ 2023
  ｜ Minecraft 中的终身学习 ｜ 一手（论文）｜ 获取 2026-10-18
  ｜ 快照 `run/survey/sources/b4-voyager.txt`（sha256 前 16 位 `6cfab0fdc8ffd7bf`）
  ｜ URL: https://arxiv.org/abs/2305.16291

## ① 任务分解与角色架构

三组件（无微调，黑盒 GPT-4）：

1. **automatic curriculum**：自动提出"当前能力边缘"的下一个任务（最大化探索）；
2. **skill library**：可执行代码构成的技能库，**按描述嵌入索引**、可检索、可组合
   （"Complex skills can be synthesized by composing simpler programs"）；
3. **iterative prompting**：环境反馈 + 执行错误 + **self-verification** 共同驱动程序改进。

## ② 验证/审查机制（本卡最相关）

- **self-verification 由一个独立 GPT-4 agent 充当 critic**：给"当前状态 + 任务"，判断程序是否完成任务；
  失败时**同时给出批评**（how to complete）；
- 原文明确其定位："**our self-verification is more comprehensive than self-reflection by both checking
  success and reflecting on mistakes**"；
- 注意：critic 只看"状态 + 任务"，**不看生成者的推理过程**——是一种"终态 + 外部可观察"的判定。

## ③ 上下文/记忆策略（技能即记忆）

- 技能库是**跨 episode 的持久记忆**，以**可执行代码**为单元；
- 检索：按技能描述嵌入的相似度取回相关技能（组合进 prompt）；
- 复合技能由简单技能组合而成 → "abilities compound rapidly and alleviate catastrophic forgetting"。

## ④ 人工介入点

零（自主探索）；curriculum 自动生成。

## ⑤ 成本/规模实测

3.3× 更多独特物品、2.3× 更远距离、解锁科技树里程碑最快 15.3×；技能库可迁移到新世界解决新任务。

## ⑥ 失败模式与自述局限

- 依赖可执行环境（Minecraft API）与自动课程；critic 判定的可靠性未量化（"self-verification" 本质仍是 LLM 判定）；
- 领域受限（具身任务）；技能以代码为单元，难以覆盖"判断型"知识。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① **技能注册表** ↔ §6 工具与技能开发（但形态不同：他们是可执行代码，我们是方法论包）；② **critic 判定终态** ↔ 我们审查者的"产物 + 锚点"判定；③ **迭代改进循环**（环境反馈 + 错误 + 自检）↔ 我们的"检查→修订→复核"链 |
| **已有但更弱** | **技能的可组合性**：Voyager 的复合技能由简单技能组合而成（且组合后仍是可执行单元）；我们的 §6 技能是文档型方法论，**组合性靠人读**，无"技能组合成新技能"的机制 → 观察项（若未来技能库变大，可评估"技能组合"的登记方式） |
| **缺失（可吸收）** | ① **critic 只看终态、不看过程**的判定纪律（与我们 T1 语义一致，可作外部佐证）；② **"技能按描述索引 + 相似检索"**：我们的 L3 检索靠路径与人工判断（与 B4-3 的检索排序同源，见 P16） |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核（弱）**：critic 终态判定纪律（佐证，不新增）；**领域资产（观察）**：技能库的可组合性；
**不适用**：Minecraft 自动课程、具身环境。

## ⑨ 直引

1. "an ever-growing skill library of executable code for storing and retrieving complex behaviors"
2. "Each program is indexed by the embedding of its description, which can be retrieved in similar situations
   in the future."
3. "we ask it to act as a critic and inform us whether the program achieves the task. In addition, if the task
   fails, it provides a critique by suggesting how to complete the task."
4. "our self-verification is more comprehensive than self-reflection by both checking success and reflecting on
   mistakes."
5. "Complex skills can be synthesized by composing simpler programs, which compounds Voyager's capabilities
   rapidly over time."

## ⑩ 探针草案

无（佐证/观察项）。检索排序问题并入 P16。
