# CORE-Bench：计算可复现性 agent 基准（arXiv 2409.11363）

- **元数据**：Siegel / Kapoor / Agarwal / Nadgir / ... / Narayanan（Princeton）｜ 2024 ｜ 计算可复现性
  ｜ 一手（论文）｜ 获取 2026-10-19
  ｜ 快照 `run/survey/sources/b5-core.txt`（sha256 前 16 位 `de90d8c3138abe8a`）
  ｜ URL: https://arxiv.org/abs/2409.11363

## ① 任务分解与角色架构

基准：**270 个任务 / 90 篇论文**（CS、社科、医学；45 train / 45 test；三个难度级别）；
agent 需按论文产出的代码与数据**复现**结果。基线：AutoGPT 与专用 CORE-Agent（GPT-4o / 4o-mini）。

## ② 验证/审查机制

- 验收判据 = **对复现结果的具体提问**（如"报告模型测试精度""读出某图坐标轴标签"）——机器可判；
- 评估系统并行化（省数天评估时间）；
- 失败分析：从训练集 agent 轨迹中归纳常见错误并给提示（如必须产出 `report.json`；要读 PDF/HTML）。

## ③ 上下文/记忆策略

AutoGPT 的**历史动作自动摘要**帮助其定位常见失败（作者自述受益）。

## ④ 人工介入点

论文筛选与任务问题由人工构造（含 CodeOcean capsule 筛选）。

## ⑤ 成本/规模实测（关键数字）

- **最好 agent 在最难级别仅 21% 准确率**——且这些论文**选定为"低努力即可复现"**（CodeOcean capsule）；
- 失败常见原因：未生成 `report.json` 或键不齐、未从 PDF/HTML 读结果、环境/依赖问题等。

## ⑥ 失败模式与自述局限

- 领域限于三学科；"可复现论文"子集（乐观偏置）；任务问题由人构造，可能覆盖不全；
- 作者定位：**能复现是"能开展新研究"的必要前提**（"Having agents that can reproduce existing work is a
  necessary step towards building agents that can conduct novel research"）。

## ⑦ 与 UnivEdge 对照（对复现类任务的直接参照）

| 判定 | 内容 |
|---|---|
| **已有同构** | ① **锚点对照表**（NC-01）↔ 基准的"对结果提问"；② **运行链完整 + 环境可复现**（NC-04/05）↔ 其失败分析中的环境/依赖问题；③ **逐物理量收敛**（NC-08）↔ "逐项读取结果"而非笼统复现；④ 我们的复现协议（VERIFICATION §3）与此基准的问题设计同构 |
| **已有但更弱** | **"复现的验收判据须机器可读"**：CORE-Bench 用结构化提问/答案判分；我们的复现验收仍以人读报告为主（NC-01 有 JSON schema，但覆盖有限）→ 佐证 docs/12 R1c（报告结构约定）与 P12（可核查性），**不新增候选** |
| **缺失（可吸收）** | **"有代码 ≠ 可复现"的量化警示**（21%，且是精选子集）→ 支撑我们在复现类任务中**默认要求环境/依赖/随机种子/数据版本的显式记录**（NC-04/05 已有，可加一句"复现失败首查报告结构与环境"）；另：**历史动作摘要**（AutoGPT）对"定位失败"有帮助 → 与我们"日志/轨迹"同向 |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核（佐证）**：复现验收的机器可读性、环境记录；**领域资产**：任务问题设计可参照其"逐项提问"形态；
**不适用**：CodeOcean/学科任务集。

## ⑨ 直引

1. "a benchmark consisting of 270 tasks based on 90 scientific papers across three disciplines (computer
   science, social science, and medicine)."
2. "The best agent achieved an accuracy of 21% on the hardest level of tasks, showing the vast scope for
   improvement in automating routine scientific tasks."
3. "we manually created a set of task questions about the outputs generated from a successful reproduction of
   the paper... These questions assess whether an agent has correctly executed the code and retrieved the
   results."
4. "Having agents that can reproduce existing work is a necessary step towards building agents that can conduct
   novel research and could verify and improve the performance of other research agents."
5. "Not creating a report.json file or not including the correct keys in the file"（常见失败）

## ⑩ 探针草案

无新探针（佐证 P12/R1c）；可复用 NC-01 的 JSON schema 断言。
