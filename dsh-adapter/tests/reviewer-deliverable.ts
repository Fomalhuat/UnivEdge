/**
 * reviewer 逻辑单元测试（import reviewer-shared 单一事实来源——S1-2 闭合：源码/测试共用，漂移即测试失败）
 *
 * 运行（在 UnivEdge 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts
 *
 * 覆盖：
 *  - 触发判据（信号 A 工具层 / 信号 B 文本层）：交付物触发、讨论/规划句/抽象词跳过、
 *    run/review-test2 前缀不误伤、审计自输出排除、handoff 重新进入审查面（S1-1）、
 *    自检产物排除（S1-5）、文本层按路径片段粒度不连坐（S1-4）
 *  - 缺陷 2（空报告落盘路径）/ 缺陷 3（分目录写盘路径）/ 缺陷 4 + S2-2（pickReport 报告提取）
 *  - 审查风暴抑制（2026-08-31 storm-diagnosis）：r7- 存档豁免（§7）、quiet 指令（P1-A）、
 *    冷却期（P0-A）、hash 去重（P0-B）
 */
import { isArtifactPath, textHasDeliverable, reviewOutDir, emptyOutDir, pickReport, isReviewSelfOutput, extractTaskName, extractConclusion, reviewIndexPath } from '../reviewer-shared'

let pass = 0
let fail = 0
const results: string[] = []

function check(name: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${name} | ${expected} | ${got} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

// ---------- 1. 触发判据（信号 A：工具层路径） ----------
check('write run/foo.json（非 .md run/ 产物）', isArtifactPath('run/foo.json'), true, 'L0-1')
check('write run/foo.md', isArtifactPath('run/foo.md'), true, '基础')
check('write 任意 .md（非 run/）', isArtifactPath('notes/summary.md'), true, '设计')
check('写审计自输出：run/review/<主>/<评估者>/review.md', isArtifactPath('run/review/9e496951/9546ca98/review.md'), false, '自输出')
check('单层旧格式槽：run/review/<主>/review.md（完善项 1）', isArtifactPath('run/review/9e496951/review.md'), false, '完善项1')
check('写空报告记录：run/review/<主>/empty/', isArtifactPath('run/review/9e496951/empty/9546ca98.md'), false, '自输出')
check('写 selfcheck 输入包：run/review/selfcheck/input.md（S2-5 后旧 review-selfcheck 前缀不再特殊）', isArtifactPath('run/review/selfcheck/input.md'), false, 'S1-5')
check('写 handoff：run/review/handoff-bc.md（重新进入审查面）', isArtifactPath('run/review/handoff-bc.md'), true, 'S1-1')
check('run/review-test2/ 产物前缀不误伤', isArtifactPath('run/review-test2/conclusion.md'), true, '边界')

// ---------- 2. 触发判据（信号 B：文本层） ----------
check('未来式规划句', textHasDeliverable('下一步我们将写入 conclusion.md'), false, 'L1-2')
check('完成态：已写入 run/review-test2/conclusion.md', textHasDeliverable('已写入 run/review-test2/conclusion.md'), true, '完成态')
check('抽象词结论', textHasDeliverable('我的结论是：该公式成立'), false, '抽象词')
check('纯审计表述：已写入 run/review/x/y/review.md', textHasDeliverable('审查报告已写入 run/review/9e496951/9546ca98/review.md'), false, '自输出')
check('混合：交付物+自输出同段（S1-4 不连坐）', textHasDeliverable('已写入 run/step5/data.csv，审查报告已写入 run/review/9e496951/9546ca98/review.md'), true, 'S1-4')

// ---------- 3. 缺陷 3：分目录写盘路径 ----------
const dir = reviewOutDir('/home/u/UnivEdge', 'session-9e496951-ad7a-464b-a2fc-b72756b4ee02', 'session-9546ca98-4b4c-48d1-aac1-8c7e5f936f66')
check('分目录写盘：<主8>/<评估者8>/', dir, '/home/u/UnivEdge/run/review/9e496951/9546ca98', '缺陷3')
const dir2 = reviewOutDir('/home/u/UnivEdge', '9e496951-ad7a-464b', '9546ca98-4b4c-48d1')
check('短 ID 已带 session- 前缀也正确', dir2, '/home/u/UnivEdge/run/review/9e496951/9546ca98', '缺陷3')

// ---------- 4. 缺陷 2：空报告记录路径 ----------
const emptyDir = emptyOutDir('/home/u/UnivEdge', 'session-9e496951-ad7a-464b-a2fc-b72756b4ee02')
check('空报告记录目录：<主8>/empty/', emptyDir, '/home/u/UnivEdge/run/review/9e496951/empty', '缺陷2')

// ---------- 5. 缺陷 4 + S2-2：报告提取 ----------
const evSummary = [{ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '审查报告已提交完毕（见上方）' }] } } }]
check('摘要桩场景：仅收尾句 → 提取到完整报告（下一条更长）',
  pickReport([
    ...evSummary,
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '## 结论：需修订\nS0 问题清单……\n解耦声明：独立上下文' }] } } },
  ]),
  '## 结论：需修订\nS0 问题清单……\n解耦声明：独立上下文',
  'S2-2')
check('长分析不顶掉报告（无报告标志的分析被过滤）',
  pickReport([
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '让我深入分析这个问题的每个方面……'.repeat(200) }] } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '## 结论：通过\n逐条检查……\n解耦声明：L2' }] } } },
  ]),
  '## 结论：通过\n逐条检查……\n解耦声明：L2',
  'S2-2')
check('长分析含高频词"通过"不顶掉报告（完善项 3b：专有锚过滤）',
  pickReport([
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '这个公式通过了所有验证……通过检查……通过……'.repeat(120) }] } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '## 结论：需修订\n问题清单：……\n解耦声明：独立上下文' }] } } },
  ]),
  '## 结论：需修订\n问题清单：……\n解耦声明：独立上下文',
  '完善项3b')
check('空事件 → 空报告', pickReport([]), '', '缺陷2路径')
check('纯中间思考（无报告标志）→ 空', pickReport([{ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '我正在检查文件的第 3 行……' }] } } }]), '', '缺陷2路径')

// ---------- 6. isReviewSelfOutput 精确性 ----------
check('非审查路径不排除', isReviewSelfOutput('run/step5/data.csv'), false, '精确性')
check('r7- 存档豁免（storm-§7：审查存档不入审查面）', isReviewSelfOutput('run/review/r7-348151ae/review.md'), true, 'storm-§7')
check('新 selfcheck 路径：run/review/selfcheck/input.md 是自输出', isReviewSelfOutput('run/review/selfcheck/input.md'), true, '结构')
check('run/ 顶层任务目录（非 review 前缀）不是自输出', isArtifactPath('run/step4a/conclusion.md'), true, '结构')

// ---------- 7. 任务名/结论提取 + 索引 ----------
check('从产物路径提取任务名', extractTaskName(['/data/home/hanwu/UnivEdge/run/step4a/conclusion.md']), 'step4a', '索引')
check('取最后匹配（当前活动任务）', extractTaskName(['/data/home/hanwu/UnivEdge/run/step4a/x.md', '/data/home/hanwu/UnivEdge/run/l4-task1/y.md']), 'l4-task1', '索引')
check('review 前缀不算任务名', extractTaskName(['/data/home/hanwu/UnivEdge/run/review/9e496951/review.md']), undefined, '索引')
check('无产物路径 → 无任务名', extractTaskName([]), undefined, '索引')
check('结论提取（需修订）', extractConclusion('## 结论：需修订\nS0 问题……'), '需修订', '索引')
check('结论提取（通过）', extractConclusion('## 结论：通过\n无 S0'), '通过', '索引')
check('结论提取（未知）', extractConclusion('无结论字段的报告'), '（未知）', '索引')
check('索引路径', reviewIndexPath('/home/u/UnivEdge'), '/home/u/UnivEdge/run/review/INDEX.md', '索引')

// ---------- 8. appendReviewIndex 行为（S2-4：创建/追加/表头/并发首写） ----------
import { appendReviewIndex } from '../reviewer-shared'
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
{
  const tmp = mkdtempSync(join(tmpdir(), 'reviewer-idx-'))
  try {
    const rec1 = { mainId: 'session-aaaa1111-0000', childId: 'session-bbbb2222-0000', conclusion: '需修订', task: 'step4a', reportPath: 'run/review/aaaa1111/bbbb2222/review.md' }
    const rec2 = { mainId: 'session-aaaa1111-0000', childId: 'session-cccc3333-0000', conclusion: '（空）', reportPath: 'run/review/aaaa1111/empty/cccc3333.md' }
    const ok1 = appendReviewIndex(tmp, rec1)
    const ok2 = appendReviewIndex(tmp, rec2)
    const content = readFileSync(join(tmp, 'run', 'review', 'INDEX.md'), 'utf8')
    check('INDEX 首次创建成功', ok1, true, 'S1-1')
    check('INDEX 追加成功', ok2, true, 'S1-1')
    check('INDEX 表头含时间/任务/结论列', content.includes('| 时间 | 主会话 | 评估者 | 结论 | 关联任务 | 报告路径 |'), true, 'S2-4')
    check('INDEX 含两条记录', content.split('\n').filter((l) => l.startsWith('| 20')).length, 2, 'S2-4')
    check('INDEX 记录含任务名与结论', content.includes('step4a') && content.includes('需修订') && content.includes('（空）'), true, 'S2-4')
    // 并发首写模拟：清空后两个排他创建竞争（wx flag 保证不互相覆盖丢记录）
    rmSync(join(tmp, 'run', 'review', 'INDEX.md'))
    appendReviewIndex(tmp, rec1)
    appendReviewIndex(tmp, rec2) // 第二个走 EEXIST → append
    const content2 = readFileSync(join(tmp, 'run', 'review', 'INDEX.md'), 'utf8')
    check('并发首写场景两条记录不丢（wx 排他 + EEXIST 回退）', content2.split('\n').filter((l) => l.startsWith('| 20')).length, 2, 'S1-1')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ---------- 9. 审查风暴抑制（2026-08-31 review-storm-diagnosis：冷却期 / hash 去重 / quiet 指令） ----------
import { hasQuietDirective, allArtifactsUnchanged, shouldCooldown, contentHash } from '../reviewer-shared'
{
  // P1-A quiet 指令
  check('quiet：--no-review', hasQuietDirective('本轮仅响应 S2，--no-review'), true, 'storm-P1A')
  check('quiet：review:off', hasQuietDirective('批量归档，review:off'), true, 'storm-P1A')
  check('quiet：大小写不敏感（Review: OFF）', hasQuietDirective('Review: OFF'), true, 'storm-P1A')
  check('quiet：正常回复不含', hasQuietDirective('已修订产物并落盘 run/step5/x.md'), false, 'storm-P1A')

  // P0-A 冷却期（窗口 15min=900000ms，上限 2 次）
  const now = 1_000_000_000_000
  const W = 900_000
  check('冷却：0 次成功 → 不冷却', shouldCooldown([], now, 2, W), false, 'storm-P0A')
  check('冷却：1 次在窗口内 → 不冷却', shouldCooldown([now - 60_000], now, 2, W), false, 'storm-P0A')
  check('冷却：2 次在窗口内 → 冷却', shouldCooldown([now - 60_000, now - 30_000], now, 2, W), true, 'storm-P0A')
  check('冷却：1 次窗口内 + 1 次窗口外 → 不冷却', shouldCooldown([now - 2_000_000, now - 30_000], now, 2, W), false, 'storm-P0A')

  // P0-B hash 去重（临时文件实测）
  const tmp = mkdtempSync(join(tmpdir(), 'reviewer-hash-'))
  try {
    const f1 = join(tmp, 'a.md')
    const f2 = join(tmp, 'b.md')
    writeFileSync(f1, 'content-v1')
    writeFileSync(f2, 'content-v2')
    const reviewed = new Map<string, string>()
    reviewed.set(f1, contentHash(f1)!)
    check('hash：内容未变 → 全部一致（跳过）', allArtifactsUnchanged([f1], reviewed), true, 'storm-P0B')
    check('hash：新增文件未记录 → 变化', allArtifactsUnchanged([f1, f2], reviewed), false, 'storm-P0B')
    writeFileSync(f1, 'content-v1-edited')
    check('hash：修改后 → 变化（触发）', allArtifactsUnchanged([f1], reviewed), false, 'storm-P0B')
    check('hash：空路径列表 → 不跳过', allArtifactsUnchanged([], reviewed), false, 'storm-P0B')
    check('hash：不存在的文件 → 不跳过（宁审勿漏）', allArtifactsUnchanged([join(tmp, 'ghost.md')], reviewed), false, 'storm-P0B')
    check('hash：contentHash 读存在文件返回 64 hex', String(contentHash(f1)).length, 64, 'storm-P0B')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ---------- 输出 ----------
const lines = [
  '# reviewer 逻辑单元测试结果（shared 模块）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`',
  '- 覆盖：触发判据（A/B 层）+ 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + INDEX 创建/追加/并发 + 共享模块单一事实来源（S1-2）',
  '',
  '| 用例 | 期望 | 实测 | 关联 |',
  '|---|---|---|---|',
  ...results,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
