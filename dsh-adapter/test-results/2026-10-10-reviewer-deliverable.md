# reviewer 逻辑单元测试结果（shared 模块）

- 日期：2026-10-15
- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`
- 覆盖：触发判据（A/B 层）+ 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + INDEX 创建/追加/并发 + 共享模块单一事实来源（S1-2）+ 风暴抑制（quiet/冷却/hash/r7-）+ @review 声明通道

| 用例 | 期望 | 实测 | 关联 |
|---|---|---|---|
| write run/foo.json（非 .md run/ 产物） | true | true | L0-1 | ✅ |
| write run/foo.md | true | true | 基础 | ✅ |
| write 任意 .md（非 run/） | true | true | 设计 | ✅ |
| 写审计自输出：run/review/<主>/<评估者>/review.md | false | false | 自输出 | ✅ |
| 单层旧格式槽：run/review/<主>/review.md（完善项 1） | false | false | 完善项1 | ✅ |
| 写空报告记录：run/review/<主>/empty/ | false | false | 自输出 | ✅ |
| 写 selfcheck 输入包：run/review/selfcheck/input.md（S2-5 后旧 review-selfcheck 前缀不再特殊） | false | false | S1-5 | ✅ |
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
| r7- 存档豁免（storm-§7：审查存档不入审查面） | true | true | storm-§7 | ✅ |
| 新 selfcheck 路径：run/review/selfcheck/input.md 是自输出 | true | true | 结构 | ✅ |
| run/ 顶层任务目录（非 review 前缀）不是自输出 | true | true | 结构 | ✅ |
| 从产物路径提取任务名 | step4a | step4a | 索引 | ✅ |
| 取最后匹配（当前活动任务） | l4-task1 | l4-task1 | 索引 | ✅ |
| review 前缀不算任务名 | undefined | undefined | 索引 | ✅ |
| 无产物路径 → 无任务名 | undefined | undefined | 索引 | ✅ |
| 结论提取（需修订） | 需修订 | 需修订 | 索引 | ✅ |
| 结论提取（通过） | 通过 | 通过 | 索引 | ✅ |
| 结论提取（未知） | （未知） | （未知） | 索引 | ✅ |
| 索引路径 | /home/u/UnivEdge/run/review/INDEX.md | /home/u/UnivEdge/run/review/INDEX.md | 索引 | ✅ |
| INDEX 首次创建成功 | true | true | S1-1 | ✅ |
| INDEX 追加成功 | true | true | S1-1 | ✅ |
| INDEX 表头含触发通道列 | true | true | S2-4 | ✅ |
| INDEX 含两条记录 | 2 | 2 | S2-4 | ✅ |
| INDEX 记录含任务名与结论 | true | true | S2-4 | ✅ |
| INDEX 通道列记录 declared/auto | true | true | S2-4 | ✅ |
| INDEX 无 channel 字段记录缺省 auto（历史兼容） | true | true | S2-4 | ✅ |
| 并发首写场景两条记录不丢（wx 排他 + EEXIST 回退） | 2 | 2 | S1-1 | ✅ |
| quiet：行内引述不命中（判别夹具，旧实现会失败） | false | false | S0-fix | ✅ |
| quiet：行内引述不命中（冒号变体） | false | false | S0-fix | ✅ |
| quiet：大小写不敏感（Review: OFF） | true | true | storm-P1A | ✅ |
| quiet：正常回复不含 | false | false | storm-P1A | ✅ |
| 冷却：0 次成功 → 不冷却 | false | false | storm-P0A | ✅ |
| 冷却：1 次在窗口内 → 不冷却 | false | false | storm-P0A | ✅ |
| 冷却：2 次在窗口内 → 冷却 | true | true | storm-P0A | ✅ |
| 冷却：1 次窗口内 + 1 次窗口外 → 不冷却 | false | false | storm-P0A | ✅ |
| hash：内容未变 → 全部一致（跳过） | true | true | storm-P0B | ✅ |
| hash：新增文件未记录 → 变化 | false | false | storm-P0B | ✅ |
| hash：修改后 → 变化（触发） | false | false | storm-P0B | ✅ |
| hash：空路径列表 → 不跳过 | false | false | storm-P0B | ✅ |
| hash：不存在的文件 → 不跳过（宁审勿漏） | false | false | storm-P0B | ✅ |
| hash：contentHash 读存在文件返回 64 hex | 64 | 64 | storm-P0B | ✅ |
| 声明：@review run/step5/conclusion.md | run/step5/conclusion.md | run/step5/conclusion.md | declare | ✅ |
| 声明：多路径去重 | run/a.md,run/b.json | run/a.md,run/b.json | declare | ✅ |
| 声明：尾部清单（"与"连接多路径） | run/t1/a.md,run/t1/b.md | run/t1/a.md,run/t1/b.md | declare | ✅ |
| 声明：尾部清单（顿号连接） | run/x/1.md,run/x/2.md,run/x/3.json | run/x/1.md,run/x/2.md,run/x/3.json | declare | ✅ |
| 声明：任意 .md（非 run/） | notes/summary.md | notes/summary.md | declare | ✅ |
| 声明：审查自输出被过滤（@review 自己的报告无意义） |  |  | declare | ✅ |
| 声明：无 @review → 空数组 |  |  | declare | ✅ |
| 声明：@review 无路径 → 空（约定：必须带路径） |  |  | declare | ✅ |
| 声明：大小写不敏感（@Review） | run/step5/x.md | run/step5/x.md | declare | ✅ |
| 声明：不存在的文件也提取（路径提取不查盘，留给评估者核实） | run/ghost/x.md | run/ghost/x.md | declare | ✅ |
| 声明扫描：窗口 [5,6] 只取 turn 内声明 | run/t1/a.md,run/t1/b.md | run/t1/a.md,run/t1/b.md | declare-scan | ✅ |
| 声明扫描：窗口 [0,9] 全量 | run/t1/a.md,run/t1/b.md,run/t2/c.md | run/t1/a.md,run/t1/b.md,run/t2/c.md | declare-scan | ✅ |
| 声明扫描：无事件 → 空 |  |  | declare-scan | ✅ |
| 输入包：有声明路径时收入本轮交付 | true | true | S1-5 | ✅ |
| 输入包：不再塞入早前轮的旧任务文件（handoff-bc） | false | false | S1-5 | ✅ |
| 输入包：不再塞入早前轮的审查风暴文件 | false | false | S1-5 | ✅ |
| 输入包：无声明路径时保留兜底（含早前轮文件，不把输入包清空） | true | true | S1-5 | ✅ |
| 上限：24 项候选按上限封顶（原 12 → 实测丢弃 18 项） | 20 | 20 | S2 | ✅ |
| 上限：文档（docs/）属正常优先级，不被降级挤出 | true | true | S1-8 | ✅ |
| 上限：低优先级仅限可再生产物（证据/归档/README） | true | true | S1-8 | ✅ |
| 上限：落选者显式回报（不再静默丢弃） | 4 | 4 | S2 | ✅ |
| 上限：落选的是最旧的行为定义源（最近写入优先） | true,false | true,false | S2 | ✅ |
| 上限：被声明的低优先级文件不被上限挤掉 | true | true | S2 | ✅ |
| 选择器：低优先级（证据/README）即便更新也让位于行为定义源 | /a/sub-old.ts | /a/sub-old.ts | S2 | ✅ |
| 选择器：docs 不属低优先级，按最近写入取胜（S1-8） | /a/docs/d.md | /a/docs/d.md | S1-8 | ✅ |
| 选择器：同优先级内按最近写入取 | /a/sub-new.ts | /a/sub-new.ts | S2 | ✅ |
| 选择器：落选者进 notPicked（供显式回报） | /a/sub-old.ts | /a/sub-old.ts | S2 | ✅ |
| 低优先级判定：仅可再生产物命中（证据/归档/README）；docs 与源码、知识库均不命中 | false,true,true,true,false,false | false,true,true,true,false,false | S1-8 | ✅ |
| 输入包：窗口内未声明、仅经 file_path 给出的 .md 必须入列（锁结构化提取） | true | true | S1-9 | ✅ |
| 输入包：为该产物记录指纹（size/mtime/sha256） | string | string | S0-1 | ✅ |
| 报告取值：取主会话中该子会话的最长报告（不是收尾摘要） | true | true | S1-9 | ✅ |
| 报告取值：隔离其他子会话的报告 | false | false | S1-9 | ✅ |
| 报告取值：无匹配子会话时返回空（交给子会话回落） |  |  | S1-9 | ✅ |
| 报告取值：不把用户消息当报告 |  |  | S1-9 | ✅ |
| 报告标志：认得带序号的结论标题（## 1. 结论） | true | true | S1-9 | ✅ |
| 生产路径：真实仓库产物（METHODOLOGY.md）被收入输入包 | true | true | S1-7 | ✅ |
| 生产路径：真实产物被记录指纹 | string | string | S1-7 | ✅ |
| 指纹：文件内容变化即检出（组包后改写可被判为漂移） | true | true | S0-1 | ✅ |
| 指纹：不存在文件返回 undefined（不抛错） | undefined | undefined | S0-1 | ✅ |
| 声明解析：12 项散文清单（含 .ts/.py）全部解析 | 12 | 12 | S0-1 | ✅ |
| 声明解析：不再受 200 字符截断 | true | true | S0-1 | ✅ |
| 声明解析：引述真路径（代码跨度内）不构成声明 | 0 | 0 | S0-2 | ✅ |
| 声明解析：同输入连续调用结果稳定（无 g 标志状态污染） | 0,0,0,0 | 0,0,0,0 | S0-1 | ✅ |
| 声明解析：裸写声明稳定命中（4 次一致） | 1,1,1,1 | 1,1,1,1 | S0-1 | ✅ |
| 声明解析：纯讨论（无路径）不构成声明 | 0 | 0 | S0-1 | ✅ |
| 声明解析：讨论里引述真实路径但无 @review → 不构成声明 | 0 | 0 | S0-1 | ✅ |
| 声明解析：通配符不是路径 | 0 | 0 | S0-1 | ✅ |
| 声明解析：非 ASCII（中文）路径必须被解析 | 1 | 1 | S0-1 | ✅ |
| 声明：相对路径按 session cwd 解析（不依赖 process.cwd） | /tmp/cwdrel-RkmqAt/dsh-adapter/x.ts | /tmp/cwdrel-RkmqAt/dsh-adapter/x.ts | S0-1 | ✅ |
| 声明：解析成功后不再出现在 dropped | 0 | 0 | S0-1 | ✅ |
| 声明：相对路径也被记录指纹 | string | string | S0-1 | ✅ |
| 声明解析：含空格的中文路径不会被截断成子串 | false | false | S0-1 | ✅ |
| 声明扫描：子代理回执内的 @review 被排除、assistant 声明保留 | /data/home/hanwu/UnivEdge/METHODOLOGY.md | /data/home/hanwu/UnivEdge/METHODOLOGY.md | S0-1 | ✅ |
| 组包：13 项声明路径全部入列（不截断） | 13 | 13 | S0-2 | ✅ |
| 组包：未入列候选显式报告（此处为空） | 0 | 0 | S0-2 | ✅ |
| 组包（auto 通道）：行为定义源优先于低优先级产物 | /data/home/hanwu/UnivEdge/AGENTS.md | /data/home/hanwu/UnivEdge/AGENTS.md | S1-4/S2 | ✅ |
| 组包（auto 通道）：名额未受限时低优先级照常入列（不因优先级被丢） | 2 | 2 | S2 | ✅ |
| 输入包（auto）：相对路径的 .ts 源码能入列（原被白名单+startsWith 排除） | true | true | S1-6 | ✅ |
| 组包：任务描述取自触发轮（非会话首条 L1 文本） | true | true | S0-3 | ✅ |
| 组包：任务描述来源标注为 trigger-turn | trigger-turn | trigger-turn | S0-3 | ✅ |
| 组包：agent-instructions 注入不被选为任务描述 | false | false | S0-1 | ✅ |
| 组包：注入存在时回落到真实用户长消息 | 请评估本轮交付（证据门单元）并给出提交建议 | 请评估本轮交付（证据门单元）并给出提交建议 | S0-1 | ✅ |
| 声明扫描：注入来源（agent-instructions/plugin）中的 @review 不计入 |  |  | S0-1 | ✅ |
| 组包：回执不被选为任务描述（S1-3 修） | false | false | S1-3 | ✅ |
| 组包：无可回落长消息时如实标注低信息量（trigger-turn-short） | trigger-turn-short | trigger-turn-short | S1-3 | ✅ |
| 组包：触发轮短回复（"可以"）→ 回落取最近长消息 | true | true | S1-3 | ✅ |
| 组包：来源标注为 recent-user | recent-user | recent-user | S1-3 | ✅ |
| 报告：组包后产物被改写 → 结论标失效（机制判定，2026-10-10 裁决 1 收紧） | true | true | S1-4b | ✅ |
| 报告：状态行显式标注已失效 | true | true | S1-4b | ✅ |

**125/125 通过, 0 失败**
