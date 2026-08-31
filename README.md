# UnivEdge

物理科研领域内核（Physics Research Domain Kernel）—— 把物理研究方法论工程化为可执行规范的可移植内核；注入宿主运行时（WorkBuddy / dsh（DeepSeek Harness）/ 独立 agent 外壳）即构成科研助手（agent），见 docs/06。

**当前以 dsh（DeepSeek Harness）为主要特化宿主**：`dsh-adapter/` 适配层针对 dsh 提供了 L1 方法论强制注入（含长会话保障）、HPC 提交门控、独立审查评估者（R7）等组件，使内核在 dsh 下完整发挥（详见[与 dsh 结合](#与-dshdeepseek-harness-宿主结合推荐)一节）；其他宿主可复用内核 + 参考 `dsh-adapter/` 自行实现等价注入。

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

**与 agent 结合（重要）**：UnivEdge 的完整发挥需要**两层加载**——L0 入口地图（`AGENTS.md`）与 **L1 方法论层**（METHODOLOGY §0+§1 + review-lessons 基层）：

- **只加载 L0**：agent 能正确完成单个任务（自主导航、工具代算、独立验证），但**不会主动产出任务契约 / 启动自省 / 配置基线**（实测：仅 L0 时方法论不完整执行，契约/自省不触发）。
- **完整效果（L0 + L1）**：agent 产出完整任务契约（启动自省 B1-B4+P 逐条、物理量定义、配置基线、验证标准）并完整执行验证流程（实测，2026-08-28）。

按宿主分：
- **dsh（DeepSeek Harness）——推荐**：`dsh-adapter/` 插件**双时机强制注入 L1 层**（会话启动全量 + 每步前缺失自动补精简版，应对长会话压缩），见下节。
- **其他宿主**（WorkBuddy / Claude Code 等）：目前仅 L0（`AGENTS.md`），L1 靠 agent 自觉读 METHODOLOGY（效果打折）；如需完整效果，需实现等价的 L1 注入（可参考 `dsh-adapter/` 实现）。

## 与 dsh（DeepSeek Harness）宿主结合（推荐）

[dsh](https://github.com/deepseek-ai/deepseek-harness) 是 DeepSeek 开源的 agent 运行时（"Model + Harness = Agent"）。UnivEdge 通过 `dsh-adapter/` 适配层与 dsh 结合：harness 自动加载 `AGENTS.md`（L0），插件**双时机强制注入 L1 方法论层**（会话启动全量 + 每步前缺失自动补精简版，长会话/上下文压缩下仍保持方法论在场）——实测 agent 会据此产出完整任务契约（启动自省 B1-B4+P 逐条、物理量定义、配置基线）并完整执行验证流程，解决"agent 高强度工作时忘记加载协议"的问题。适配层还提供：`submit_hpc_job` 提交门控（L3-1）、独立审查评估者子 agent（R7，L3-2）、协议遵守率度量脚本（L3-3）。

**人类使用（Web 模式）**——必须先做一次性安装（符号链接，见 [`dsh-adapter/README.md`](dsh-adapter/README.md)「安装」一节），启动时**必须带 `--patch`**（否则只加载 AGENTS.md 的 L0，无 L1 注入）：

```bash
cd <dsh 目录>                                  # 如 /data/home/hanwu/deepseek-harness
source ~/.nvm/nvm.sh
export DEEPSEEK_API_KEY='sk-xxx'
pnpm dsh web --patch <UnivEdge>/dsh-adapter/cordis.patch.yml --no-open
# 注意：--patch 必须放在 --no-open 之前（dsh 参数透传机制）
# SSH 端口转发：ssh -L 3080:127.0.0.1:3080 <user>@<host>，浏览器开 http://127.0.0.1:3080
# 进入后：Settings→Models 配 key → Choose workspace 选 <UnivEdge 目录> → 开会话
```

Web 模式 workspace 在 UI 里选（可任选目录，含 UnivEdge），无 headless 的 workspace 坑。

**AI/脚本使用（headless 模式）**：完整命令、参数与沙箱说明（`--patch` / `--tsconfig` / `DSH_PERMISSION_MODE`）见 [`dsh-adapter/README.md`](dsh-adapter/README.md)。首次使用需把 `dsh-adapter/` 符号链接到 dsh 的 profile 目录（一次性安装，见该文档「安装」一节）。

## 状态

- **内核已成型**。运行规范：`METHODOLOGY.md`（方法论规格 v0.9）与 `VERIFICATION.md`（验证协议 v0.6）——以这两个文件为准；`docs/` 为设计档案与变更史（记录设计决策与历次修订，不随内核同步更新）。
- **与 dsh 结合的测试阶梯 L0-L4 全部验证通过（2026-08-29）**：入口加载 → 渐进披露导航 → 契约/自省 → 门控/评估者/度量 → 真实任务双宿主对比（数值等价、方法论纪律决定性差异）。详见 `dsh-adapter/README.md` 验证记录。
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
