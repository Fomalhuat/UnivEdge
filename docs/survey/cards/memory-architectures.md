# 记忆架构：MemGPT（2310.08560）+ Generative Agents（2304.03442）合并卡

- **元数据**：
  - **B4-3a** MemGPT：Packer / Wooders / Lin / Fang / Patil / Stoica / Gonzalez（UC Berkeley 等）｜2023
    ｜快照 `run/survey/sources/b4-memgpt.txt`（sha256 前 16 位 `d8b1acdc0b4f4796`）｜URL: https://arxiv.org/abs/2310.08560
  - **B4-3b** Generative Agents：Park / O'Brien / Cai / Morris / Liang / Bernstein（Stanford/Google）｜2023
    ｜快照 `run/survey/sources/b4-gen-agents.txt`（sha256 前 16 位 `233470c77d221ae4`）｜URL: https://arxiv.org/abs/2304.03442
  - 均一手（论文），获取 2026-10-18

## ① 任务分解与角色架构

- **MemGPT**：把 LLM 当 OS 进程管理——**main context**（system instructions + **working context** +
  FIFO 队列）与 **external context**（archival / recall 数据库）；LLM 通过**函数调用**在两级间"换页"，
  并可用 `request_heartbeat=true` 链式调用（多步检索）。
- **Generative Agents**：三件套——**memory stream**（自然语言记录全部经历）→ **retrieval**
  （相关性 + 新近 + 重要 三因子）→ **reflection**（把记忆合成高层推断）→ **planning**（据此产生行为）。

## ② 验证/审查机制

两篇均非审查机制；但 MemGPT 的"working context"是**agent 自维护的工作集**（可自读自写），
Generative Agents 的 reflection 是**对记忆的周期性合成**。

## ③ 上下文/记忆策略（本卡核心）

| 机制 | 内容 | 对我们的意义 |
|---|---|---|
| **分层** | main（RAM）/ external（disk）；working context 是**结构化、可编辑**的一段 | 对应我们的 L1 常驻 + L3 按需；**我们缺"working context"层**（当前工作集靠会话上下文，不落结构） |
| **换页由模型决定** | LLM 自己调用函数在两级间搬数据 | 对应"按需加载 L3"；但我们的加载由协议/人决定，非模型自决 |
| **检索三因子** | relevance × recency × importance（Generative Agents 明确三项相加） | **我们的 L3 检索无排序公式** → 候选 P16 |
| **反思合成** | 周期性把零散记忆合成高层结论（reflection） | ↔ 我们的 MEMORY.md 梳理/月度蒸馏（人工触发）；可评估是否周期化自动触发 |
| **控制流** | heartbeat 链式调用（多步检索后再回答） | 宿主实现层，不吸收 |

## ④ 人工介入点

MemGPT：用户可在 main context 中查看/编辑 working context（透明性）；Generative Agents：用户可干预 agent。

## ⑤ 成本/规模实测

MemGPT：文档 QA / 多会话对话上"超过固定上下文基线"（论文评测）；Generative Agents：25 个 agent 的沙盒
涌现行为（可信度评估），无成本数据。

## ⑥ 失败模式与自述局限

MemGPT：依赖函数调用的可靠性、需要模型判断何时换页（误判会丢信息）；Generative Agents：记忆膨胀、
检索成本、反思质量依赖 LLM；两篇均未解决"该忘什么"。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① **分层（常驻/按需）** ↔ 加载协议 L0–L3；② **记忆=自然语言记录** ↔ memory/*.md + 日志；③ **反思合成** ↔ MEMORY.md 的蒸馏与"只加指针/作废行"维护纪律（SOUL.md Continuity） |
| **已有但更弱** | **① 检索排序**：我们有"去哪儿找"的路由表，但**无 relevance/recency/importance 的排序规则**；随教训与文献增长，人工挑选会失效 → **候选 P16（唯一新增）**；**② working context 缺位**：我们没有一个"本单元工作集"的结构化片段（当前靠会话上下文与 L1），长任务中易被 compaction 冲掉 → 记观察（与 B2-6 的 session/getEvents 同族；若 docs/15 T1 需要稳定工作集，可评估） |
| **缺失（可吸收）** | 三因子排序的**具体权重与实现**（Generative Agents 用归一化加和）；"importance" 可由 LLM 打分（我们用"是否影响结论/误差预算"可替代） |
| **冲突** | 无（MemGPT 的"模型自决换页"与我们的"协议化加载"取向不同，但可共存于宿主层） |

## ⑧ 可移植性判定

**内核**（P16 检索排序；working context 记观察）；**宿主**（MemGPT 式函数化记忆管理——dsh 侧若要做长任务，
可参考其接口）；**不适用**：OS 级换页细节。

## ⑨ 直引

1. （MemGPT）"we propose virtual context management, a technique drawing inspiration from hierarchical memory
   systems in traditional operating systems..."
2. （MemGPT）"The LLM's prompt tokens (inputs), or main context, consist of the system instructions, working
   context, and a FIFO queue."
3. （MemGPT）"MemGPT uses functions to move data between main context and external context (the archival and
   recall storage databases)."
4. （GenAgents）"The first is the memory stream, a long-term memory module that records, in natural language, a
   comprehensive list of the agent's experiences."
5. （GenAgents）"A memory retrieval model combines relevance, recency, and importance to surface the records
   needed to inform the agent's moment-to-moment behavior."
6. （GenAgents）"reflection, which synthesizes memories into higher-level inferences over time"

## ⑩ 探针草案（候选 P16，与 B4-2 合并）

- 同上（B4-2 卡 §⑩）：构造 8–10 条教训 + 相关任务 → 断言 top-k 命中；负控无关任务不误排。
- 附加探针（若采纳 working context）：长任务中断/恢复后，断言工作集仍在（与 P1 冒烟测试互补）。
