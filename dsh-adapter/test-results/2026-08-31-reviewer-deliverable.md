# reviewer 逻辑单元测试结果（shared 模块）

- 日期：2026-08-31
- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`
- 覆盖：触发判据（A/B 层）+ 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + 共享模块单一事实来源（S1-2）

| 用例 | 期望 | 实测 | 关联 |
|---|---|---|---|
| write run/foo.json（非 .md run/ 产物） | true | true | L0-1 | ✅ |
| write run/foo.md | true | true | 基础 | ✅ |
| write 任意 .md（非 run/） | true | true | 设计 | ✅ |
| 写审计自输出：run/review/<主>/<评估者>/review.md | false | false | 自输出 | ✅ |
| 单层旧格式槽：run/review/<主>/review.md（完善项 1） | false | false | 完善项1 | ✅ |
| 写空报告记录：run/review/<主>/empty/ | false | false | 自输出 | ✅ |
| 写 selfcheck 输入包：run/review-selfcheck/input.md | false | false | S1-5 | ✅ |
| 写 handoff：run/review/handoff-bc.md（重新进入审查面） | true | true | S1-1 | ✅ |
| run/review-test2/ 产物前缀不误伤 | true | true | 边界 | ✅ |
| 未来式规划句 | false | false | L1-2 | ✅ |
| 完成态：已写入 run/review-test2/conclusion.md | true | true | 完成态 | ✅ |
| 抽象词结论 | false | false | 抽象词 | ✅ |
| 纯审计表述：已写入 run/review/x/y/review.md | false | false | 自输出 | ✅ |
| 混合：交付物+自输出同段（S1-4 不连坐） | true | true | S1-4 | ✅ |
| 分目录写盘：<主8>/<评估者8>/ | /home/u/UnivEdge/run/review/9e496951/9546ca98 | /home/u/UnivEdge/run/review/9e496951/9546ca98 | 缺陷3 | ✅ |
| 短 ID 已带 session- 前缀也正确 | /home/u/UnivEdge/run/review/9e496951/9546ca98 | /home/u/UnivEdge/run/review/9e496951/9546ca98 | 缺陷3 | ✅ |
| 空报告记录目录：<主8>/empty/ | /home/u/UnivEdge/run/review/9e496951/empty | /home/u/UnivEdge/run/review/9e496951/empty | 缺陷2 | ✅ |
| 摘要桩场景：仅收尾句 → 提取到完整报告（下一条更长） | ## 结论：需修订
S0 问题清单……
解耦声明：独立上下文 | ## 结论：需修订
S0 问题清单……
解耦声明：独立上下文 | S2-2 | ✅ |
| 长分析不顶掉报告（无报告标志的分析被过滤） | ## 结论：通过
逐条检查……
解耦声明：L2 | ## 结论：通过
逐条检查……
解耦声明：L2 | S2-2 | ✅ |
| 长分析含高频词"通过"不顶掉报告（完善项 3b：专有锚过滤） | ## 结论：需修订
问题清单：……
解耦声明：独立上下文 | ## 结论：需修订
问题清单：……
解耦声明：独立上下文 | 完善项3b | ✅ |
| 空事件 → 空报告 |  |  | 缺陷2路径 | ✅ |
| 纯中间思考（无报告标志）→ 空 |  |  | 缺陷2路径 | ✅ |
| 非审查路径不排除 | false | false | 精确性 | ✅ |
| r7- 存档不排除（可被审） | false | false | S1-1 | ✅ |

**24/24 通过, 0 失败**
