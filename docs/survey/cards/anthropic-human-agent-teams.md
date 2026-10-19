# Building effective human-agent teams（Anthropic / Claude blog）

- **元数据**：Kristen Swanson（Anthropic Education）｜ **2026-06-24** ｜ 人机团队协作实践 ｜ 一手（官方）
  ｜ 获取 2026-10-16 ｜ 快照 `run/survey/sources/b2-human-agent-teams.txt`（sha256 前 16 位 `2b078ba5b0f2784d`）
  ｜ URL: https://claude.com/blog/building-effective-human-agent-teams

## ① 任务分解与角色架构

四条经验（Lesson 1-4）。与 UnivEdge 相关度最高的为 Lesson 2/4：

- **Lesson 2 角色与工具**：人机共享 roster / artifacts / workspace；agents 有**各自凭据、技能、工具**；
  项目启动时先谈"谁干什么"；**角色写进 skill file**（便于批量复制同类 agent）；复杂化时**增设专职 agent**
  （例：release manager）；
- **Lesson 4 随时间建立信任（本卡核心）**：
  1. 初期**人工逐件复审** → 同时设计"任务验证清单"；
  2. 让 agent 用 **"verifier" agent** 自查（Doer-Verifier harness）；
  3. 把反思写进循环（review their own misses）；
  4. **"Tracking which kinds of tasks each agent has earned autonomy on and expanding scope per task type
     after repeated successes"**——按任务类型记录"已挣得的自主权"，成功后**逐类扩大范围**。

## ② 验证/审查机制

- **"the best long-running agents have many different ways to verify their work before a human looks at it"**
  （人看之前先自验；文档类也可用 rubric/style guide 验）；
- **Doer-Verifier** 角色对；
- 每周要求 agent 汇编 **"lessons & missteps"** 报告（错误留档 → 避免复发）；
- 人类注意力＝**稀缺资源**：把问题**批量成一次问**、重复关键上下文让人类快速进入、限制人类同时看的条目数；
  有团队设"专门负责筛选/升报"的 agent；有人设"每日工作量上限"保证人类有意义地参与。

## ③ 上下文/记忆策略

Lesson 1：**"work in public"**——agent 只能"理解被写下来的东西"（"if it's not written down and
accessible, it doesn't exist"）；用少量**清晰的边界**（workspace 级）替代逐条分享的模糊边界；
文档与会议记录要**写成 agent 可检索的形式**（agents 已是团队文档的主要消费者）。

## ④ 人工介入点

本卡即"人机分工"主题本身：人类定 north star、把"有硬取舍的决定"留在人回路
（"decisions with hard tradeoffs always had a human in the loop"）；agent 负责把决定**上报**给人类。

## ⑤ 成本/规模实测

"Engineers have successfully dispatched agents on their team to handle **500 bug fixes independently**"（终态，
非起点）；无 token 成本。

## ⑥ 失败模式与自述局限

- 反例：角色不清 → "people end up running fleets of personal AIs on the side, duplicating work and
  fracturing the team's context"；
- 隐私对话需单独通道（DM/私有应用）；
- 自述："None of these patterns are new—at least not for humans"（是管理常识在 agent 上的复用）。

## ⑦ 与 UnivEdge 对照（本卡高价值：与 work-types 毕业机制同构）

| 判定 | 内容 |
|---|---|
| **已有同构（强，且是外部佐证）** | **① "按任务类型挣得自主权、逐类扩大"＝ work-types.md 的 capability→regression 毕业机制**（我们按"审查次数 + 零实质发现"毕业；他们按"重复成功"扩权）——**独立来源印证了该设计方向**；**② Doer-Verifier ↔ 怀疑派评估器**；**③ lessons & missteps 周报 ↔ 教训库 + 每日日志**；**④ "决定有硬取舍时人必须在回路" ↔ §1.3 检查→中断→批准链** |
| **已有但更弱** | **① "先自验再给人看"的完备度**：我们有 T0 自检（锚点链）——但他们的表述更宽（"many different ways to verify"，含 rubric/文档类）→ 对照检查我们各任务类的**自验手段是否齐备**（可能归入已有条款的执行核查）；**② "人类注意力稀缺"**：我们的权限门/审批尚无"**批量升报**"要求（把多个待批事项合成一次请求、给足背景）——现实中 han 常需多次打断 → 候选 P11（低风险、体验向） |
| **缺失（可吸收）** | **① "逐类扩权"的记录载体我们已有**（work-types §2），但其"**每次成功 → 扩大范围**"是**渐进的**（我们是一次性 20 次零发现毕业）——两种粒度对照，**记观察**（不改阈值，因我们的"实质发现"口径更严）；**② 模型换代后重测任务**（"It's also important to retest tasks as models change and improve. Prompts may need re-wording and guardrails that used to be helpful may constrain a smarter model"）↔ R5 同向，**再添一个独立来源** |
| **冲突** | 无 |

## ⑧ 可移植性判定

**内核**（P11 批量升报原则 + "人注意力稀缺"作为门控设计约束）；**佐证**（work-types 毕业机制、教训库、
权限门——均为独立来源背书）。

## ⑨ 直引

1. "Tracking which kinds of tasks each agent has earned autonomy on and expanding scope per task type after
   repeated successes."
2. "we've found that the best long-running agents have many different ways to verify their work before a human
   looks at it."
3. "it often helps to give one agent the job of doing the task and another agent the job of checking the first
   agent's work. This is often called the 'Doer-Verifier' agent harness."
4. "every week... asked the agents to compile a weekly report that included 'lessons & missteps' so the agents
   would keep track of mistakes and avoid making them again in the future."
5. "treat human attention as the scarce resource it is: to batch questions to be answered in a single pass,
   repeat key context to get a human up to speed quickly, and limit how many things each human sees at once."
6. "as models change and improve... guardrails that used to be helpful may constrain a smarter model from
   pursuing more creative solutions."

## ⑩ 探针草案（候选 P11）

- 机制：审批事项批量升报（一次请求携带全部待批项 + 背景）；
- 探针：构造"存在 3 个待批事项"的会话 → 断言宿主将其合为一次请求呈现（或提供批处理视图）；
  负控：单个待批事项时保持即时呈现。破坏式：移除批量规则 → 探针失败。
