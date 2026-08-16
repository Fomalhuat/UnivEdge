# UnivEdge

物理科研领域内核（Physics Research Domain Kernel）—— 把物理研究方法论工程化为可执行规范的可移植内核；注入宿主运行时（WorkBuddy / 独立 agent 外壳）即构成科研助手（agent），见 docs/06。

## 定位

- **科研助手**：人类掌舵、agent 执行子任务、验证把关；不追求全自主科研循环。
- **通用物理**：符号推导 / 数值计算·复现 / 文献核对 / 验证审查 / 工具技能开发，五类任务均可承载（引力自力只是示例领域）。
- **可移植**：本仓库即领域内核本体——自包含、版本化、环境无关，可整体迁移到任意环境（不绑定目录、不绑定平台）。完整 agent = 本内核 + 宿主运行时。

## 核心信条

> 做一步检查一步，从正确的锚点出发。

任何产物必须锚定到独立可验证的参照（已知极限 / 守恒律 / 文献基准 / 已复核的上游结果）；未锚定的结果只能是 claimed。

## 使用说明

**获取**

```bash
git clone https://github.com/Fomalhuat/UnivEdge
```

**这是什么、不是什么**：UnivEdge 是**领域内核（domain kernel）**，不是独立运行的 agent——它把物理研究方法论工程化为可执行规范，需要注入宿主运行时（WorkBuddy / 独立 agent 外壳）才构成科研助手。完整 agent = 本内核 + 宿主运行时。

**快速上手**（执行 agent 的加载协议，渐进披露）：

1. **L0（常驻）**：读 `AGENTS.md`——执行 agent 的身份约定与入口；
2. **L1（每次会话）**：读 `METHODOLOGY.md` §0 + §1（方法论核心 + 加载协议）与 `knowledge/review-lessons.md` 基层（教训根因基 B1-B4）；
3. **L2（按任务路由）**：按任务契约读 `METHODOLOGY.md` §2-§6——任务分类 → 锚点对照表 → 验证检查项（`VERIFICATION.md`）；
4. **L3（按需检索）**：附录、教训例子层、`knowledge/`（约定注册表 / 基准库 / 主张注册表 / 文献库）。

**注入宿主**（两种外壳，见 `docs/06`）：

- **Phase 1 · skill 外壳**：把 `AGENTS.md` / `METHODOLOGY.md` / `VERIFICATION.md` / `knowledge/` / `skills/` 挂到宿主的 skill 机制下（当前路径）；
- **Phase 2 · agent 外壳**：借用 opencode / Reasonix 等运行时承载本内核（触发条件：交接工件受限 / 权限分级不够 / 独立部署 / 产品化）。

**规范与档案的边界**：运行与验证以 `METHODOLOGY.md`（v0.4）与 `VERIFICATION.md`（v0.3）为准；`docs/` 是设计档案与变更史，记录决策，不随内核同步更新。

**配套能力**：

- `skills/xact-assistant/`：xAct 符号引擎能力模块（瘦身知识版）；**完整版**（含 xAct 包源码、教程、示例）见 https://github.com/Fomalhuat/xact-assistant —— 独立可用，不绑定本内核。

**依赖**：内核本身无硬依赖；符号引擎按任务需（Wolfram Engine / xAct、SymPy 等，由宿主或 skill 提供）。

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
