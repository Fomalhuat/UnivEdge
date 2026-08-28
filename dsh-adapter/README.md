# dsh-adapter — UnivEdge × DeepSeek Harness 适配层

> 本目录是 UnivEdge 与 [dsh](https://github.com/deepseek-ai/deepseek-harness) 宿主的适配层（领域层不变，只加这一层适配）。
> 用途：让 dsh 宿主下的 agent **强制**加载 UnivEdge 的 L1 方法论层，解决"agent 高强度工作时忘记加载协议"的问题。
> 实测验证：2026-08-28（L1 注入后 agent 完整产出任务契约 + 启动自省 + 完整验证流程）。

## 组件

| 文件 | 作用 |
|---|---|
| `univedge-l1-inject.ts` | dsh 插件：监听 `agent/session-start`，读 UnivEdge L1 层（METHODOLOGY §0+§1 + review-lessons 基层），`agent.inject()` 注入 |
| `cordis.patch.yml` | 注册插件的 patch（用 `--patch` 加载；"新增 entry"须用 `insert:` 语法） |

## 机制（分层）

- **L0 入口地图**：dsh 原生自动加载 workspace 的 `AGENTS.md`（`agent-instructions` 包，每步前注入模型上下文）——这是 dsh 内置能力，不需要本适配层。
- **L1 方法论层（本适配层负责）**：`univedge-l1-inject` 在会话启动时注入 METHODOLOGY §0+§1（任务契约模板、启动自省、配置基线、锚点原则）+ review-lessons 基层（B1-B4+P 五根因）。
- **workspace 发现**：插件用 `agent.session.header.cwd`（session 的 workspace）向上找含 `METHODOLOGY.md` 的目录（最多 16 层）；找不到则不注入（不干扰其他 workspace）。

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

在 dsh 目录正常启动（`pnpm dsh web --no-open`，默认 3080，SSH 需端口转发），workspace 在 UI 里选（可任选 UnivEdge 目录）——无 headless 的 workspace 坑，也不需 `--tsconfig`（pnpm 正确处理依赖）。

## 验证记录（2026-08-28）

- **L0**：dsh 自动加载 UnivEdge AGENTS.md，真实模型识别"UnivEdge + 核心信条"（官方 e2e + UnivEdge 专属验证均 PASS）。
- **L1 导航**：agent 主动 read `knowledge/conventions.md`（任务所需的约定），结论正确。
- **L1 注入 + 完整方法论**：带 `--patch` 重跑，agent 产出完整任务契约（`run/y31-verify/contract.md`：启动自省 B1-B4+P 逐条、物理量定义、配置基线、副作用前核对清单）+ 四路线数值交叉验证 + 复核回写沉淀（benchmarks B8、review-lessons B2-4、conventions §1.1 补条目）。
- **对比**：无 L1 时 agent 算对但无契约/自省；有 L1 时完整执行方法论全流程。

## 后续待办

- 插件当前假设 UnivEdge 目录含 `METHODOLOGY.md` 与 `knowledge/review-lessons.md`；若结构变动需同步更新 `readL1()`。
- L1 注入的触发是"会话启动"；如需"每步前重新注入"（应对上下文截断/长会话），可改挂 `agent/pre-step`（参考 dsh 的 `agent-instructions` 包实现）。
