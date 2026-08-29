# 运行时契约（Runtime Contract）· 草案 v0.1

> UnivEdge 对宿主环境的接口要求。宿主（WorkBuddy / 自建 CLI / 其他 agent 框架）应提供以下能力；
> 缺失项由 UnivEdge 薄运行时补齐，或降级（在任务契约中声明降级）。
> 状态：草案 —— 待 Step 4A vertical slice 验证后修订。

## R1 执行环境
- 多语言执行：Python / C++ / Fortran（至少 Python），返回 stdout/stderr/退出码；
- 远程执行（可选）：ssh + SLURM（sbatch/squeue/scancel），或允许 agent 直接调用。

## R2 权限门
- 副作用分级：
  - L0 只读：查文件、检索、推导预览 —— 可自动放行；
  - L1 本地写：写 run/ 产物、新建实验目录 —— 需用户批准（或按 config 策略）；
  - L2 高危：HPC 提交、网络访问、改删外部文件 —— 必须用户批准。

## R3 上下文管理
- 支持"压缩"（长会话摘要）与"重置"（以交接工件开始新回合）；
- 交接工件格式（UnivEdge 定义）：产物状态 + 上下文地图 + 任务契约。

## R4 会话与检查点
- 会话可持久化 / 恢复；
- run/ 快照可标记检查点、可回退（科研实验版本管理：分支探索）。

## R5 模型路由
- 按任务类型 / 难度配置模型（推理强 / 便宜快速），config/ 可配。

## R6 可观测性
- 结构化日志、token 用量、工具调用记录，agent 可读。

## R7 独立评估器实例化（可选，决定审查解耦等级）
- 宿主能实例化一个独立上下文的评估器：经文件通信读「审查输入包」→ 输出审查报告，
  其上下文不继承生成 agent 的推理链；
- 「审查输入包」的定义见 METHODOLOGY §5.1（核心：产物 + 锚点 + 审查清单 + 假设声明，不含推理链）；
- 加分项（可选）：能按角色（生成 vs 审查）路由不同模型，实现模型解耦；
- 降级：不支持 R7 的宿主，怀疑派审查降级为单 agent 角色扮演（L1 伪解耦），
  产物须显式标注解耦等级（见 METHODOLOGY §5.1 三级解耦）。
- **已实例化（dsh 宿主，2026-08-28）**：`dsh-adapter/univedge-reviewer.ts`——监听 `turn/end`
  自动 spawn 独立评估者子 agent（spawn provider，零父上下文），输出报告至 `run/review/`；
  实测逐条对照 VERIFICATION 检查项 + 独立代码路径重算（L2 上下文解耦，同模型不同档位）。

---

## 附录：宿主满足度评估

### WorkBuddy 环境（历史评估）

| 条目 | 满足度 | 说明 |
|---|---|---|
| R1 | 部分 | Python 沙箱 ✓；C++/远程 HPC 需配置执行环境 |
| R2 | ✓ | 工具执行需用户确认 |
| R3 | 部分 | 上下文由宿主管理，交接工件格式待实现 |
| R4 | ✓ | 会话持久化可用；检查点/分支待实现 |
| R5 | 部分 | 模型由宿主提供，路由策略待配置 |
| R6 | 部分 | 日志可用，结构化需适配 |
| R7 | 部分 | 子代理独立上下文 ✓；按角色路由不同模型 ✗（同模型不同档位）→ L2 上下文解耦 |

### dsh（DeepSeek Harness）环境（2026-08 实测）

| 条目 | 满足度 | 说明 |
|---|---|---|
| R1 | ✓ | bash 工具（沙箱可配，HPC 无沙箱后端时用 `DSH_PERMISSION_MODE=danger-full-access` 降级） |
| R2 | 部分 | 工具权限由 sandbox 策略控制；UnivEdge 的 L2 副作用门控由 `submit_hpc_job` 工具（CHECK 字段强制）承载 |
| R3 | ✓ | 原生上下文压缩（compaction-basic）；L1 注入带缺失自动恢复（pre-step） |
| R4 | ✓ | session 持久化（`~/.dsh/sessions/` JSONL.zstd） |
| R5 | ✓ | 模型路由（agentDefaultModel / provider 选择） |
| R6 | ✓ | session 事件日志可审计（工具调用/注入/推理全记录） |
| R7 | ✓ | 已实例化：`univedge-reviewer`（L2 上下文解耦，同模型不同档位） |
