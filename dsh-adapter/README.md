# dsh-adapter — UnivEdge × DeepSeek Harness 适配层

> 本目录是 UnivEdge 与 [dsh](https://github.com/deepseek-ai/deepseek-harness) 宿主的适配层（领域层不变，只加这一层适配）。
> 用途：让 dsh 宿主下的 agent **强制**加载 UnivEdge 的 L1 方法论层，解决"agent 高强度工作时忘记加载协议"的问题。
> 实测验证：2026-08-28（L1 注入后 agent 完整产出任务契约 + 启动自省 + 完整验证流程）。

## 组件

| 文件 | 作用 |
|---|---|
| `univedge-l1-inject.ts` | dsh 插件：L1 常驻注入——`session-start` 在**该会话作用域**注册 system prompt section（`univedge:l1`，order 10），每请求组装时从磁盘重读（METHODOLOGY §0+§1 + 基层）；**不进入对话流**（2026-10-10 起取代旧版"用户消息注入 + 每步补精简版"） |
| `univedge-hpc-gate.ts` | dsh 插件：注册 `submit_hpc_job` 工具——提交作业前强制 CHECK 字段校验（schema 层 `required` + execute 层非空校验双层门控） |
| `univedge-reviewer.ts` + `reviewer-shared.ts` | dsh 插件：任务完成后 spawn **独立评估者子 agent**（R7，怀疑派）审查产物，报告写入 `run/review/<主会话8>/<评估者8>/review.md`（分目录，杜绝覆盖）。**触发判据（双通道并存观察期，2026-08-31 framework-redesign 方向 1）**：① **显式审查点**——turn 文本含 `@review <路径>` 即必审（不受冷却/hash 约束，触发权交还主 agent；观察期后自动通道退役、此通道成主判据 + 会话结束兜底）；② **自动嗅探**——仅当 turn 内有"实质交付物"（写了产物文件 OR 文本含"完成态动词+路径"）才审查，受冷却/hash 约束；讨论/规划句轮不触发；**审查自输出**（报告/空记录/selfcheck/r7- 存档/INDEX）永不触发（防自激）；handoff 等审计文档在审查面内（可被审）。**问题分级**（S 系列严重度）：S0 实质（标【需用户确认】）/ S1 有依据（自行判定）/ S2 建议。共享逻辑在 `reviewer-shared.ts`（单一事实来源，源码与测试共用）。**输入包组包（2026-10-10，R7 第四轮 S1-5/S1-8/S0-1）**：`extractReviewInput` 三处修正——① `tool/call` 分支**按触发轮窗口过滤**（有 `@review` 声明路径时严格限轮内；此前会把整个会话历次工具调用的路径塞进输入包，评估者"审错文件却声称已审"）；② **结构化参数提取**（`file_path`/`path`/`notebook_path`/… 优先；原正则因 JSON 转义带尾随 `\\` 而漏掉全部结构化路径），正则降为 bash 命令等非结构化参数的兜底；③ **产物指纹**（`size/mtime/sha256 前 12 位`，随输入包下发给评估者，并在报告落盘前复检——漂移则在报告正文前自动标注"审查窗口内产物被改写"）。**插件改动需重启实例才生效**。R7 自审（2026-08-31）修复：`$` 锚定死代码、规划句误触发、todo_write 误触发、触发风暴、空报告落盘、分目录写盘、摘要桩、报告标志提取。**审查风暴抑制**（仅约束自动通道）：P0-A 冷却期（同主会话 15min 窗口内成功审查 ≥2 次 → 暂停自动审查，延迟不丢弃；`UNIVEDGE_REVIEW_COOLDOWN_MIN`/`UNIVEDGE_REVIEW_MAX_PER_WINDOW` 可调）+ P0-B 产物 hash 去重（内容未变不重审）+ P1-A quiet 指令（turn 文本含 `--no-review` 或 `review:off` 即跳过，quiet 优先于声明）+ P2-A 触发可见性（报告头标注触发 turn 与触发通道 declared/auto） |
| `analyze_session.py` | 协议遵守率统计脚本：解析 session.jsonl.zstd，输出 7 项指标（L0/L1/L2/工具代算/锚点） |
| `cordis.patch.yml` | 注册以上插件的 patch（用 `--patch` 加载；"新增 entry"须用 `insert:` 语法） |
| `tests/l1-seat.ts` + `test-results/2026-10-10-l1-seat.md` | L1 座位迁移单元测试（覆盖：导出契约 + L1 内容完整性 + **L1 字符门（含门触发实测）** + workspace 根发现 + section 注册行为（伪宿主：名称/次序/provider/幂等/隔离/时序兜底/next() 决策不变）+ 审计留痕 + 静态回归守卫——守卫源码不得再出现 `agent.inject` / `kind: 'user'` / `l1InContext` / `readL1Brief`，且必须用 in-tree 惯用法 `agent.ctx.inject`）；**用例数与结果见下方套件表**；运行 `tsx --tsconfig <dsh>/tsconfig.json tests/l1-seat.ts`（测试经 `UNIVEDGE_L1_LOG` 写临时日志，不污染生产审计日志）。宿主集成已另行实测（2026-10-10 17:54 重启，见下"可核性"） |
| `tests/l1-invariants.ts` + `test-results/2026-10-10-l1-invariants.md` + `test-results/l1-baseline.json` | **L1 义务不变量测试**（覆盖：§0 状态机与产物格式 + §1.1–§1.6 全部操作义务 + §1.7 操作面与**定义级判据**（信号名+判据文字同在场）+ **依赖闭包**（capability/regression/retired/查表不判断/实质发现/20 次）+ 基层五根因 + 确认纪律 4 类 + 层级结构）；**用例数与结果见下方套件表**（基线，2026-10-10）。计数规则：**一条断言 = 一个义务**（括号子项不合并）。**证据新鲜度门**（第 H 组）：基线 = **L1 文本本身**的 sha256（存 `test-results/l1-baseline.json`，独立文件——因为 `> test-results/xxx.md` 会在测试开始前截断目标，若基线取自它则门形同虚设）；L1 变化而基线未刷新 → 测试失败并打印刷新命令（`UNIVEDGE_UPDATE_L1_BASELINE=1`）。**按 L1 切片而非输入整文**做指纹：切片外改动（版本头 / §2+ / 分歧日志）不误报（2026-10-10 实测）。**约定**：结果文件名用**任务日期**，头部"日期"为**生成日期**；"逐字节可复现"是同日属性（跨天后仅首行日期不同）。用途：任何 L1 改写（压缩/搬移/重写）必须保持全绿；边界：代理判据，不保证模型遵守、不覆盖同义改写弱化 |
| `review-declare.sh` | **声明生成器 / 声明前自检**：算出自上次审查以来的改动面，分实质面/卫生面，输出可直接粘贴的 `@review` 块或"不必声明"建议；基线取 `run/review/INDEX.md`（不用易被测试推进的日志），证据产物不入候选，基线不可靠时降级告警。自验证：`bash dsh-adapter/review-declare.sh --self-test`（组数与结果见下方套件表） |
| `test-runner.ts` + `test.patch.yml` | 测试专用：headless 主任务后不退出，轮询审查报告生成再退出（验证 reviewer 用） |
| `tests/reviewer-decision-gates.ts` + `test-results/2026-10-10-reviewer-decision-gates.md` | **四项裁决实现测试**（覆盖：`--force-review`/`review:force` 识别 + 误判排除；`sameReviewTarget` 同清单+同指纹（含清单顺序无关、指纹变化、缺文件、空清单、无上轮）；`transcriptOf` 全文按序拼接；**漂移即失效**（报告头 + 状态行 + 索引后缀三处标注）；**全文落盘**（存在性 + 内容 + 缺省不落盘）；**复用记录**（`declared-reuse` 通道 + 来源标注 + 路径指向））；**用例数与结果见下方套件表** |
| `tests/reviewer-deliverable.ts` + `test-results/2026-10-10-reviewer-deliverable.md` | reviewer 逻辑单元测试（覆盖：触发判据 A/B + 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + 风暴抑制 P0-A/P0-B/P1-A + r7- 豁免 + @review 声明通道 + INDEX 触发通道列）；**用例数与结果见下方套件表**（含输入包组包窗口过滤/结构化提取/指纹漂移检出 8 条 + 上限与优先级 10 条）——运行 `tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`；"通过"声明的可核产物 |

## 运行测试 / 刷新 L1 基线（**唯一推荐入口**）

```bash
bash dsh-adapter/run-tests.sh                      # 跑全部四套，证据写入 test-results/
bash dsh-adapter/run-tests.sh --update-l1-baseline # L1 内容有变时刷新基线
bash dsh-adapter/run-tests.sh --dsh <checkout>     # 指定 dsh checkout（默认自动探测）
```

脚本负责：自动定位 dsh checkout（`--dsh` > `$DSH_ADAPTER_DSH` > 常见路径探测）、沿用同一任务的证据文件前缀、
逐套跑并落盘 `test-results/<前缀>-<套件>.md`、失败时非零退出并提示恢复命令。
不必记 `tsx --tsconfig <dsh>/tsconfig.json tests/<套件>.ts` 这类参数（脚本内部处理）。

| 套件 | 断言数 | 关注点 |
|---|---|---|
| `l1-seat` | 70 | 座位机制（会话作用域 section）+ 字符门 + 门触发与告警可见性 + 静态回归守卫 |
| `l1-invariants` | 126 | L1 义务不变量（关键词 + 定义级 + 依赖闭包）+ **第 H 组证据新鲜度门** |
| `reviewer-deliverable` | 123 | 触发判据/声明解析/组包/指纹/漂移/复用等纯逻辑 |
| `reviewer-decision-gates` | 25 | 四项裁决（漂移即失效 / 同目标复用 / auto 间隔 / 全文落盘） |
| `review-declare.sh` | 12 | 声明生成器自验证（基线取 INDEX 且按 UTC 解释 / 分类白名单 / 降级告警与退出码 / 证据产物排除） |

**何时必须跑**（内核维护要求，见 `docs/08 §7`）：**L1 注入面 = ① `METHODOLOGY.md §0–§1` + ② `knowledge/review-lessons.md` 的 `## 基层` 段 + ③ `univedge-l1-inject.ts` 内的确认纪律块（`CONFIRM_DISCIPLINE`，随 §0–§1 一起拼入 L1）**——三者任一改动后必须重跑；
**L1 内容确有变化时**用 `--update-l1-baseline` 刷新 `test-results/l1-baseline.json`（该文件须随证据一起提交）。

**盲区（务必知晓）**：基线文件 `l1-baseline.json` **必须入库**；若它丢失或未提交，第 H 组会"缺失即通过并自动重建"→ **门静默退化为常绿**（2026-10-11 在干净检出上实测确认）。同理，运行时的插件侧告警也仅在基线存在时生效——基线缺失时按设计不打扰普通用户。

**证据只有一套**：现行证据 = 脚本刷新的 `test-results/<前缀>-*.md` + `l1-baseline.json`；`test-results/archive/` 下的是历史留档，**不受任何门覆盖**，不要当作现状依据。

**计数一致性检查的强制范围**（第十二轮收窄）：只强制 `README` + **当前单元契约** = `run/**/contract.md` 中
最新、且**未带 `历史留档` 标记**的那一份（`find` 递归——原 glob 只覆盖一层，深层契约写假计数不会被看见，实测确认）；
检查会打印它实际扫的是哪一份、以及各来源采集到几项（可核）。

**计数只有一个表面（DRY）**：当前计数只允许出现在**套件表**里（`| \`suite\` | N |`）；散文与组件表改为"用例数与结果见下方套件表"。
配套一个**值无关的位置检测器**：套件表之外若出现 `N/N 通过` 或 `N 用例/断言` 形式 → 报警（判据不依赖数值，故换句式也拦得住——
上一版只比对数值的实现在受控实验中被"把散文里的用例数改成陈旧值"绕过，仍报"全部通过"）。
已结题单元的契约里的计数是**当时的**记录——追溯改写等于篡改审计留痕，且会把本检查长期拖成假红、最终被当噪声忽略。
故约定：单元结题时在契约头部加一行 `> **历史留档**：…已结题，以下计数为当时记录`（现行两个已结题单元已标）。
**为何用显式标记而非 mtime 序**：前者若失效是**假红**（吵），后者若被"碰一下旧契约"触发则是**假绿**
（真契约反而失检）——假绿更危险，故把判据变成文件里可读的显式声明。两个方向均经受控实验验证
（最新契约带标记 + 假计数 → 静默；去掉标记 → 报警并指名该文件）。

**输入包的上限与优先级**（第十二轮，R7 第十一轮 S2）：产物上限 **20 项**（原 12 项——长会话实测丢弃 18 项，
含本轮真正要审的 `univedge-l1-inject.ts`/`reviewer-shared.ts`）；候选排序 = **优先级 → 最近写入**，
低优先级（`test-results/`、`archive/`、`README.md`、`docs/`）在名额受限时让位于行为定义源，**名额未受限时照常入列**；
**声明项恒入列**（声明是生成者的显式裁决，优先级不得覆盖它）；落选者写入 `dropped` 并写诊断日志（不再静默丢弃）。
选择逻辑在 `reviewer-shared.selectArtifacts`（单一事实来源，插件与测试共用）。

**"用户文本"是白名单**（第十二轮，R7 第十一轮 S0-1）：只有 `source.kind === 'user'`（缺失视为旧日志）才算人发的文本——
任务描述、quiet/force 判定、声明扫描三处共用 `isUserAuthored`。原先的黑名单漏掉 `agent-instructions` 注入：
评估者拿到的"任务描述"实为 AGENTS.md 的 system-reminder（2188 字符），且注入文本里的 `--no-review` 字面量会被当成 quiet 指令。

**证据新鲜度在"声明前自检"里判，不在 `run-tests.sh` 内**（第十二轮，实测教训）：该脚本自己会刷新证据，
故"证据是否晚于源码改动"在它运行内**恒为真**——我写进去过一版空门，受控实验实测从不触发（一个永绿的灯）。
现由 `review-declare.sh` 用候选清单比对最新证据 mtime：候选里有更晚的文件 → 报警"先重跑测试"，自验证 ⑪⑫ 锁两个方向。

**诊断日志可覆盖且测试已隔离**：`UNIVEDGE_REVIEWER_LOG`（审查）/`UNIVEDGE_L1_LOG`（L1）/
`UNIVEDGE_DECLARE_ROOT`（声明生成器根）——`run-tests.sh` 用临时日志，故跑测试**不再推进**生产日志
（此前 `/tmp/univedge-reviewer.log` 被测试推进，使声明生成器把 15 项改动面误报为 4 项）。

**第 H 组证据新鲜度门的工作方式**：基线 = **L1 文本本身**的 sha256（不是输入整文——切片外改动不误报）；
基线存 `test-results/l1-baseline.json`（**独立文件**：`> test-results/xxx.md` 会在测试开始前截断目标，
若基线取自它则门形同虚设）；L1 变而基线未刷新 → **测试失败**并打印刷新命令。

## 机制（分层）

- **L0 入口地图**：dsh 原生自动加载 workspace 的 `AGENTS.md`（`agent-instructions` 包，每步前注入模型上下文）——这是 dsh 内置能力，不需要本适配层。
- **L1 方法论层（本适配层负责）**：`univedge-l1-inject` 提供 METHODOLOGY §0+§1（任务契约模板、启动自省、配置基线、锚点原则）+ review-lessons 基层（B1-B4+P 五根因）。
- **座位：会话作用域 system prompt section（2026-10-10 改造，取代"用户消息注入"）**：
  - `agent/session-start`：在 **agent 自己的作用域**注册 section——`systemPrompt.section({ name: 'univedge:l1', order: 10, text })`（`packages/core/system-prompt` 的注册表 API，本机 checkout 可核：`src/index.ts:381` 方法、`:52-75` 类型）→ 只对本会话生效，并随会话作用域释放而注销。
  - `text` 是 **provider**（`text: () => readL1(root)`），每次提示组装时从磁盘重读 METHODOLOGY.md / review-lessons.md（保持"与源同步"）；读取失败降级为可读告警而非抛错——provider 抛错会波及整次组装，等于让方法论层拖垮会话。
  - order 取 10：dsh 约定 `-100` harness 身份 / `-99` harness 源码 / `0` 部署 persona / `100–199` 工具指导（`src/index.ts:56-60`）→ L1 排在 persona 之后、工具指导之前。
  - **为何不再需要每步补注入**：系统提示每次请求重新组装，compaction 只重写消息流、不触及系统提示 → L1 天然免疫压缩。旧版 `agent/pre-step` 的"缺失补精简版"与 surface 全文扫描（`l1InContext`）随之删除（约 30 行），L1 也不再以"用户发言"形态出现在界面上。
  - `agent/pre-step` 仅保留**幂等兜底**（若 session-start 晚于首个请求组装，首步补注册）：WeakMap 去重、不注入任何消息、原样返回 `next()` 决策。
- **workspace 发现**：插件用 `agent.session.header.cwd`（session 的 workspace）向上找含 `METHODOLOGY.md` 的目录（最多 16 层）；找不到则不注册（不干扰其他 workspace），并记住该判定，避免每步重走目录发现。
- **可核性（2026-10-10 更正）**：系统提示**是落盘的**——位于 `request/header` 事件的 `data.header.system`（换座位后实测该字段 14387 字符（2026-10-10 17:54 快照；其后因 harness 段变化另有 14817）、含 L1 段；旧机制时期 6292 字符、不含 L1）。早前"系统提示不落盘"的判定**已作废**：其依据是"never infer the working directory…"这一特征串在某历史会话 0 命中，而该会话的系统提示里本就没有这个串（4135 字符，属不同时期/启动方式），且未枚举事件类型——属**代理特征串 + 单样本外推**（教训 B1-5，已沉淀）。
  - `analyze_session.py` 的 L1 指标因此为**三源取或**：① 系统提示记录（首选，最强）＞ ② 旧版会话日志注入标记 ＞ ③ 插件诊断日志 `/tmp/univedge-l1.log` 注册行（`l1 section registered session=<id> workspace=<根>`；`UNIVEDGE_L1_LOG` 可覆盖路径；它留痕的是"注册时刻/对象"这一 request/header 不记录的信息）。输出增 `L1 判定来源` 以区分来源；行为侧指标（L2 契约/自省）不受影响。
- **L1 尺寸与预算门（2026-10-10 实测；经 R7 审查修订）**：
  - L1 全量 **8,546 字符**（2026-10-11 实测；§1.7 增两规则后由 8,093 增至此）（双路锚点：`readL1()` 输出 + `request/header.data.header.system` 中逐字一致的 L1 段）。
  - **门以字符定义**：常量 `L1_CHAR_LIMIT = 10520` 定义在 `univedge-l1-inject.ts`（**单一事实来源**，测试 import 同一常量，避免两处漂移），现值余量 **+23.1%**（门 10,520 / 现值 8,546；门取值为政策选择——round(8,093 × 1.30)，与 token 换算比无关）。
  - **门的触达路径（R7 第二轮 S0-1 修复）**：仓内无 CI、无 git hook、也无人调用测试——若门只设在测试里，实际语义是"下次有人手动跑测试时才报错"，与该门要防的失效模式同构。故门**下沉到注入路径**：`render()` 在**每次提示组装**求值 L1 时检查，越界即写 `/tmp/univedge-l1.log` 告警（同一尺寸只告警一次，不刷屏）；测试另有"门真的会响"实测（压低门限触发告警）。门限可用 `UNIVEDGE_L1_CHAR_LIMIT` 覆盖。
  - **token 数一律标"未标定估计"**：不同口径给出 0.22～2.39 字符每 token（全库复算：仅文本/output 0.22；文本+推理/output 2.39），跨内容类型边际比 2.2–3.4 → L1 量级估计约 **2,400–4,600 tokens，不可作判据**。R7 审查（2026-10-10）指出原实现以未标定比折算字符门，已改为字符定义（该比值现仅作量级参考）。
  - **为何需要门**（`git log` 逐 commit 重建，**口径 = §0–§1 + 基层，不含"确认纪律"块**）：08-27 4,537 → 10-10 7,691 字符（**+70%/6 周**）；另注（R7 第三轮 S2-7 更正）：确认纪律块（**402 字符**）于 2026-09-02 才加入注入器，08-27 时点不存在该块，故不宜给"全量口径的同期百分比"；两口径之差是常量 **402 字符**。各版本 commit 的 **L1 净增量**：v0.10 +606 / v0.11 +835 / v0.12 +1,290——主体是 §1.7/§1.2 的**内容**改动；文件头变更史**不在 L1 切片内**（`readL1()` 自 `## 0.` 起切片，R7 第三轮 S1-1 更正）——无门则两三个版本后无人察觉。
  - 参考（不构成判据）：L1 占最近一次请求提示约 2%（锚点：`session-9e496951` 18:07:34 那次请求 = input 1,602 + cacheRead 210,816 = 212,418，缓存占比 99.25%；会话其后继续增长，故此处标**某次请求**而非"最近一次"——R7 第三轮 S2-1）、占上下文窗口约 0.5%（1,000,000）。
  - **不瘦身的决策记录**：`run/l1-trim/plan.md`（T1/T2 两档经量化后均不执行：按本项目**claimed** 的混合单价量级 0.16 元/百万 token（来源：审查风暴成本分析 `run/review/handoff-reviewer-storm-cost.md` 的估算，未在用量记录中逐项复现——R7 第三轮 S2-2），T2 省量约 0.02 元/100 次请求，低于改动内核主文档 + 内容分散多处的成本）；该文档同时是"字符门若被触发时的预案"，其原版算术不可达问题已由 R7 审查指出并在 `run/l1-trim/review-response.md` 中逐条核验修订。
- **审查风暴抑制**（reviewer 附带，2026-08-31 review-storm-diagnosis 修复）：触发判据只问"有无交付物"不问"是否已被审过"，导致 审查→修订→审查 反馈环（2h 6 次审查）。补三层感知：**冷却期**（同主会话滑动窗口内成功审查 ≥`UNIVEDGE_REVIEW_MAX_PER_WINDOW`（默认 2）次 → 暂停自动审查 `UNIVEDGE_REVIEW_COOLDOWN_MIN`（默认 15）分钟，延迟不丢弃）；**hash 去重**（产物内容与上次被审时全同 → 跳过）；**quiet 指令**（turn 文本含 `--no-review` / `review:off` → 跳过，替代全关硬开关）。判定逻辑均为 `reviewer-shared.ts` 纯函数（可单测），`univedge-reviewer.ts` 只维护状态。检查顺序：熔断 → 限流 → quiet → **声明通道（@review 必审）** → 自动判据 → 冷却 → hash → 触发。
- **显式审查点**（2026-08-31 framework-redesign 方向 1，双通道并存观察期）：复杂度根源 = 自动嗅探判据在猜测"是否完成且值得审"（任务状态，不在事件流里），启发式不精确 → 过滤器叠加螺旋（风暴抑制五件套中冷却/hash 正是为此买单）。理念反转：**审查由"完成宣告"驱动，不由"写入文件"驱动**——主 agent 在产物达到 **claimed**（完成态、可被独立验证）时以 `@review <路径>` 宣告审查请求（专有标记；可列多路径清单）；**响应审查意见的修订不自动重宣**（修订 ≠ 重新完成——风暴结构性消失）；quiet 指令 `--no-review` / `review:off` 声明本轮不审查。**方法论已内化**：本语义写入 `METHODOLOGY.md §1.7`（位于 L1 注入段 §0–§1，随 `univedge-l1-inject.ts` 自动注入主 agent——外部用户拿到仓库同样生效，观察期 A 指标 = 主 agent 文档遵守率，非用户提醒率）；`VERIFICATION.md §3.4` 指向其触发语义。会话结束兜底留待观察期结束切换时实现。观察期双通道并存：报告头标 `触发通道: declared/auto`，对比触发量与覆盖后再退役自动通道（届时删除 hasDeliverable 启发式 + 冷却 + hash）。
- **审查触发卫生与结论时效（2026-10-10 R7 实测修复，依据 `run/review/handoff-reviewer-overreview.md`）**：
  实测 6 次触发 / 24,838,317 tokens ≈ 3.97 元，其中**约 50% 属可避免**——5 轮各自都找到实质问题（问题不在审查本身），
  但同一交付单元的合理轮次是 2 轮（首审 + 复验）。修复与规则（**需重启实例生效**）：
  1. **触发卫生**（R1/R2）：`@review` 由裸匹配改为"**至少一个可解析路径**才算声明"，并排除 `subagent-report` /
     `subagent-settled` 回执来源——原实现把评估者报告里**引述**的 `@review` 当成新指令，而 declared 通道不受冷却约束 →
     **审查机制自我放大**（越审越触发）；声明解析器取消 200 字符上限、白名单补 `.ts/.py/.sh/.tex` 等源码扩展名
     （原实现 12 项清单只解析出 2 条，源码永不可被声明）；声明路径不再截断（原 `slice(0,12)` 静默丢弃第 13 项起）。
  2. **漂移即失效**（§1.7 新规则）：产物指纹（size/mtime/sha256前12）组包时留档、落盘前复检；检出漂移 → 本轮结论**作废**
     ——报告头标 `已失效（窗口内产物漂移）`、索引结论加后缀 `（⚠已失效：窗口内漂移）`。理由：无锚点的"通过"等同未审
     （实测同一条命令两次运行得 110/110 与 123/123，四轮评估者均提出）。
  3. **同目标复用**（§1.7 新规则）：declared 通道下，声明清单与全部产物指纹与上轮**完全相同** → 复用上轮结论并在索引
     显式记录（通道列 `declared-reuse`），不启动新一轮；`--force-review` / `review:force` 可强制重审。**复用 ≠ 静默跳过**。
  4. **auto 通道收紧**（R3）：本轮无 declared 且**距上次成功审查 ≥ 30min**（`UNIVEDGE_REVIEW_AUTO_GAP_MIN`）才启用
     ——原阈值 15min/2 次 ≈ 每 5 分钟一次，与"同一任务连续修订"节奏不匹配（两次 auto 实测相隔 4 分 49 秒）。
  5. **报告全文落盘**（裁决 4）：`pickReport` 只留"含报告锚的单条最长消息"（落盘 2–4 KB），评估者完整产出
     （单份 141–183 K 字符）另存 `run/review/<主8>/<评估者8>/transcript.md`——审查历史可直接复核，无需解压会话 `zstd`。

## 安装（一次性，headless 与 Web 共用）

patch 里插件的 `name` 是相对 dsh profile 目录的路径（可移植、无硬编码绝对路径），首次使用需把本目录符号链接到 dsh 的 profile 目录（`headless` 与 `web` 各建一次）。`<UnivEdge>` 即你 clone 本仓库的位置，例如 `/data/home/hanwu/UnivEdge`；`~/.dsh` 是 dsh 数据根目录的**默认位置**（若设置了 `DSH_HOME` 环境变量则为 `$DSH_HOME/profiles/...`）：

```bash
ln -sfn <UnivEdge>/dsh-adapter ~/.dsh/profiles/headless/dsh-adapter
ln -sfn <UnivEdge>/dsh-adapter ~/.dsh/profiles/web/dsh-adapter     # Web 模式用
```

## 用法（headless，AI/脚本）

**关键**：dsh headless 的 workspace = 启动目录（`process.cwd()` 硬编码，无参数覆盖）。要让 workspace 指向 UnivEdge，须在 UnivEdge 目录下启动，并加 `--tsconfig` 指向 dsh 的 tsconfig（否则 `@deepseek-ai/cordis` 解析到错误版本，报 `FiberState 导出缺失`）。

```bash
cd <UnivEdge 目录>                                 # workspace = UnivEdge
source ~/.nvm/nvm.sh                               # node 在 nvm（tsx 的 .bin shim 找 node）
export DEEPSEEK_API_KEY='sk-xxx'
export DSH_PERMISSION_MODE='danger-full-access'    # 沙箱说明见下
<dsh路径>/node_modules/.bin/tsx \
  --tsconfig <dsh路径>/tsconfig.json \             # 必须：tsconfig paths 解析 workspace 包
  <dsh路径>/apps/cli/src/bin.ts \
  --profile headless \
  --patch <UnivEdge>/dsh-adapter/cordis.patch.yml \ # 加载 L1 注入插件
  "任务"
```

`<dsh路径>` 示例：`/data/home/hanwu/deepseek-harness`。

## 沙箱说明

dsh 的 bash 工具默认要求沙箱后端（bubblewrap/Landlock）来包装命令（fail-closed：无后端拒绝执行）。

- **bubblewrap**：conda 可装（`conda create -n univedge bubblewrap`），但 HPC 共享服务器常**禁止 user namespace**（报 `setting up uid map: Permission denied`）→ 不可用。
- **Landlock**：内核支持（≥5.13 + LSM 含 landlock）但 dsh 的 Landlock 后端是 native 代码（`native/landlock-run`，需 `pnpm run build:native`，要 rust 工具链）→ 服务器无 rust 时不可用。
- **`DSH_PERMISSION_MODE='danger-full-access'`**：`bundle/base/cordis.patch.yml` 里 `mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`；danger-full-access 模式下 bash 工具直接执行（绕过沙箱，无需后端）。**放弃沙箱隔离**——测试用可接受，生产慎用；有可用沙箱后端时可不设此变量。

## Web 模式（人类使用）

在 dsh 目录启动，**必须带 `--patch`**（否则只加载 AGENTS.md 的 L0，无 L1 注入/审查），且已装符号链接（见上方「安装」）：

```bash
cd <dsh 目录>
source ~/.nvm/nvm.sh
export DEEPSEEK_API_KEY='sk-xxx'
pnpm dsh web --patch <UnivEdge>/dsh-adapter/cordis.patch.yml --no-open
# 注意：--patch 必须放在 --no-open 之前（dsh 参数透传机制）
# SSH 端口转发：ssh -L 3080:127.0.0.1:3080 <user>@<host>，浏览器开 http://127.0.0.1:3080
# 进入后：Settings→Models 配 key → Choose workspace 选 <UnivEdge 目录> → 开会话
```

workspace 在 UI 里选（可任选 UnivEdge 目录）——无 headless 的 workspace 坑，也不需 `--tsconfig`（pnpm 正确处理依赖）。

## 验证记录（2026-08-28）

- **L0**：dsh 自动加载 UnivEdge AGENTS.md，真实模型识别"UnivEdge + 核心信条"（官方 e2e + UnivEdge 专属验证均 PASS）。
- **L1 导航**：agent 主动 read `knowledge/conventions.md`（任务所需的约定），结论正确。
- **L1 注入 + 完整方法论**：带 `--patch` 重跑，agent 产出完整任务契约（`run/y31-verify/contract.md`：启动自省 B1-B4+P 逐条、物理量定义、配置基线、副作用前核对清单）+ 四路线数值交叉验证 + 复核回写沉淀（benchmarks B8、review-lessons B2-4、conventions §1.1 补条目）。
- **对比**：无 L1 时 agent 算对但无契约/自省；有 L1 时完整执行方法论全流程。
- **L3-1 门控**：agent 少填字段调 `submit_hpc_job` → schema 层拒绝（双层门控，缺字段连提交环节都到不了）。
- **L3-3 度量**：`analyze_session.py` 完美区分有/无 L1 注入的 session（契约/自省 ❌→✅）。
- **L3-2 独立评估者**：任务完成自动 spawn 评估者（spawn provider，零父上下文）；报告逐条对照 VERIFICATION 检查项、独立重算（5 条代码路径）、L2 解耦声明。两轮实测：①Y₂¹ 验证 → "通过"（找不出实质问题）；②"2+2=4" 产物 → "需修订"（戳穿"追加保留先前记录"叙述与文件系统证据矛盾 + 状态自我升级 + 产物缺脚本）——**怀疑派立场成立**。
- **L4 双宿主对比（2026-08-29，任务：u^t=√(10/7) 计算，同一 prompt）**：WorkBuddy（干净基线，无 L1）vs dsh（L1 双时机）。结论：**数值两边等价（模型能力层），方法论遵守决定性差异（纪律层）**——WorkBuddy 无契约/无自省/无外部锚点/无状态机（"算对但裸奔"，一步问答完成），dsh 完整执行（契约 B1-B4+P 逐条 + 锚点 Wald/Hartle/Carroll + T1-T7 验证 + claimed 状态 + 五要素产物，26 步）。**L1 不是加能力，是加纪律。** 详细对比见 `run/l4-task1/report-l4-comparison.md`。
- **长会话观察（L4 顺带）**：26 步/30 工具调用任务中 L1 全程在场（step 2-24 ✅）；compaction 未触发，"压缩后自动恢复"路径待真实长任务验证。

### 测试阶梯总览（L0-L4，全绿 ✅）

| 层 | 验证内容 | 状态 |
|---|---|---|
| L0 | 入口加载：AGENTS.md 自动注入，agent 识别内核 | ✅ |
| L1 | 渐进披露导航：agent 主动读 conventions.md 等任务所需层 | ✅ |
| L2 | 契约与自省：L1 注入后 agent 产出完整任务契约 + B1-B4+P 自省 | ✅ |
| L3-1 | 门控：submit_hpc_job 双层 CHECK 校验（schema + 执行层） | ✅ |
| L3-2 | 独立评估者（R7）：turn/end 自动 spawn，怀疑派审查成立 | ✅ |
| L3-3 | 度量：analyze_session.py 7 项指标区分有无 L1 | ✅ |
| L4 | 真实任务双宿主对比：数值等价 / 方法论纪律决定性差异 | ✅ |
| 长会话 | L1 全程在场（26 步） | ✅ |

**结论**：dsh + UnivEdge 组合的完整验证链路闭环——"方法论的强制执行"从入口（L0）到纪律（L2）到能力（L3）到真实对比（L4）全部成立。（上表"长会话"行原记"compaction 恢复路径待真实任务观测"：2026-10-10 L1 改坐系统提示 section 后，该路径**结构上不再存在**——系统提示每次请求重新组装，不受 compaction 影响。）

## 后续待办

- 插件当前假设 UnivEdge 目录含 `METHODOLOGY.md` 与 `knowledge/review-lessons.md`；若结构变动需同步更新 `readL1()`。
- `univedge-reviewer` 的触发是 `turn/end`（headless 一次性进程会因进程退出而中断审查，Web 持续模式无此问题；`test-runner.ts` 专用于 headless 下验证完整链路）。
- `submit_hpc_job` 待补：非法值测试 / 锚点完整性（ref 非空≠有参照）/ 正常提交冒烟。
- ~~宿主集成待实测（2026-10-10 改造后）~~ → **已实测通过（2026-10-10 17:54 重启）**，证据三条：① `/tmp/univedge-l1.log` 注册行 `session=session-9e496951-… workspace=/data/home/hanwu/UnivEdge`（与 `DSH_SESSION_ID` 一致，重启后 23s）；② 该会话 `request/header` 记录的系统提示由 6292 → **14387 字符**，且含新标题 `## UnivEdge 方法论 L1 层（常驻规范…`＋基层＋确认纪律（差值 8095 ≈ `readL1()` 实测 8093 字符）；③ 旧机制注入消失：**口径**＝`kind=='user'` ∧ 含旧版注入标题（`以下是你必须遵循…`/`…精简版`）→ 重启前 **9** 条 / 重启后 **0** 条（测量时刻 17:57；宽口径"含 B1-B4+P"会把子代理回执计入而失准——R7 第三轮 S1-2）。首轮时序亦无缺失（重启后首个 request/header 即含 L1）。
