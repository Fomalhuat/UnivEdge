# dsh-adapter — UnivEdge × DeepSeek Harness 适配层

> 本目录是 UnivEdge 与 [dsh](https://github.com/deepseek-ai/deepseek-harness) 宿主的适配层（领域层不变，只加这一层适配）。
> 用途：让 dsh 宿主下的 agent **强制**加载 UnivEdge 的 L1 方法论层，解决"agent 高强度工作时忘记加载协议"的问题。
> 实测验证：2026-08-28（L1 注入后 agent 完整产出任务契约 + 启动自省 + 完整验证流程）。

## 组件

| 文件 | 作用 |
|---|---|
| `univedge-l1-inject.ts` | dsh 插件：L1 双时机注入——`session-start` 全量（METHODOLOGY §0+§1 + 基层）+ `pre-step` 缺失时自动补精简版（长会话/compaction 保障） |
| `univedge-hpc-gate.ts` | dsh 插件：注册 `submit_hpc_job` 工具——提交作业前强制 CHECK 字段校验（schema 层 `required` + execute 层非空校验双层门控） |
| `univedge-reviewer.ts` | dsh 插件：任务完成后自动 spawn **独立评估者子 agent**（R7，怀疑派）审查产物，报告写入 `run/review/<主会话>/review.md` |
| `analyze_session.py` | 协议遵守率统计脚本：解析 session.jsonl.zstd，输出 7 项指标（L0/L1/L2/工具代算/锚点） |
| `cordis.patch.yml` | 注册以上插件的 patch（用 `--patch` 加载；"新增 entry"须用 `insert:` 语法） |
| `test-runner.ts` + `test.patch.yml` | 测试专用：headless 主任务后不退出，轮询审查报告生成再退出（验证 reviewer 用） |

## 机制（分层）

- **L0 入口地图**：dsh 原生自动加载 workspace 的 `AGENTS.md`（`agent-instructions` 包，每步前注入模型上下文）——这是 dsh 内置能力，不需要本适配层。
- **L1 方法论层（本适配层负责）**：`univedge-l1-inject` 注入 METHODOLOGY §0+§1（任务契约模板、启动自省、配置基线、锚点原则）+ review-lessons 基层（B1-B4+P 五根因）。
- **双时机注入（长会话保障）**：
  - `agent/session-start`：注入**全量 L1**（首步完整方法论）；
  - `agent/pre-step`：每步前检查 L1 是否仍在模型可见上下文（session surface）——被 dsh 自动 compaction（token 压力/上下文溢出）影子化后**自动重新注入精简版**（基层 + 契约要点 + 产物格式，~25 行）。与 `agent-instructions`（AGENTS.md 每步注入）同模式；仅缺失时注入，避免每步重复的 token 成本。
  - 实测（7 步任务）：全量 1 次 + 精简版 1 次（step 2 处 surface 时序竞争窗口补位，无害），step 3+ 去重生效零注入。
- **workspace 发现**：插件用 `agent.session.header.cwd`（session 的 workspace）向上找含 `METHODOLOGY.md` 的目录（最多 16 层）；找不到则不注入（不干扰其他 workspace）。

## 用法（headless，AI/脚本）

**安装（一次性）**：patch 里插件的 `name` 是相对 dsh profile 目录的路径（可移植、无硬编码绝对路径），首次使用需把本目录符号链接到 dsh 的 profile 目录（`headless` 与 `web` 各建一次）：

```bash
ln -sfn <UnivEdge>/dsh-adapter ~/.dsh/profiles/headless/dsh-adapter
ln -sfn <UnivEdge>/dsh-adapter ~/.dsh/profiles/web/dsh-adapter     # Web 模式用
```

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

在 dsh 目录正常启动（`pnpm dsh web --no-open`，默认 3080，SSH 需端口转发），workspace 在 UI 里选（可任选 UnivEdge 目录）——无 headless 的 workspace 坑，也不需 `--tsconfig`（pnpm 正确处理依赖）。

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
| 长会话 | L1 全程在场（26 步）；compaction 恢复路径 | ✅ / 待真实任务 |

**结论**：dsh + UnivEdge 组合的完整验证链路闭环——"方法论的强制执行"从入口（L0）到纪律（L2）到能力（L3）到真实对比（L4）全部成立。真实使用中持续观察 compaction 恢复路径即可。

## 后续待办

- 插件当前假设 UnivEdge 目录含 `METHODOLOGY.md` 与 `knowledge/review-lessons.md`；若结构变动需同步更新 `readL1()` / `readL1Brief()`。
- `univedge-reviewer` 的触发是 `turn/end`（headless 一次性进程会因进程退出而中断审查，Web 持续模式无此问题；`test-runner.ts` 专用于 headless 下验证完整链路）。
- `submit_hpc_job` 待补：非法值测试 / 锚点完整性（ref 非空≠有参照）/ 正常提交冒烟。
- pre-step 注入的长会话恢复路径（L1 被 compaction 影子化后自动补精简版）尚未在真实长会话中观测触发——逻辑已验证（surface 投影检查），建议未来长任务中留意。
