# 18 - v0.15/v0.16 落地记录 + P9 凭据隔离审计

> 日期：2026-10-19 ｜ 整理：Enki ｜ 状态：**已落地（本地，v0.16），待远程复核**
> 依据：`docs/17` 裁决包（han 2026-10-19 批准高优先项；P14 待讨论后落）
> 范围：P12 / P13 / P1 / P4 / P8 五条 + P9 的 dsh 现状检查 + **P14（v0.16，可执行化）**。

---

## 1. 落地清单（v0.15）

| 候选 | 落点 | 条款摘要 | 探针/负控 |
|---|---|---|---|
| **P12** 可审查性 | `METHODOLOGY §0.4` + `VERIFICATION SC-07`（H） | 无会话上下文的审查者须仅凭本产物完成核对；依赖对话/记忆即不合格；**内容层为判断**，形式层待报告结构约定后下沉脚本 | 只给产物复核一条结论；负控=证据仅在对话中判不合格 |
| **P13** 顺序不变性 | `METHODOLOGY §1.7` + `VERIFICATION RC-08`（C） | 高代价判定做等价呈现复核；不一致 → 升 T2 或 need_human；单次判定不作定论；建议 ≥3 次重复 | A/B 等价呈现断言 S0/S1 集合一致；负控=真不同产物须不同 |
| **P1** 会话启动冒烟 | `METHODOLOGY §1.1` 第 1 步 | 承接性任务先跑最小冒烟验证，检出 broken 先修再开工 | 构造"上会话留下坏状态"→ 须先检出 |
| **P4** 裁剪留痕 + 标签保留 | `METHODOLOGY §1.6` | 省略必须留可读占位符；关键证据可打「保留」标签豁免裁剪；静默丢弃=不可审计 | 裁剪后断言占位符存在、标注证据仍在 |
| **P8** 约束不可自改 | `METHODOLOGY §1.3` | 不得改自身运行约束（超时/预算/门/检查项/沙箱策略）；被触发只可缩短工作或上报；长会话交付前复核约束仍生效（防 drift） | 超时场景断言不改配置；长会话后断言约束仍被遵守 |
| **P14** T1/T2 边界 | `METHODOLOGY §1.2/§1.7` + `tools/review_depth.py` | 契约填 `criteria` 台账 + `high_cost` 六项（带证据）；工具机械判定 T1+脚本 / T2 / T1；**agent 不自评** | 工具内置 7 例自检（正/负控全绿）＋手工样例：覆盖 0.667 + SLURM 90min → T2 |
| （P2/P3） | 并入 P14 | — | 见 §4 |

**L1 预算**：9,502 → **10,163 字符 / 236 行**（门 10,520，余量 **357 = 3.4%**；相对 v0.15 前的 10,177 **净 -14**，遵守 `docs/08 §7`"余量 <20% 时新增须伴随等量删减"）；
指纹 `7c150890cd09da7e`，已写入 `dsh-adapter/test-results/l1-baseline.json`。
> 注：本机无 dsh checkout，无法运行 `run-tests.sh --update-l1-baseline`；基线由**复算 `readL1()`
> 同一算法**得到（Python 复现：METHODOLOGY §0–§1 + review-lessons 基层 + CONFIRM_DISCIPLINE；
> 无非 BMP 字符，len 与 JS `.length` 一致）。**需在远程 dsh 上跑一次 `run-tests.sh` 复核**
> （预计 l1-invariants 全绿；若基线不一致，以远程实测为准刷新）。

**未做的事（诚实标注）**：SC-07 的**自动 verifier 未实现**——因为报告结构约定（docs/12 R1c）尚未落地，
缺可解析对象；故 SC-07 标为 H（判断），**不假装已机械化**。P1/P4/P8 的探针同样需要宿主测试承载，
当前只有规格（见 §3），无实现。

---

## 2. P9 凭据隔离审计（dsh @ `/data/home/hanwu/deepseek-harness`，v0.1.1-rc.2）

> 方法：静态代码审计（远程 `git log` = `b150a55`）。**未做运行时注入测试**，故结论为代码可核级（A2 静态）。

### 2.1 结论表

| 面 | 机制 | 判定 |
|---|---|---|
| **环境变量** | `scrubbedParentEnv()`（`packages/subprocess/subprocess/src/index.ts:44,60`）：丢弃 `/KEY\|PASSWORD\|SECRET\|TOKEN/i` 与全部 `DSH_*`；显式 `env` 在清洗后合并（须主动 opt-in） | ✅ **已隔离**（`DEEPSEEK_API_KEY` 命中 KEY） |
| **文件型凭据** | 沙箱 `bwrapProfileArgs`：`--ro-bind / /`（整个文件系统只读可见）；Landlock `readOnly: ['/']`；Seatbelt 仅 deny 写 | ❌ **未隔离**——`~/.ssh/id_rsa`、`~/.config`、`.netrc`、云凭据等**可被 agent 代码读取** |
| **网络出网** | bwrap 仅 `--unshare-pid`，**无 `--unshare-net`**；Landlock/Seatbelt 不管网络 | ❌ **未限制**——"可读凭据 + 可出网"构成外泄面（prompt injection 场景） |
| **沙箱升级** | `read-only → workspace-write → danger-full-access`；`sandbox_permissions` 必须配 `justification`，经 **用户批准通道后才执行**（fail-closed） | ✅ **有审批门** |
| **默认模式** | `sandbox-policy` schema 默认 `'read-only'`（fail-safe） | ✅ |
| **工具级审批** | 无通用 per-tool allowlist（仅 plan mode / 子代理 permission modes）；副作用主要靠沙箱边界 + 升级审批约束 | ⚠️ 记录（非本轮范围） |

### 2.2 判定与建议

- **P9 部分成立**：环境变量面 dsh 已做对（比预期好）；**真正的缺口是文件型凭据与网络**。
- **宿主侧修（建议，不属内核）**：沙箱只读 bind 改为**白名单**（workspace + 系统运行目录），
  显式排除 `~/.ssh`、`~/.aws`、`~/.config`、`~/.netrc`、`~/.gnupg`；或引入网络策略（默认禁出网，
  按需放行域名）。这是 Anthropic `docs/16 B2-6` 所说"structural fix：token 永不可从沙箱内代码触及"的对应物。
- **内核侧（建议条款，待批准）**：把"凭据不可触及"写成**三面**判据——环境变量 / 文件 / 网络可达面，
  探针在沙箱内断言三者均不可达。**本轮未落**（因用户在等 P14 讨论；且该条依赖宿主配合，先出审计结论）。
- **优先级**：文件凭据 > 网络 > 工具级审批。若 han 的 HPC 凭据放在默认路径（`~/.ssh`），
  建议**先修沙箱 bind 白名单**，成本小、收益直接。

---

## 3. 探针规格（P1/P4/P8 待宿主测试实现）

| # | 探针 | 负控 | 破坏式（必须失败） |
|---|---|---|---|
| P1 | 会话开始时对既有产物跑最小检查；构造"上会话遗留坏状态"（如改坏一个被依赖文件）→ 断言检出并先修 | 正常状态不告警 | 移除冒烟步骤 → 检不出 |
| P4 | 对超预算报告/上下文执行裁剪 → 断言出现「已省略 N 行」占位符；给一条关键证据打「保留」→ 断言仍在 | 未标注内容被裁剪属正常 | 移除留痕/标签规则 → 两条断言分别失败 |
| P8 | 构造任务超时 → 断言 agent 不修改超时/门配置；长会话后断言关键约束（如"不得自行声称已验证"）仍被遵守 | 正常完成不误报 | 移除条款 → 构造"改大超时"或"后期丢弃约束"样例通过 |
| P12 | 只给产物文件、不给会话 → 弱审查者复核一条结论 | 证据仅在对话中的结论须判不合格 | 移除 SC-07 → 该样例被判合格 |
| P13 | 同一产物 A/B 等价呈现 → 断言 S0/S1 集合一致 | 两份真不同产物须给不同结论 | 移除 RC-08 → 已知偏差样例上结论不一致却被接受 |

> 实现位置建议：P1/P4/P8 → 宿主审查/会话测试（dsh-adapter/tests）；P12/P13 → 审查执行侧（评估器
> 输入包 + 报告结构），暂以流程规定承载。

---

## 4. P14（已落地，v0.16）：T1/T2 边界的**可执行化**

**问题**：docs/15 有 T0/T1/T2，但"何时 T1 够、何时必须 T2"无判据；旧实现是"默认 T1 + 人临时说 t2"，
两个方向都会错（难例静默走 T1；易例白付 T2）。

**han 的追加要求（2026-10-19）**："判断本身必须可执行，不能只是口头说法让 agent 自行判断。"
→ 本轮把两个判断都改成**构造性 + 机器校验**：

### 4.1 "判据可得性"怎么判（不是自评）

不问"你觉得有没有判据"，而是要求**交出一张表并接受机器校验**：

| 规则 | 机械检查 | 不过的后果 |
|---|---|---|
| R2 行完整 | 每行须有 step/criterion/anchor_id/anchor_source/tolerance/judge_mode/negative_control | 契约非法 |
| R3 锚点可解析 | `anchor_source` 必须匹配 `arxiv:/doi:/file:/bench:/claim:`；`file:` 须存在 | 契约非法 |
| R4 已执行 | `judge_mode=script` → 有 `exec_cmd` 且 `last_result ∈ {pass,fail}` | **不计入覆盖**（描述再好也不算） |
| R5 负控会响 | script 行须有负控且 `negative_control_result == "fail"` | **不计入覆盖**（判据会不响） |
| R6 人工判据 | 须有 `decision_rule` + 第二方确认 | 不计入覆盖 |
| R7 覆盖 | 关键步骤被"脚本+负控通过"覆盖的比例 | `coverage < 1` → 进入 T1/T2 分支 |

即：**判据可得性 = coverage**，不是"能不能写出来"，而是"写出来且证明它会响"。

### 4.2 "高代价"怎么判（不是自评）

六项触发，**每项必须带可核证据**；无证据/未知 → **一律按高代价**（fail-safe）：

| 触发项 | 证据要求 |
|---|---|
| 不可逆动作 | 工具名/命令（push / slurm submit / delete / 外发） |
| 下游放大 | `file:<claims 或锚点表>`，且其中引用本产物 id |
| 结论化 | 目标路径（docs/、knowledge/）须存在 |
| 成本阈值 | 数值 + `source`；若 `source` 是 SLURM 脚本，**自动解析 `--time`**（样例：01:30:00 → 90min > 30min → high） |
| 交接 | handoff 产物路径 |
| 约定变更 | knowledge/ 下的约定/基准路径 |

### 4.3 判定映射（三行，机械）

- 任一 script 判据 `fail` → **blocked**（先修）
- `coverage == 1.0` → **T1+脚本**（脚本已覆盖关键步骤，审查抽验台账；高代价另做 RC-08）
- 否则：高代价 → **T2**；低代价 → **T1**

### 4.4 工具与验证证据

- 工具：`tools/review_depth.py`（零依赖，CLI + `--selftest`）；
- **自检 7/7 通过**：`ok_T1scripts / gap_low_T1 / gap_high_T2 / unexecuted_T2 /
  negcontrol_broken_T1 / script_fail_blocked / anchor_unresolvable_invalid`；
- 手工样例：`tools/examples/review-depth/example.json`（3 关键步骤，1 个人工判据 → coverage 0.667；
  下游放大 + 结论化 + SLURM 90min → 高代价）→ 输出 **T2**，理由逐条可读；
- 自检过程还抓到我自己的两条规则语义错误（"未执行/负控不响"曾误判为整份契约无效）——已修正为
  "降级为不覆盖"。

### 4.5 遗留（诚实）

- P14 判定的**输入仍由 agent 填表**；工具只能保证"表自洽 + 证据可解析 + 覆盖可算"，不能证明
  agent 没漏写关键步骤（`critical_steps` 完整性靠契约审查 + 领域判断）。这是本方案的最后人工环节，
  已在 `docs/17 §7 U3` 标注，不假装解决。
- 需在远程 dsh 上跑 `run-tests.sh` 复核 L1 基线（本机无 dsh）。

## 5. 验证状态与下一步

- [x] 条款写入 METHODOLOGY（v0.15）+ VERIFICATION（SC-07、RC-08）
- [x] L1 基线复算并更新（10,177 / 233 / `e4bde1d0fdbc87f2`）
- [ ] **远程 `run-tests.sh` 复核**（本地无 dsh；须在 `/data/home/hanwu/deepseek-harness` 环境跑）
- [ ] P9 宿主侧修（沙箱 bind 白名单 / 网络策略）——待 han 决定是否立项
- [ ] P14 讨论定稿后落条款
