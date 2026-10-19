# Effective harnesses for long-running agents（Anthropic Engineering）

- **元数据**：Anthropic Engineering ｜ 2025（页面未标日期）｜ 软件工程（泛化到长任务）｜ 一手（官方）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b1-harnesses.{txt,html}`（txt sha256 前 16 位 `c2a59fef0f71c031`）
  ｜ URL: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- **备注**：本文是 docs/09 §7 遗留的"须补一手核实"项——本次完成核实，09 的二手转述与原文一致。

## ① 任务分解与角色架构

**两个 agent（仅初始 prompt 不同，system prompt/工具集/harness 相同——原文脚注 1 明确说明）**：

- **Initializer agent**（第一个会话专用 prompt）：搭建环境——`init.sh`（跑开发服务器 + 基本 E2E）、
  `claude-progress.txt`（进度日志）、初始 git commit、**feature_list.json**（把一句话 prompt 展开成
  **200+ 条**端到端 feature 描述，全部初始标记 `"passes": false`）；
- **Coding agent**（后续所有会话）：**一次只做一个 feature**（增量），自验证，结束时写 git commit + 进度更新。

## ② 验证/审查机制

- 完成判定：**"Only mark features as 'passing' after careful testing"**——自我验证（self-verify all features）；
- 测试方式：显式要求用浏览器自动化工具**像人类用户一样做端到端测试**（关键失败模式：不做 E2E 就宣布完成）；
- 防弱化：强措辞指令——"It is unacceptable to remove or edit tests because this could lead to missing or
  buggy functionality."；
- 无独立评估器（本文的 harness 不含 doer-verifier；那是 harness-design 文的路线）。

## ③ 上下文/记忆策略

- **状态桥**（新会话 → 旧会话）：feature_list.json + git log + claude-progress.txt 三件套——
  "finding a way for agents to quickly understand the state of work when starting with a fresh context window"；
- **JSON 优于 Markdown**（结构性易被误改的文件）："the model is less likely to inappropriately change or
  overwrite JSON files compared to Markdown files"；
- **会话结束的 clean state**："the kind of code that would be appropriate for merging to a main branch"；
- **就位仪式（getting up to speed）**：pwd → 读 git log + 进度 → 读 feature list 选最高优先级未完成项 →
  跑 init.sh + 基本 E2E 冒烟测试（"This ensured that Claude could quickly identify if the app had been left
  in a broken state, and immediately fix any existing bugs. If the agent had instead started implementing a new
  feature, it would likely make the problem worse."）。

## ④ 人工介入点

无（目标即"without human intervention"）；人类角色 = 给高层 prompt + 事后使用与评估。

## ⑤ 成本/规模实测

未报告 token/成本；规模指标 = 200+ features、单会话多轮、跨多个 context window。

## ⑥ 失败模式与自述局限（原文表格）

| 失败模式 | 对应机制 |
|---|---|
| 试图一口气做完（one-shot）→ 上下文耗尽、半成品未记录 | feature list + 一次一个 + 会话起读进度 |
| 后续会话看到有进展就宣布整个项目完成 | 读 feature list，只做单个未完成项 |
| 会话结束留下 bug/未记录状态 | 起：读进度 + git + 基本测试；终：commit + 进度 |
| 宣布 feature 完成但未充分测试 | 自验证，测试后才改 passing |
| 不知道怎么跑起来 | init.sh |

自述局限：视觉/浏览器工具限制（如浏览器原生 alert 弹窗看不到）；尚不清楚单通用 agent 还是多代理更优；
本 demo 面向全栈 web app，**未来方向明确点名"scientific research"**（"It's likely that some or all of
these lessons can be applied to the types of long-running agentic tasks required in, for example, scientific
research or financial modeling."）。

## ⑦ 与 UnivEdge 对照

| 判定 | 内容 |
|---|---|
| **已有同构** | ① "测试后才可标通过" ↔ §0.3 状态机（claimed→verified，"LLM 无权自行声称已验证"）；② 进度日志 ↔ 每日工作日志；③ git commit 纪律 ↔ AI 写 commit/用户 push；④ 一次一个 feature ↔ §3.5 最小可验证单元先行；⑤ 就位仪式读日志 ↔ L1 加载协议 + §1.1 检索教训 |
| **已有但更弱** | **会话启动的冒烟测试**：UnivEdge 恢复时读记忆/教训，但无"先跑一次基本验证、确认项目未处于 broken 状态，再开新工作"的**动作级步骤**（NC-05 是文档要求，非会话启动动作）→ 候选 P1 |
| **缺失** | "结构性易误改文件用 JSON 而非 MD"作为**完成状态的机器可解析载体**——UnivEdge 有 claims.md 但"哪个完成状态由哪个结构化字段承载、防误改格式"未规定（与 docs/12 R1c 报告结构约定同向）→ 佐证 R1c |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核**（会话就位仪式 + 结束态干净的判据可入 §1.1/恢复协议）+ **领域资产**（feature-list 模板可类比
claims/契约的领域侧形态）。无宿主依赖。

## ⑨ 直引（原文，供核验）

1. "the agent tended to try to do too much at once—essentially to attempt to one-shot the app."
2. "we prompted the initializer agent to write a comprehensive file of feature requirements expanding on the
   user's initial prompt... These features were all initially marked as 'failing'."
3. "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."
4. "Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or curl
   commands against a development server, but would fail recognize that the feature didn't work end-to-end."
5. "This ensured that Claude could quickly identify if the app had been left in a broken state... If the agent
   had instead started implementing a new feature, it would likely make the problem worse."

## ⑩ 探针草案（候选 P1，见 docs/16 §4）

- 机制：会话启动冒烟测试；探针：构造"上一会话留下坏状态"的会话级场景（如临时破坏一个被依赖的产物
  再开新会话）→ 检查新会话是否**先**执行基本验证并检出。破坏式验证：移除该步骤 → 探针必须失败。
