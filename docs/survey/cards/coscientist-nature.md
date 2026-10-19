# Coscientist（Boiko et al., Nature 624, 570, 2023）

- **元数据**：Boiko / MacKnight / Kline / Gomes（CMU）｜ 2023-12-20 ｜ 自主化学实验 ｜ 一手（Nature，**开放获取**）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-coscientist-nature.txt`（段落提取，sha256 前 16 位
  `8f6c6d4af16ac18d`）｜ URL: https://www.nature.com/articles/s41586-023-06792-0

## ① 任务分解与角色架构

**单 Planner + 四个命令构成的行动空间**（GPT-4 chat completion）：

- 主模块 **Planner**（assistant 角色；用户输入与命令输出均作为 user 消息回灌）；
- 四个命令（system prompt 模块化定义）：**GOOGLE**（Web searcher，本身也是 LLM）、**PYTHON**（代码执行）、
  **DOCUMENTATION**（文档检索）、**EXPERIMENT**（实验自动化：云实验室高层命令 / 液体处理仪器低层指令）；
- 六个展示任务：从文档操作、云实验室命令编排、到跨硬件+多数据源的复杂实验与需分析历史数据的优化问题
  （如钯催化交叉偶联反应优化）。

## ② 验证/审查机制

无独立评估器/审查者（单 agent 架构）；有效性由**六任务的真实化学结果**验证；
"explainability" 主张来自完整对话/命令日志（可审计轨迹）。

## ③ 上下文/记忆策略

无专门机制（命令输出回灌构成工作记忆；对话日志即审计载具）。

## ④ 人工介入点

定位为 **"(semi-)autonomous experimental design and execution"**——人给任务，系统执行；
安全讨论承认 dual-use 风险（附专节 "Safety implications: Dual-use study"）。

## ⑤ 成本/规模实测

未报告 token 成本；规模＝六任务（含真实云实验室/液体处理硬件）。

## ⑥ 失败模式与自述局限

- 论文诚实声明："The writing of the preprint version of this manuscript was assisted by ChatGPT...
  **All authors have read, corrected and verified all information** presented in this manuscript and
  Supplementary Information."（把 AI 辅助书写限定到"语法与错字"且全体作者逐条核验）；
- dual-use 与安全顾虑（自述需继续探索伦理使用）；
- 泛化性受限于"动作空间＝四命令"（能力面窄、深）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① **命令式行动空间**（四个明确命令而非任意工具调用）↔ §6 工具注册表 + 动态路由（我们更宽）；② 对话/命令日志可审计 ↔ §1.6 产物存储 + 运行链；③ "作者逐条核验 AI 辅助文本" ↔ 我们的"人类复核锚点"纪律 |
| **已有但更弱** | 无显著弱点项（本系统与我们不同层：它把手伸到**物理实验硬件**，我们止步于计算产物） |
| **缺失（可吸收）** | "**行动空间显式枚举**"作为一种安全设计：把 agent 能力面压缩为少量语义清晰的命令 → 与我们 §6 的"工具即接口"一致，但可强化为"**新增工具须确认行动空间边界**"（低优先，记观察） |
| **冲突/张力** | 无 |

## ⑧ 可移植性判定

**内核（弱）**：行动空间枚举的强化记入观察；**不适用**：实验室硬件控制、dual-use 安全链（无执行权）。

## ⑨ 直引

1. "Coscientist, an artificial intelligence system driven by GPT-4 that autonomously designs, plans and
   performs complex experiments by incorporating large language models empowered by tools such as internet
   and documentation search, code execution and experimental automation."
2. "System prompts... for the Planner are engineered in a modular fashion, described as four commands that
   define the action space: 'GOOGLE', 'PYTHON', 'DOCUMENTATION' and 'EXPERIMENT'."
3. "exhibiting advanced capabilities for (semi-)autonomous experimental design and execution."
4. "All authors have read, corrected and verified all information presented in this manuscript and
   Supplementary Information."

## ⑩ 探针草案

无（观察项，不单列候选）。
