# Scaling Managed Agents: Decoupling the brain from the hands（Anthropic Engineering）

- **元数据**：Anthropic（Lance Martin 等）｜ 2026（页面未标具体日期，含 Opus 4.5 之后的内容）｜ 长任务托管服务
  ｜ 一手（官方）｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-managed-agents.txt`
  （sha256 前 16 位 `3307de45eb754901`）｜ URL: https://www.anthropic.com/engineering/managed-agents

## ① 任务分解与角色架构（本卡核心：接口虚拟化）

把 agent 的组件**虚拟化并解耦为三个接口**：

| 接口 | 定义 | 稳定性 |
|---|---|---|
| **session** | "the append-only log of everything that happened"（事件日志，持久、可检索） | 组件之一 |
| **harness** | "the loop that calls Claude and routes Claude's tool calls" | 可整体替换（无状态） |
| **sandbox** | 执行环境（跑代码/改文件）；以工具形式调用 `execute(name, input) → string` | 可整体替换 |

设计信条：**"We're opinionated about the shape of these interfaces, not about what runs behind them."**
（对接口形状有主见，对背后实现无主见。）类比操作系统："The abstractions outlasted the hardware."

## ② 验证/审查机制

非主体；但给出**审查对象可恢复性**的先决条件——session 可回读（见③）使得"任何一次行动/决定"可被
事后检索与审计。

## ③ 上下文/记忆策略（第二条主线）

- 定位：**"The session is not Claude's context window."**——上下文窗口之外有**持久事件日志**；
- 对压缩/裁剪的批判："**irreversible decisions** to selectively retain or discard context can lead to
  failures. It is difficult to know which tokens the future turns will need."；
- 解法：session 作为**可检索的上下文对象**——`getEvents()` 支持**位置切片**（从上次停止处续读、
  回退几个事件看前情、动作前重读）；**取出的切片再在 harness 里做任意变换**（含上下文组织以提升
  prompt cache 命中）；
- 分离关注点：**存储可恢复性归 session；任意的上下文管理归 harness**——"we can't predict what specific
  context engineering will be required in future models"。

## ④ 人工介入点

宿主服务层（客户接入其 VPC）——本卡与内核的人机分工无直接关系。

## ⑤ 成本/规模实测

解耦后 **p50 TTFT 降低约 60%、p95 降低超 90%**（容器按需供给，不再每个 session 预付容器启动成本）；
harness/sandbox 成为"cattle"（可失败可重启，`wake(sessionId)` 恢复）。

## ⑥ 失败模式与自述局限

- 反面案例（耦合单容器）：① 容器是"pet"——容器挂 = session 丢，得"护理"容器；② 故障定位不可分
  （harness bug / 网络丢包 / 容器下线看起来一样）；③ **凭据与生成代码同容器**——prompt injection 只需
  说服 Claude 读自己的环境即可拿 token，"narrow scoping" 缓解仍编码了对模型能力的假设；
  结构化修复 = **token 永不被沙箱内代码触及**（git token 在初始化时注入；MCP OAuth 走 vault + proxy，
  harness 全程不知道凭据）；
- 自述演进逻辑：**harness 假设会过期**（context anxiety 案例：Sonnet 4.5 需要的 context reset，
  到 Opus 4.5 成为 dead weight）——所以要建"能容纳未来 harness"的接口。

## ⑦ 与 UnivEdge 对照（本卡高价值）

| 判定 | 内容 |
|---|---|
| **已有同构（强）** | **UnivEdge 的 layers 划分 ≈ "brain/hands/session" 解耦**：docs/05 运行时契约（R1-R6 接口清单：上下文管理/会话检查点/沙箱/权限门/模型路由/日志）＝ "对接口形状有主见"；docs/06"领域层注入宿主、外壳=适配层" ＝ "implementations can be swapped"；L1 座位（system prompt section 每次组装重读源）＝"transformations in harness, storage outside" |
| **已有但更弱** | **① 上下文"切片重读"**：我们读 L3 文档是"选文件"，尚无"按位置切事件流/回退重读"的概念（当前靠文件与路径组织，够了；记观察）；**② 凭据隔离**：权限门 L0-L2 管"动作批准"，但对"**凭据/密钥永不被 agent 生成代码触及**"没有内核级表述（dsh 侧当前实践待查）→ 候选 P9（若 dsh 未做，则属宿主实现缺口；内核侧补一条原则） |
| **缺失（可吸收）** | **"harness 假设会过期 → 接口要能容纳未来实现"** 的**设计判据**：与 R5（模型升级重估承重）互补——R5 管"删旧的"，本卡补"**新的要能插进来**"（接口稳定性）。→ 候选 P10（方法：审查内核条款的"宿主任意性"——条款是否编码了某个具体实现假设？） |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核**（P9 原则、P10 接口稳定性判据）；**宿主**（session/`getEvents`/vault/proxy 具体实现——dsh 参考）；
**文档**（docs/05 运行时契约可引本卡为外部依据）。

## ⑨ 直引

1. "harnesses encode assumptions about what Claude can't do on its own. However, those assumptions need to
   be frequently questioned because they can go stale as models improve."
2. "We're opinionated about the shape of these interfaces, not about what runs behind them."
3. "The session is not Claude's context window."
4. "irreversible decisions to selectively retain or discard context can lead to failures. It is difficult to
   know which tokens the future turns will need."
5. "we separated the concerns of recoverable context storage in the session and arbitrary context management
   in the harness because we can't predict what specific context engineering will be required in future models."
6. "our p50 TTFT dropped roughly 60% and p95 dropped over 90%."
7. "The structural fix was to make sure the tokens are never reachable from the sandbox where Claude's
   generated code runs."

## ⑩ 探针草案（候选 P9/P10）

- P9（凭据隔离）：检查"agent 生成代码所在沙箱能否读到凭据"——探针：在沙箱内断言凭据不可见/不可用
  （负控：合法工具调用仍可用）；破坏式：临时把 token 注入沙箱 → 探针须报警。
- P10（接口稳定性判据）：审查内核条款集，逐条问"这条是否绑定了某个具体宿主实现？"——先做一次
  静态盘点作为探针基线的**候选方法**（非自动探针，属审查清单项）。
