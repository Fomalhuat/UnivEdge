# SWE-agent / mini-SWE-agent：ACI 与可插拔上下文策略（含代码级）

- **元数据**：Princeton + Stanford ｜ 论文 arXiv 2405.15793（NeurIPS 2024）｜ 代码 `SWE-agent/SWE-agent`
  （main 分支，2026-10-16 获取）；后继 `SWE-agent/mini-swe-agent`（v2）
  ｜ 一手（论文 + 仓库代码）｜ 快照 `run/survey/sources/b1-sweagent-{readme.md,history.py,arxiv.html}`、
  `b1-miniswe-readme.md`（sha256 前 16 位：readme `dcd880557720efba`、history.py `8e3621a9b7d94761`、
  miniswe-readme `9982d90b7566f2f3`）
- **备注**：⚠️ 重要时效信息——SWE-agent 已被自家 mini 版本取代（仓库首页警告）；
  mini 与 SWE-agent 性能相当而**简单约 100 倍**。

## ① 任务分解与角色架构

- SWE-agent：单 agent + 深度定制的 **ACI（agent-computer interface）**：专用查看/编辑（带 linting）/
  仓库导航/测试执行工具；"LM agents represent a new category of end users with their own needs"；
- 性能：SWE-bench pass@1 12.5%、HumanEvalFix 87.7%（论文时点）；
- **mini 版本反数据**：约 **100 行** python、**除 bash 外零工具**、完全线性历史、
  每步 `subprocess.run` 无状态 shell；SWE-bench verified **>74%**、被 Meta/NVIDIA/IBM 等采用；
  作者建议默认用 mini；原版仅保留给"想实验不同工具集/不同 history processor"者。

## ② 验证/审查机制

- ACI 内置验证辅助：编辑工具**自动 lint**（编辑即校验）；执行测试工具；
- 无独立评估器；评测 = SWE-bench 客观通过率（终态判定）；
- mini 佐证：终态判据（测试通过）足够时，不需要 ACI 花活。

## ③ 上下文/记忆策略（代码级，本文重点）

`history_processors.py`＝**可插拔、配置驱动的上下文策略管线**（yaml 声明），主要 processor：

| Processor | 机制 |
|---|---|
| `LastNObservations(n=5)` | 只留最近 n 条 observation；更早的替换为占位符 **"Old environment output: (n lines omitted)"** |
| 同上（tag 覆盖） | `always_keep_output_for_tags` / `always_remove_output_for_tags`——**带标签的观察免于裁剪或强制裁剪** |
| 同上（polling） | 每 polling 步才更新裁剪量（减小 prompt cache 破坏） |
| `ClosedWindowHistoryProcessor` | 每个文件的窗口视图：只保留最近一次窗口全文，旧窗口替换为 **"Outdated window with N lines omitted"**（文件身份 + 近因） |
| `RemoveRegex` | 按正则删任意内容（如 `<diff>`），`keep_last` 保护最近若干条 |
| `CacheControlHistoryProcessor` | 为 Claude 加 prompt cache 标记 |

设计要点：① **省略必须显式留痕**（占位符写明省了多少行/图）；② **标签机制让关键输出豁免裁剪**；
③ 策略是可插拔配置（非硬编码）；④ 裁剪节奏与缓存友好性联动（polling）。

## ④ 人工介入点

无（基准自动运行）。

## ⑤ 成本/规模实测

论文报告 pass@1 与消融（ACI 组件的影响）；SWE-agent 仓库提供 trajectory browser 供事后审计。
具体 token 成本未在本轮材料中量化。

## ⑥ 失败模式与自述局限

- 作者回顾：一年后模型变强，"a lot of this is not needed at all"——ACI 的许多定制**不再承重**；
- LastNObservations 会破坏 prompt caching（有 workaround）；
- 原版仅剩的场景：换工具集实验、换 history processor 实验——**上下文策略成为原版存在的理由之一**。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "终态判定（测试通过）" ↔ NC 系列 + 状态机；② trajectory browser ↔ run/review 报告与 INDEX（可审计轨迹）；③ prompt cache 属宿主层 |
| **已有但更弱** | **省略留痕**：UnivEdge 裁剪（L1 预算、报告裁剪、compaction）目前**未见"显式占位符"要求**——被裁内容静默消失；SWE-agent 的占位符模式（"省略 N 行"）与 Claude Code 的 tool-result clearing 互补 → 候选 P4（**合并 P3**） |
| **缺失（可吸收）** | ① **标签式保留**（keep/remove 标签让关键证据豁免裁剪）→ 候选 P4 的第二半；② **上下文策略可插拔**（策略即配置，而非散落硬编码）→ 观察项（宿主实现侧，服务 L1 裁剪与 compaction 的未来扩展） |
| **冲突** | 无；但 mini 趋势对"任何 scaffold 都值得保留"是反例——**支撑 docs/12 R2/R5 的瘦身纪律**（R5 正是"模型升级重估承重"） |

## ⑧ 可移植性判定

**内核**（省略留痕 + 标签保留的规则，因涉及"证据完整性"）**+ 宿主**（history processor 管线的具体实现、
cache 控制）。ACI 定制工具部分**不吸收**（mini 反数据说明其随模型变强而失效）。

## ⑨ 直引

1. （论文摘要）"SWE-agent's custom agent-computer interface (ACI) significantly enhances an agent's ability to
   create and edit code files, navigate entire repositories, and execute tests and other programs."
2. （代码 docstring）"Elided observations are replaced by \"Old environment output: (n lines omitted)\"."
3. （代码 docstring）"Any observation with a `tags` field containing one of these strings will be elided, even
   if it is one of the last n observations." / "...will be kept, even if it is not one of the last n
   observations."
4. （代码 docstring）"Outdated window with {len(matches)} lines omitted..."
5. （README）"one year later, as LMs have become more capable, a lot of this is not needed at all to build a
   useful agent!"
6. （README）"Our general recommendation is to use mini-SWE-agent instead of SWE-agent going forward."

## ⑩ 探针草案（候选 P4）

- 机制：裁剪留痕 + 标签保留；探针：① 对超预算的 L1/报告执行裁剪 → 断言占位符存在且格式可见；
  ② 标注一条"关键证据" → 裁剪后断言其仍在；破坏式：移除留痕/标签规则 → 两条断言分别失败。
