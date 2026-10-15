# 测试落盘：reviewer-decision-gates

- 日期：2026-10-15
- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-decision-gates.ts`
- 场景：审查四项裁决实现（漂移即失效 / 同目标复用 + --force-review / auto 最小间隔常量 / 报告全文落盘）
- 依据：`run/review/handoff-reviewer-overreview.md` §六 待裁决 1/2/4（裁决 3 为触发路径参数，见源码 `AUTO_MIN_GAP_MIN` 注释）

| 用例 | 期望 | 实际 | 依据 | 结果 |
|---|---|---|---|---|
| --force-review 识别（行首独立指令） | true | true | 裁决2/S0-fix | ✅ |
| --force-review 行内引述不识别（判别夹具） | false | false | S0-fix | ✅ |
| review: force 识别 | true | true | 裁决2 | ✅ |
| quiet 字面量不误判为 force | false | false | 裁决2 | ✅ |
| 普通讨论文本不触发 | false | false | 裁决2 | ✅ |
| 同清单 + 同指纹 → 复用 | true | true | 裁决2 | ✅ |
| 清单顺序无关（内部排序比较） | true | true | 裁决2 | ✅ |
| 任一产物指纹变化 → 不复用（宁审勿漏） | false | false | 裁决2 | ✅ |
| 清单不同 → 不复用 | false | false | 裁决2 | ✅ |
| 无上轮记录 → 不复用 | false | false | 裁决2 | ✅ |
| 清单为空 → 不复用 | false | false | 裁决2 | ✅ |
| 产物不存在（读取失败）→ 不复用 | false | false | 裁决2 | ✅ |
| transcriptOf：多消息按 seq 顺序拼接 | 第一段

---

第二段 | 第一段

---

第二段 | 裁决4 | ✅ |
| transcriptOf：无可提取文本 → 空串 |  |  | 裁决4 | ✅ |
| 漂移：报告头标"已失效" | true | true | 裁决1 | ✅ |
| 漂移：报告头声明为机制判定 | true | true | 裁决1 | ✅ |
| 漂移：报告头状态行标注 | true | true | 裁决1 | ✅ |
| 漂移：索引结论带失效后缀 | true | true | 裁决1 | ✅ |
| 全文落盘：transcript.md 存在 | true | true | 裁决4 | ✅ |
| 全文落盘：内容正确 | true | true | 裁决4 | ✅ |
| 无漂移：报告头不标失效 | false | false | 裁决1 | ✅ |
| 无漂移：索引结论不带失效后缀 | false | false | 裁决1 | ✅ |
| transcript 缺省 → 不落盘（可选参数） | false | false | 裁决4 | ✅ |
| 复用记录：通道列标 declared-reuse | true | true | 裁决2 | ✅ |
| 复用记录：结论标注复用来源 | true | true | 裁决2 | ✅ |
| 复用记录：报告路径指向上轮 | true | true | 裁决2 | ✅ |
| quiet：行首独立指令（用户消息）命中 | true | true | S0-fix | ✅ |
| quiet：行内引述不命中（旧实现会误命中 → 会响） | false | false | S0-fix | ✅ |
| quiet：行内代码块中的字面量不命中 | false | false | S0-fix | ✅ |
| quiet：列表项形式的行首指令命中 | true | true | S0-fix | ✅ |
| quiet：引用符后的行首指令命中 | true | true | S0-fix | ✅ |
| quiet 判定：assistant 文本即使行首出现指令也**不生效**（仅用户消息可静默） | false | false | S0-fix | ✅ |
| quiet 判定：用户消息行首指令生效 | true | true | S0-fix | ✅ |
| quiet 判定：子代理回执（注入/报告）不生效 | false | false | S0-fix | ✅ |
| force：同上，assistant 的行首指令不生效 | false | false | S0-fix | ✅ |
| force：用户消息行首指令生效 | true | true | S0-fix | ✅ |
| 生产形状：hasDeliverable 认得 arguments 里的产物路径（旧实现为 false） | true | true | S0-1 | ✅ |
| 生产形状：artifactPathsOfTurn 取出该路径（旧实现为 []） | /tmp/tc-bIN93J/run/task-a/artifact.md | /tmp/tc-bIN93J/run/task-a/artifact.md | S0-1 | ✅ |
| 向后兼容：旧夹具形状（参数摊在 data 上）仍可解析 | /tmp/tc-bIN93J/run/task-a/artifact.md | /tmp/tc-bIN93J/run/task-a/artifact.md | S0-1 | ✅ |
| 生产形状：去重门的前置（路径集合）不再为空 | true | true | S0-1 | ✅ |
| 收窄：写内核文档 docs/*.md → **不**触发（判别夹具） | false | false | narrow | ✅ |
| 收窄：写任务产出 run/<任务>/*.md → 触发 | true | true | narrow | ✅ |
| 收窄：写基础设施 run/kernel-amendment/*.md → 不触发 | false | false | narrow | ✅ |
| 收窄：审查自输出 run/review/*.md → 不触发 | false | false | narrow | ✅ |
| 收窄：isTaskOutput 判定与豁免清单一致 | true,false,false,true | true,false,false,true | narrow | ✅ |
| 收窄：总开关打开后，装置改动恢复自动触发（逃生门） | true | true | narrow | ✅ |
| 生产回放：夹具覆盖全部四类路径 | true | true | S0-5 | ✅ |
| 生产回放：apparatus（应不触发） | false | false | S0-5 | ✅ |
| 生产回放：self-output（应不触发） | false | false | S0-5 | ✅ |
| 生产回放：task-output（应触发） | true | true | S0-5 | ✅ |
| 生产回放：infra（应不触发） | false | false | S0-5 | ✅ |

**51/51 通过, 0 失败**
