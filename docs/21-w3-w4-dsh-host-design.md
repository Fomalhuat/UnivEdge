# 21 - W3/P8 与 W4/P4 的 dsh 宿主设计（**设计稿，不改 dsh 代码**）

> 日期：2026-11-19 ｜ 整理：Enki ｜ 依据：docs/20（接线审计）、METHODOLOGY §1.3/§1.6
> 目标仓库：`/data/home/hanwu/deepseek-harness`（dsh，HEAD 以远程为准）
> 结论先说：**两项都不是从零开始**——dsh 已有压缩记录、工具结果裁剪标记、沙箱升级审批；
> 缺的是"约束钉住 + 漂移检测"和"可见留痕 + 保留标签"两层。

---

## 0. 现状盘点（代码级）

| 能力 | 现有实现 | 对 W3/W4 的意义 |
|---|---|---|
| 压缩事务 | `packages/compaction/compaction/src/types.ts`：`compaction/summary` 已记录 `shadowedRange` / `shadowedSeqs` / `shadowedTokenCount` | **W4 的取证数据已存在**，缺"把省略写进替代消息" |
| 摘要消息构造 | `compaction-basic/src/summarizer.ts:189 frameSummary()`：`CHECKPOINT_PREAMBLE + tags + summary` | W4 的**唯一注入点**（加一行"已省略…"） |
| 工具结果裁剪 | `compaction-tool-result-pruner/src/config.ts:7`：`PRUNE_MARKER = '[... tool result middle pruned ...]'` | W4 **部分已实现**（有标记、无计数/范围） |
| 沙箱模式 | `sandbox-policy/src/session-mode.ts:70 setSandboxMode()` 直接 append `sandbox/mode` | **W3 的风险点**：写路径本身不带审批 |
| 沙箱升级 | `sandbox/sandbox/src/escalation.ts`：`sandbox_permissions` + `justification`，经用户批准（fail-closed） | W3 可复用的审批通道 |
| 审批服务 | `packages/interaction/user-approval`（`ctx.approval`）、`core/tools` 的 `ask` 策略 | W3 的审批承载 |
| 超时 | `guard/timeout-policy`：工具声明 `timeoutMs`，包装器强制执行 | 已是"不可被模型放宽"的形态，可纳入约束清单 |
| 设置写入 | `settings/settings-file`；`tool-cordis` 仅能写"默认模型选择" | 安全约束项**不在**可写面（sandbox 模式下 `workspace-write` 也只 bind workspace）|

**结论**：W3 需要新增一个 guard 包 + 在两条写路径上挂钩；W4 只需要改两个格式化点 + 一个"保留"选择器。

---

## 1. W3：约束不可自改 + 长会话漂移复核（P8）

### 1.1 约束清单（钉住什么）

在 dsh 侧定义**受保护约束键**（值从既有服务解析，不新增第二套配置）：

| key | 来源 | 变更途径 |
|---|---|---|
| `sandbox.mode` | `sandbox-policy`（session override / defaultMode） | `setSandboxMode()` |
| `approval.policy` | `user-approval` / 会话 `approval/policy` 事件 | 策略切换 |
| `tool.timeout` | `guard/timeout-policy` 的部署配置 | 配置加载 |
| `compaction.policy` | compaction 后端配置（阈值/保留） | 配置加载 |
| `review.tier` | UnivEdge 适配层（`reviewTier`） | 声明/契约 |

> 只钉"安全/流程约束"，不钉模型选择、UI、日志级别——避免把正常配置变更变成摩擦。

### 1.2 机制

1. **钉住（session start）**
   - `constraint/pinned` 事件：`{ keys, values, hash, at }`（hash 用规范 JSON 的 sha256 前 16）；
   - 事件只写一次；重复钉住必须一致，否则视为漂移（fail-closed）。
2. **拦截（write path）**
   - 新增 `packages/guard/constraint-policy`：导出 `assertMutable(ctx, key, next)`；
   - `setSandboxMode` 改为：先 `assertMutable('sandbox.mode', mode)` → 若与钉住值不同，必须经
     `ctx.approval.request()` 得到**人类批准**，然后 append `constraint/change`
     `{ key, from, to, approver, justification, at }`；无批准 → 抛错（工具调用失败，不静默）。
   - 审批失败/超时 = 拒绝（与 `escalation.ts` 的 fail-closed 一致）。
3. **漂移复核（checkpoint）**
   - 在两类时点复核：① 每个"交付单元"（UnivEdge 的决策门/完成宣告）；② 每 N turns（默认 20）；
   - 复核 = 重新解析受保护键 → 与钉住值比对：
     - 一致 → append `constraint/verify`（通过）；
     - 不一致且有对应 `constraint/change`（含批准）→ 通过（记录变更链）；
     - 不一致且无批准 → append `constraint/drift`，并**硬失败**：后续工具调用一律拒绝，
       审查强制 T2 + need_human（UNIVEDGE 侧读该事件）。
4. **可见性**
   - 系统提示或 session 头加一行：`constraints pinned: sandbox.mode=read-only, tool.timeout=…（变更需人类批准）`；
   - 漂移时模型可见错误：`[constraint drift] sandbox.mode: read-only → danger-full-access（无批准）`。

### 1.3 不做什么（边界）

- 不做"绝对不可变"：人类批准必须能改（否则长任务无法推进）；我们防的是**agent 自改**；
- 不钉模型/温度等非安全项；不接管用户命令行的显式切换（但同样要求审批与记录）；
- 不改 `escalation.ts` 的语义，只在其外层加"钉住 + 记录"。

### 1.4 负面清单（必须被拦）

1. 工具调用试图 `sandbox_permissions=danger-full-access` 且无 justification → 已拦（现有），
   **新增**：即使有 justification，若目标是改钉住值且无人类批准 → 拦；
2. 代码里直接 `setSandboxMode(session, 'danger-full-access')`（绕开工具）→ `assertMutable` 抛错；
3. 长会话中外部改写 settings → 下次 checkpoint 触发 `constraint/drift`；
4. 重放/恢复会话时 `constraint/pinned` 与现值不一致 → 拒绝恢复（或强制 T2 + 人工确认）。

---

## 2. W4：裁剪留痕 + 保留标签（P4）

### 2.1 现状与缺口

- **摘要压缩**：事件里有 `shadowedRange/Seqs/TokenCount`，但 `frameSummary()` 生成的替代消息
  **不告诉模型"省了什么"** → 模型可能把"摘要没提"误当"没发生"。
- **工具结果裁剪**：有 `PRUNE_MARKER`，但**无字符数、无 range**，且是英文固定句。
- **保留机制**：不存在。关键证据可能被压掉。

### 2.2 机制

1. **摘要替代消息加"留痕头"**（改 `frameSummary` 签名，向后兼容）：
   ```
   [已压缩 seq 12–48：37 条消息 / 8,400 tokens；保留 2 条（seq 19, 33）]
   ```
   - 文案固定前缀 `[已压缩` + ASCII 数字/seq，便于检索与测试；
   - 数据来自 `shadowedRange/shadowedSeqs/shadowedTokenCount` + 新增 `retainedSeqs`；
   - **先测量再写入**：现有"summary 必须更小"的检查（`region.ts:374`）在加入留痕头后重算，
     留痕头本身计入 `framedSummaryTokenCount`（否则可能突破预算）。
2. **工具结果标记带计数**：
   - `PRUNE_MARKER` 改为函数 `pruneMarker(charsRemoved)` →
     `[... tool result pruned: 12,345 chars removed ...]`；
   - 保持单行、ASCII、无换行噪声（降低 tokenizer 抖动）。
3. **保留标签**：
   - 消息级：`retain` 标记（消息 source 上增加 `retain?: true`，或约定前缀 `[retain]`）；
   - 选择器：`compaction-basic` 的区域选择**跳过 retained 节点**，其余照常；
   - 不变量：`shadowedSeqs ∩ retainedSeqs = ∅`（在 `compaction/invariant.ts` 加断言）；
   - 保留上限：`maxRetained`（默认 8 条 / 5% 预算），超限 → 拒绝新保留（显式错误，不静默丢）。
4. **取证**：`compaction/summary` 增加 `retainedSeqs`（可选字段），checkpoint 文件同步记录。

### 2.3 不做什么

- 不做"永不裁剪"开关（会撑爆上下文）；保留是**有限、可审计**的例外；
- 不改摘要 prompt 的语义（只加头部事实，不让模型"补写"省略内容）；
- 不把留痕写进 system prompt（避免常驻成本）。

---

## 3. 测试计划（实现后按此执行）

### 3.1 单元层（dsh，包内）

| 包 | 用例 | 负控（必须失败） |
|---|---|---|
| `guard/constraint-policy` | 钉住→一致→`constraint/verify`；变更经审批→`constraint/change`；无审批→抛错 | 删掉 `assertMutable` → 直改模式通过 |
| 同上 | 外部改值→checkpoint→`constraint/drift` + 硬失败 | 删掉 drift 比对 → 漂移不报 |
| `compaction-basic` | 3 条消息压缩 → 替代消息含 `[已压缩 seq a–b` 与 token 数；retained 消息仍在 | 删留痕头 → 断言缺字符串；删 retain 过滤 → retained 消失 |
| `compaction-tool-result-pruner` | 超阈值 → 标记含 `chars removed` 与数字 | 标记退回固定英文句 → 数字断言失败 |
| `compaction/invariant` | `shadowedSeqs` 与 `retainedSeqs` 交集非空 → 不变量失败 | 去掉断言 → 交集通过 |

### 3.2 集成层（dsh 会话）

1. **长会话溢出**：构造 > 上下文阈值的会话 → 触发 compaction → 检查
   `compaction/summary` 事件 + 替代消息 + checkpoint 文件三者一致（range/count/retained）；
2. **保留生效**：给一条关键证据打 `retain` → 压缩后该消息仍在 surface，且 `retainedSeqs` 记录；
3. **约束篡改**：会话中无审批切 `sandbox.mode` → 工具失败；有审批 → 成功且有
   `constraint/change`；外部改 settings → 交付点触发 `constraint/drift`（工具被拒 + 审查 T2）；
4. **恢复**：从日志恢复会话 → `constraint/pinned` 与现值一致才允许继续。

### 3.3 UnivEdge 侧（本仓）

- `bash dsh-adapter/run-tests.sh`：六套全绿；W1/W2 后预期 `reviewer-decision-gates 62/62`，
  L1 10,140/238（以实际基线为准）；
- **dogfooding**：跑一个真实任务（> 一次 compaction），检查：审查报告里能看到"已压缩 seq…"
  的痕迹、`reviewTier` 在漂移后是否升 T2、`run/review/INDEX.md` 是否记录。

### 3.4 验收口径（什么算"生效"）

- 单测绿 **不算**；必须同时满足：
  ① 集成场景可复现（有命令 + 输出存档）；
  ② 负控在**删除实现**时确实失败；
  ③ 事件流（`constraint/*` / `compaction/*`）可从日志重建；
  ④ 不破坏既有六套测试与 L1 基线。

---

## 4. 排期建议

| 阶段 | 内容 | 依赖 |
|---|---|---|
| D1 | `constraint-policy` 包 + `setSandboxMode` 挂钩（只做 sandbox.mode） | 审批服务（已有） |
| D2 | checkpoint 漂移复核 + 事件 | D1 |
| D3 | `frameSummary` 留痕头 + pruner 计数标记 | 无 |
| D4 | retain 选择器 + invariant | D3 |
| D5 | 集成测试 + dogfooding | D1–D4 |

**先做 D3/D4（W4）**：无审批依赖、可在 compaction 包内闭环，风险最低；
D1/D2（W3）涉及审批与写路径，建议单独 PR + 安全审查。
