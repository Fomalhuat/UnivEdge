# UnivEdge

物理科研领域内核（Physics Research Domain Kernel）—— 把物理研究方法论工程化为可执行规范的可移植内核；注入宿主运行时（WorkBuddy / dsh（DeepSeek Harness）/ 独立 agent 外壳）即构成科研助手（agent），见 docs/06。

## 定位

- **科研助手**：人类掌舵、agent 执行子任务、验证把关；不追求全自主科研循环。
- **通用物理**：符号推导 / 数值计算·复现 / 文献核对 / 验证审查 / 工具技能开发，五类任务均可承载（引力自力只是示例领域）。
- **可移植**：本仓库即领域内核本体——自包含、版本化、环境无关，可整体迁移到任意环境（不绑定目录、不绑定平台）。完整 agent = 本内核 + 宿主运行时。

## 核心信条

> 做一步检查一步，从正确的锚点出发。

任何产物必须锚定到独立可验证的参照（已知极限 / 守恒律 / 文献基准 / 已复核的上游结果）；未锚定的结果只能是 claimed。

## 使用说明

**获取与放置**：clone 到宿主 agent 可见的目录（如 WorkBuddy 的项目目录、Claude Code 的 skills 目录等）：

```bash
git clone https://github.com/Fomalhuat/UnivEdge <宿主目录>/UnivEdge
```

**让 agent 调用**：向 agent 说一句「项目根目录有 `AGENTS.md`，先读它」即可。后续的加载顺序、任务契约与验证规范由 `AGENTS.md` 按渐进披露协议引导，无需使用者干预。

## 与 dsh（DeepSeek Harness）宿主结合（可选）

[dsh](https://github.com/deepseek-ai/deepseek-harness) 是 DeepSeek 开源的 agent 运行时（"Model + Harness = Agent"）。UnivEdge 作为领域内核，可通过 `dsh-adapter/` 适配层注入 dsh，由 harness **强制**加载协议入口——解决"agent 高强度工作时忘记加载协议"的问题（实测验证，2026-08-28）。

**机制（分层）**：

- dsh 原生自动加载 workspace 的 `AGENTS.md`（L0 入口地图，每步前注入模型上下文）；
- `dsh-adapter/univedge-l1-inject.ts` 插件在会话启动时额外注入 **L1 层**（METHODOLOGY §0+§1 + review-lessons 基层）——把方法论从"靠 agent 自觉"变成"harness 强制"；实测 agent 会据此产出完整任务契约（启动自省 B1-B4+P 逐条、物理量定义、配置基线、验证标准）并完整执行验证流程；
- 插件从 workspace（session cwd）向上发现 UnivEdge 根（含 METHODOLOGY.md 的目录），找不到就不注入（不干扰其他 workspace）。

**用法**（在 UnivEdge 目录下启动 dsh headless）：

```bash
cd <UnivEdge 目录>
source ~/.nvm/nvm.sh
export DEEPSEEK_API_KEY='sk-xxx'
export DSH_PERMISSION_MODE='danger-full-access'   # 见下方沙箱说明
<dsh路径>/node_modules/.bin/tsx \
  --tsconfig <dsh路径>/tsconfig.json \
  <dsh路径>/apps/cli/src/bin.ts \
  --profile headless \
  --patch <UnivEdge>/dsh-adapter/cordis.patch.yml \
  "任务"
```

> **沙箱说明**：dsh 的 bash 工具默认要求沙箱后端（bubblewrap/Landlock）。HPC 共享服务器常禁止 user namespace（bwrap 不可用、Landlock 需编译 native），此时设 `DSH_PERMISSION_MODE='danger-full-access'` 可让 bash 直接执行（**放弃沙箱隔离**，测试用可接受，生产慎用）。有可用沙箱后端时可不设此变量。

> **Workspace 说明**：dsh headless 的 workspace = 启动目录（`process.cwd()` 硬编码）；要让 workspace 指向 UnivEdge，须在 UnivEdge 目录下启动，并加 `--tsconfig` 指向 dsh 的 tsconfig（否则 cordis 解析错误）。Web 模式则无此问题（workspace 在 UI 里选）。

## 状态

- **内核已成型**。运行规范：`METHODOLOGY.md`（方法论规格 v0.4）与 `VERIFICATION.md`（验证协议 v0.3）——以这两个文件为准；`docs/` 为设计档案与变更史（记录设计决策与历次修订，不随内核同步更新）。
- 文档见 `docs/`：01 文献调研 → 02 需求细化与蓝图修订 → 03 设计决策与架构约束 → 04 通用 Agent 调研与结构审查 → 07 内核复盘与改进方向（含 08-14 后续修订）。
- 目录骨架已建：`knowledge/`（约定注册表 + 复核教训库）`skills/` `tools/` `config/`；`run/` 为宿主提供的产物存储（可插拔，Step 4B/4C 产物所在）。

## 路线

1. ✅ Step 2：方法论规格 METHODOLOGY.md（按任务分类法，含锚点原则与验证要求）
2. ✅ Step 3：验证协议（推导检查项 + 数值/复现检查项模板）
3. ✅ Step 4A：推导线 vertical slice
4. ✅ Step 4B：数值复现线 vertical slice
5. ✅ Step 4C / P0-P1：复合验证 + knowledge/ + 完整奇异场验收
6. ✅ Step 5：评测集第一轮基线（5 用例五类全覆盖，5/5 PASS；benchmarks.md 基准库建立）

每步产出经用户复核后才进入下一步。
