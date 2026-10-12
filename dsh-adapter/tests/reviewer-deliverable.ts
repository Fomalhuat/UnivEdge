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
 *  - 显式审查点（2026-08-31 framework-redesign 方向 1）：@review 声明提取（文本级）+ 事件级扫描
 */
import { extractReviewInput, fingerprint, persistReport } from '../univedge-reviewer'
import { isArtifactPath, textHasDeliverable, reviewOutDir, emptyOutDir, pickReport, pickReportFromParent, isReviewSelfOutput, extractTaskName, extractConclusion, reviewIndexPath, extractReviewDeclarations, selectArtifacts, isLowPriorityArtifact } from '../reviewer-shared'

let pass = 0
let fail = 0
const results: string[] = []

function check(name: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${name} | ${expected} | ${got} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

const repoRootOf = (u: string): string => new URL('../../', u).pathname.replace(/\/$/, '')

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
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
{
  const tmp = mkdtempSync(join(tmpdir(), 'reviewer-idx-'))
  try {
    const rec1 = { mainId: 'session-aaaa1111-0000', childId: 'session-bbbb2222-0000', conclusion: '需修订', task: 'step4a', reportPath: 'run/review/aaaa1111/bbbb2222/review.md', channel: 'declared' }
    const rec2 = { mainId: 'session-aaaa1111-0000', childId: 'session-cccc3333-0000', conclusion: '（空）', reportPath: 'run/review/aaaa1111/empty/cccc3333.md', channel: 'auto' }
    const ok1 = appendReviewIndex(tmp, rec1)
    const ok2 = appendReviewIndex(tmp, rec2)
    const content = readFileSync(join(tmp, 'run', 'review', 'INDEX.md'), 'utf8')
    check('INDEX 首次创建成功', ok1, true, 'S1-1')
    check('INDEX 追加成功', ok2, true, 'S1-1')
    check('INDEX 表头含触发通道列', content.includes('| 时间 | 主会话 | 评估者 | 结论 | 触发通道 | 关联任务 | 报告路径 |'), true, 'S2-4')
    check('INDEX 含两条记录', content.split('\n').filter((l) => l.startsWith('| 20')).length, 2, 'S2-4')
    check('INDEX 记录含任务名与结论', content.includes('step4a') && content.includes('需修订') && content.includes('（空）'), true, 'S2-4')
    check('INDEX 通道列记录 declared/auto', content.includes('| declared |') && content.includes('| auto |'), true, 'S2-4')
    // 缺省 channel（历史调用不传字段）→ 缺省标 auto（旧记录统计兼容）
    appendReviewIndex(tmp, { mainId: 'session-aaaa1111-0000', childId: 'session-dddd4444-0000', conclusion: '通过', reportPath: 'run/review/aaaa1111/dddd4444/review.md' })
    const content3 = readFileSync(join(tmp, 'run', 'review', 'INDEX.md'), 'utf8')
    check('INDEX 无 channel 字段记录缺省 auto（历史兼容）', content3.includes('| 通过 | auto | — |'), true, 'S2-4')
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
  // R7 第十八轮：这两条原断言"**行内**出现字面量即静默"（旧语义）——正是导致两次静默失效的行为，
  // 现改为**判别夹具**：行内引述必须**不**命中（旧实现在此会失败）。
  check('quiet：行内引述不命中（判别夹具，旧实现会失败）', hasQuietDirective('本轮仅响应 S2，--no-review'), false, 'S0-fix')
  check('quiet：行内引述不命中（冒号变体）', hasQuietDirective('批量归档，review:off'), false, 'S0-fix')
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

// ---------- 10. 显式审查点（2026-08-31 framework-redesign 方向 1：@review 声明通道） ----------
import { extractReviewDeclarations, scanTurnDeclarations } from '../reviewer-shared'
{
  check('声明：@review run/step5/conclusion.md', extractReviewDeclarations('产物已完成，@review run/step5/conclusion.md'), ['run/step5/conclusion.md'], 'declare')
  check('声明：多路径去重', extractReviewDeclarations('@review run/a.md 和 @review run/a.md 与 @review run/b.json'), ['run/a.md', 'run/b.json'], 'declare')
  check('声明：尾部清单（"与"连接多路径）', extractReviewDeclarations('完成，@review run/t1/a.md 与 run/t1/b.md'), ['run/t1/a.md', 'run/t1/b.md'], 'declare')
  check('声明：尾部清单（顿号连接）', extractReviewDeclarations('@review run/x/1.md、run/x/2.md、run/x/3.json'), ['run/x/1.md', 'run/x/2.md', 'run/x/3.json'], 'declare')
  check('声明：任意 .md（非 run/）', extractReviewDeclarations('请审查 @review notes/summary.md'), ['notes/summary.md'], 'declare')
  check('声明：审查自输出被过滤（@review 自己的报告无意义）', extractReviewDeclarations('@review run/review/9e496951/9546ca98/review.md'), [], 'declare')
  check('声明：无 @review → 空数组', extractReviewDeclarations('已写入 run/step5/conclusion.md，请查阅'), [], 'declare')
  check('声明：@review 无路径 → 空（约定：必须带路径）', extractReviewDeclarations('请 @review 一下'), [], 'declare')
  check('声明：大小写不敏感（@Review）', extractReviewDeclarations('@Review run/step5/x.md'), ['run/step5/x.md'], 'declare')
  check('声明：不存在的文件也提取（路径提取不查盘，留给评估者核实）', extractReviewDeclarations('@review run/ghost/x.md'), ['run/ghost/x.md'], 'declare')

  // 事件级扫描（seq 窗口过滤 + user/assistant 事件）
  const evs = [
    { seq: 1, type: 'user/message', data: { message: { content: [{ type: 'text', text: '任务开始' }] } } },
    { seq: 5, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '写入 run/t1/a.md' }] } } },
    { seq: 6, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '完成，@review run/t1/a.md 与 run/t1/b.md' }] } } },
    { seq: 9, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '@review run/t2/c.md（窗口外，不应计入）' }] } } },
  ]
  check('声明扫描：窗口 [5,6] 只取 turn 内声明', scanTurnDeclarations(evs, 5, 6), ['run/t1/a.md', 'run/t1/b.md'], 'declare-scan')
  check('声明扫描：窗口 [0,9] 全量', scanTurnDeclarations(evs, 0, 9), ['run/t1/a.md', 'run/t1/b.md', 'run/t2/c.md'], 'declare-scan')
  check('声明扫描：无事件 → 空', scanTurnDeclarations([], 0, 9), [], 'declare-scan')
}

// ---------- 输入包组包：触发轮窗口过滤（R7 第二轮 S1-5） ----------
// 缺陷：tool/call 分支原不按触发轮过滤 → 长会话里输入包塞满早前任务的文件，
// 评估者"审错文件却声称已审"（B4 型验证失效）。以下用**真实存在**的路径构造，避免被 existsSync 过滤成空集。
{
  // R7 第八轮 S1-4 修：**不读 run/ 下的产物**（run/ 不入库，干净检出上会误红）——
  // 改为自建临时 fixture 目录，测试自包含。
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'pkgfix-'))
  mkdirSync(join(fixtureRoot, 'run/review'), { recursive: true })
  const mine = `${fixtureRoot}/deliverable-now.ts`
  const stale1 = `${fixtureRoot}/run/review/handoff-bc.md`
  const stale2 = `${fixtureRoot}/run/review/handoff-storm-cost.md`
  writeFileSync(mine, 'now'); writeFileSync(stale1, 'old'); writeFileSync(stale2, 'old')
  const mk = (seq: number, type: string, data: any) => ({ seq, type, data })
  const evs = [
    mk(1, 'user/message', { content: [{ type: 'text', text: '任务' }] }),
    mk(4, 'tool/call', { name: 'read', arguments: JSON.stringify({ file_path: stale1 }) }),
    mk(5, 'tool/call', { name: 'read', arguments: JSON.stringify({ file_path: stale2 }) }),
    mk(20, 'tool/call', { name: 'write', arguments: JSON.stringify({ file_path: mine }) }),
    mk(21, 'assistant/message', { message: { content: [{ type: 'text', text: '已写入 dsh-adapter/tests/l1-seat.ts' }] } }),
  ]
  const session = { header: { cwd: fixtureRoot }, events: evs }
  const withDecl = extractReviewInput(session, 20, 21, [mine])
  check('输入包：有声明路径时收入本轮交付', withDecl.artifacts.includes(mine), true, 'S1-5')
  check('输入包：不再塞入早前轮的旧任务文件（handoff-bc）', withDecl.artifacts.includes(stale1), false, 'S1-5')
  check('输入包：不再塞入早前轮的审查风暴文件', withDecl.artifacts.includes(stale2), false, 'S1-5')
  const noDecl = extractReviewInput(session, 20, 21, [])
  check('输入包：无声明路径时保留兜底（含早前轮文件，不把输入包清空）', noDecl.artifacts.length > 0, true, 'S1-5')
  rmSync(fixtureRoot, { recursive: true, force: true })
}

// ---------- 输入包：上限与优先级（R7 第十一轮 S2） ----------
// 缺陷：纯"最近写入"排序 + 上限 12 → 长会话里同轮重写的证据/文档挤掉行为定义源
// （实测丢弃 18 项，含 univedge-l1-inject.ts、reviewer-shared.ts）。修：上限 20 + 低优先级让位 + 落选者显式回报。
{
  const fx = mkdtempSync(join(tmpdir(), 'capfix-'))
  for (const d of ['docs', 'test-results', 'archive']) mkdirSync(join(fx, d), { recursive: true })
  const mk = (seq: number, type: string, data: any) => ({ seq, type, data })
  const evs: any[] = [mk(1, 'user/message', { content: [{ type: 'text', text: '任务' }] })]
  const subs: string[] = []
  let seq = 10
  for (let i = 1; i <= 20; i++) {
    const f = `${fx}/sub-${String(i).padStart(2, '0')}.ts`
    writeFileSync(f, `// ${i}`); subs.push(f)
    evs.push(mk(seq++, 'tool/call', { name: 'write', arguments: JSON.stringify({ file_path: f }) }))
  }
  const lows = [`${fx}/docs/low-doc.md`, `${fx}/README.md`, `${fx}/test-results/low-ev.md`, `${fx}/archive/low-arch.md`]
  for (const f of lows) { writeFileSync(f, 'x'); evs.push(mk(seq++, 'tool/call', { name: 'write', arguments: JSON.stringify({ file_path: f }) })) }
  evs.push(mk(seq, 'assistant/message', { message: { content: [{ type: 'text', text: '完成' }] } }))
  const sess = { header: { cwd: fx }, events: evs }
  const r = extractReviewInput(sess, 10, seq, [])
  check('上限：24 项候选按上限封顶（原 12 → 实测丢弃 18 项）', r.artifacts.length, 20, 'S2')
  // R7 第十四轮 S1-8：`docs/` 不再算低优先级（文档任务的主交付物就是 docs/*.md）——
  // 实测 docx/10 曾被挤出指纹集，导致主交付物无法声明"窗口内无改写"。
  check('上限：文档（docs/）属正常优先级，不被降级挤出', r.artifacts.includes(`${fx}/docs/low-doc.md`), true, 'S1-8')
  check('上限：低优先级仅限可再生产物（证据/归档/README）', [lows[1], lows[2], lows[3]].every((p) => !r.artifacts.includes(p)), true, 'S1-8')
  check('上限：落选者显式回报（不再静默丢弃）', r.dropped.filter((d) => d.includes('未入列')).length, 4, 'S2')
  // 名额 20：docs/low-doc.md（最新）占 1 → 余 19 给行为定义源，按最近写入取 subs[1..19]，最旧的 subs[0] 落选
  check('上限：落选的是最旧的行为定义源（最近写入优先）', [subs.slice(1).every((p) => r.artifacts.includes(p)), r.artifacts.includes(subs[0])], [true, false], 'S2')
  // 声明项**必然**入列（即便属低优先级）：声明是生成者的显式裁决，优先级不得覆盖它
  const r2 = extractReviewInput(sess, 10, seq, [`${fx}/README.md`])
  check('上限：被声明的低优先级文件不被上限挤掉', r2.artifacts.includes(`${fx}/README.md`), true, 'S2')
  rmSync(fx, { recursive: true, force: true })
}

// ---------- 产物选择器（纯函数，插件与测试共用同一事实来源） ----------
{
  const at = (m: Map<string, number>) => (p: string) => m.get(p) ?? -1
  const m1 = new Map([['/a/sub-new.ts', 9], ['/a/sub-old.ts', 1], ['/a/docs/d.md', 99]])
  check('选择器：低优先级（证据/README）即便更新也让位于行为定义源',
    selectArtifacts([], ['/a/sub-old.ts', '/a/test-results/d.md'], at(m1), 1).picked, ['/a/sub-old.ts'], 'S2')
  check('选择器：docs 不属低优先级，按最近写入取胜（S1-8）',
    selectArtifacts([], ['/a/sub-old.ts', '/a/docs/d.md'], at(m1), 1).picked, ['/a/docs/d.md'], 'S1-8')
  const two = selectArtifacts([], ['/a/sub-old.ts', '/a/sub-new.ts'], at(m1), 1)
  check('选择器：同优先级内按最近写入取', two.picked, ['/a/sub-new.ts'], 'S2')
  check('选择器：落选者进 notPicked（供显式回报）', two.notPicked, ['/a/sub-old.ts'], 'S2')
  check('低优先级判定：仅可再生产物命中（证据/归档/README）；docs 与源码、知识库均不命中',
    ['/a/docs/x.md', '/a/README.md', '/a/test-results/x.md', '/a/archive/x.md', '/a/dsh-adapter/univedge-reviewer.ts', '/a/knowledge/review-lessons.md'].map(isLowPriorityArtifact),
    [false, true, true, true, false, false], 'S1-8')
}

// ---------- 输入包：结构化参数提取的正向断言（R7 第四轮 S1-9） ----------
// 原 4 条断言只锁"窗口过滤"：`mine` 走 declaredPaths、`.ts` 又不在结构化白名单内，
// 故把 parsedArgs 整段删掉仍会全绿（“测过≠测对”）。此处补一条**只能由结构化提取产生**的断言。
{
  const fixtureRoot2 = mkdtempSync(join(tmpdir(), 'structfix-'))
  mkdirSync(join(fixtureRoot2, 'run/review'), { recursive: true })
  const target = `${fixtureRoot2}/run/review/INDEX.md`   // .md、存在、未声明、仅由 file_path 结构化字段给出
  writeFileSync(target, '# index')
  const mk = (seq: number, type: string, data: any) => ({ seq, type, data })
  const evs = [
    mk(1, 'user/message', { content: [{ type: 'text', text: '任务' }] }),
    mk(30, 'tool/call', { name: 'read', arguments: JSON.stringify({ file_path: target }) }),
    mk(31, 'assistant/message', { message: { content: [{ type: 'text', text: '完成' }] } }),
  ]
  const r = extractReviewInput({ header: { cwd: fixtureRoot2 }, events: evs }, 30, 31, [])
  check('输入包：窗口内未声明、仅经 file_path 给出的 .md 必须入列（锁结构化提取）', r.artifacts.includes(target), true, 'S1-9')
  check('输入包：为该产物记录指纹（size/mtime/sha256）', typeof r.fingerprints[target], 'string', 'S0-1')
  rmSync(fixtureRoot2, { recursive: true, force: true })
}

// ---------- 报告取值：主会话 subagent-report 优先（R7 第十四轮 S1-9） ----------
// 实测：两轮完整报告以 `user/message` + source.kind='subagent-report' + senderSessionId 落在**主会话**，
// 而子会话 assistant 消息只有收尾摘要（1135 字符 vs 约 1.3 万字符）→ 原实现只读子会话，审计留痕丢失发现内容。
{
  const full = '# 审查报告\n\n## 1. 结论：**需修订**（S0 = 2）\n' + 'A'.repeat(400) + '\n## 4. S2 建议项（6 条）\n- x'
  const mkMsg = (kind: string | undefined, sender: string | undefined, text: string) => ({
    type: 'user/message',
    data: { source: kind ? { kind, senderSessionId: sender } : undefined, content: [{ type: 'text', text }] },
  })
  const parent = [
    mkMsg('subagent-report', 'session-child-1', full),
    mkMsg('subagent-report', 'session-child-2', '# 审查报告\n\n## 结论：需修订\n' + 'B'.repeat(50)),
    mkMsg('user', undefined, full),                                  // 人发的长文本不得被当报告
    mkMsg('subagent-report', 'session-child-1', '审查完成，报告已交付。\n\n## 结论：需修订'),
  ]
  check('报告取值：取主会话中该子会话的最长报告（不是收尾摘要）',
    pickReportFromParent(parent, 'child-1').includes('S2 建议项'), true, 'S1-9')
  check('报告取值：隔离其他子会话的报告', pickReportFromParent(parent, 'child-2').includes('S2 建议项'), false, 'S1-9')
  check('报告取值：无匹配子会话时返回空（交给子会话回落）', pickReportFromParent(parent, 'child-9'), '', 'S1-9')
  check('报告取值：不把用户消息当报告', pickReportFromParent([mkMsg('user', undefined, full)], 'child-1'), '', 'S1-9')
  // 报告标志须认得 "## 1. 结论"（带序号）——完整报告正是这种标题，早先的 /##\s*结论/ 会漏
  check('报告标志：认得带序号的结论标题（## 1. 结论）', pickReport([{ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: full }] } } }]).includes('S2 建议项'), true, 'S1-9')
}

// ---------- 生产路径断言（VERIFICATION §3.4.1-6 / R7 第十五轮 S1-7） ----------
// 构造数据只能证明"算法对构造输入成立"。本条断言取自**本仓真实产物**（仓库内已提交的 METHODOLOGY.md），
// 即"至少一条断言锚定真实运行路径"的落地；若输入包选择逻辑把真实交付物漏掉（如本轮 docs/10 被降级挤出），
// 这类断言才会响。
{
  const repoRoot0 = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
  const real = `${repoRoot0}/METHODOLOGY.md`
  const r = extractReviewInput({ header: { cwd: repoRoot0 }, events: [] }, 0, 9, [real])
  check('生产路径：真实仓库产物（METHODOLOGY.md）被收入输入包', r.artifacts.includes(real), true, 'S1-7')
  check('生产路径：真实产物被记录指纹', typeof r.fingerprints[real], 'string', 'S1-7')
}

// ---------- 产物指纹与漂移检出（R7 第四轮 S0-1） ----------
{
  const dir = mkdtempSync(join(tmpdir(), 'fp-'))
  const f = join(dir, 'a.md')
  writeFileSync(f, 'v1')
  const fp1 = fingerprint(f)
  writeFileSync(f, 'v2-changed')
  const fp2 = fingerprint(f)
  check('指纹：文件内容变化即检出（组包后改写可被判为漂移）', fp1 !== fp2 && typeof fp1 === 'string', true, 'S0-1')
  check('指纹：不存在文件返回 undefined（不抛错）', fingerprint(join(dir, 'nope.md')), undefined, 'S0-1')
  rmSync(dir, { recursive: true, force: true })
}

// ---------- 声明通道端到端（R7 第五轮 S0-1/S0-2/S0-3：修复件须以构造性反例自检） ----------
{
  const repoRoot = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
  // (a) 12 项**散文**声明（含 .ts/.py，旧实现白名单不含源码扩展名 + 200 字符截断 → 只出 2 条）
  const items = [
    `${repoRoot}/METHODOLOGY.md`, `${repoRoot}/dsh-adapter/README.md`, `${repoRoot}/dsh-adapter/analyze_session.py`,
    `${repoRoot}/dsh-adapter/univedge-l1-inject.ts`, `${repoRoot}/dsh-adapter/univedge-reviewer.ts`,
    `${repoRoot}/dsh-adapter/tests/l1-seat.ts`, `${repoRoot}/dsh-adapter/tests/l1-invariants.ts`,
    `${repoRoot}/dsh-adapter/tests/reviewer-deliverable.ts`,
    `${repoRoot}/dsh-adapter/test-results/2026-10-10-l1-seat.md`,
    `${repoRoot}/dsh-adapter/test-results/2026-10-10-l1-invariants.md`,
    `${repoRoot}/dsh-adapter/test-results/2026-10-10-reviewer-deliverable.md`,
    `${repoRoot}/knowledge/review-lessons.md`,
  ]
  const prose = `本轮交付如下，请审查：\n\n@review ${items.join('\n')}\n\n以上。`
  check('声明解析：12 项散文清单（含 .ts/.py）全部解析', extractReviewDeclarations(prose).length, 12, 'S0-1')
  check('声明解析：不再受 200 字符截断', extractReviewDeclarations(prose).includes(items[11]), true, 'S0-1')
  // R7 第七轮 S0-1/S0-2 的回归断言：确定性 + 引述不构成声明
  const quoteCase = `见 \`@review ${repoRoot}/dsh-adapter/README.md\` 的说明（引述，不是声明）`
  check('声明解析：引述真路径（代码跨度内）不构成声明', extractReviewDeclarations(quoteCase).length, 0, 'S0-2')
  const stab = [extractReviewDeclarations(quoteCase).length, extractReviewDeclarations(quoteCase).length,
                extractReviewDeclarations(quoteCase).length, extractReviewDeclarations(quoteCase).length]
  check('声明解析：同输入连续调用结果稳定（无 g 标志状态污染）', stab, [0, 0, 0, 0], 'S0-1')
  const declCase = `@review ${repoRoot}/dsh-adapter/README.md`
  check('声明解析：裸写声明稳定命中（4 次一致）',
    [1, 2, 3, 4].map(() => extractReviewDeclarations(declCase).length), [1, 1, 1, 1], 'S0-1')
  check('声明解析：纯讨论（无路径）不构成声明', extractReviewDeclarations('我们讨论了 `@review <路径>` 的语义与上限').length, 0, 'S0-1')
  check('声明解析：讨论里引述真实路径但无 @review → 不构成声明', extractReviewDeclarations(`审查报告已写入 /x/UnivEdge/run/review/INDEX.md`).length, 0, 'S0-1')
  check('声明解析：通配符不是路径', extractReviewDeclarations('@review test-results/*.md').length, 0, 'S0-1')
  // R7 第九轮（自检发现）：路径正则原用 \w，只含 [A-Za-z0-9_] → **中文文件名被静默丢弃**。
  // 本仓曾用 docs/0X-<中文>.md 命名（现已改英文），但用户项目里仍可能有非 ASCII 路径。
  check('声明解析：非 ASCII（中文）路径必须被解析', extractReviewDeclarations('@review docs/08-内核维护工作流.md').length, 1, 'S0-1')
  // R7 第九轮 S0-1 的回归断言：相对声明路径必须按 **session cwd** 解析（此前按 process.cwd()，
// 生产中 dsh 宿主进程 cwd 是 dsh checkout → 13/14 声明被静默丢弃，且 AGENTS.md 被换成外仓同名文件）。
{
  const fx = mkdtempSync(join(tmpdir(), 'cwdrel-'))
  mkdirSync(join(fx, 'dsh-adapter'), { recursive: true })
  const rel = 'dsh-adapter/x.ts'
  const abs = join(fx, rel)
  writeFileSync(abs, 'x')
  const r = extractReviewInput({ header: { cwd: fx }, events: [] }, 0, 9, [rel])
  check('声明：相对路径按 session cwd 解析（不依赖 process.cwd）', r.artifacts, [abs], 'S0-1')
  check('声明：解析成功后不再出现在 dropped', r.dropped.length, 0, 'S0-1')
  check('声明：相对路径也被记录指纹', typeof r.fingerprints[abs], 'string', 'S0-1')
  rmSync(fx, { recursive: true, force: true })
}

check('声明解析：含空格的中文路径不会被截断成子串',
    extractReviewDeclarations('@review 路径/含空格 的文件.md').includes('路径/含空格'), false, 'S0-1')

  // (b) 子代理回执来源的 @review 不触发（否则评估者报告引述 @review → 无界放大）
  const evs = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '任务' }] } },
    { seq: 2, type: 'user/message', data: { source: { kind: 'subagent-report' }, content: [{ type: 'text', text: `@review ${repoRoot}/dsh-adapter/README.md` }] } },
    { seq: 3, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: `@review ${repoRoot}/METHODOLOGY.md` }] } } },
  ]
  check('声明扫描：子代理回执内的 @review 被排除、assistant 声明保留', scanTurnDeclarations(evs, 0, 9), [`${repoRoot}/METHODOLOGY.md`], 'S0-1')

  // (c) 声明路径不截断（原 slice(0,12) 静默丢第 13 项）
  const thirteen = items.concat([`${repoRoot}/AGENTS.md`])
  const r13 = extractReviewInput({ header: { cwd: repoRoot }, events: [] }, 0, 9, thirteen)
  check('组包：13 项声明路径全部入列（不截断）', r13.artifacts.length, 13, 'S0-2')
  check('组包：未入列候选显式报告（此处为空）', r13.dropped.length, 0, 'S0-2')

  // R7 第七轮 S1-4：无声明（auto 通道）时按**最近写入**取，不再被早前任务文件占满；
  // R7 第十一轮 S2 追加**优先级**键（低优先级 = README/docs/证据产物）——名额受限时让位，
  // **未受限时照常入列**（故本 fixture 两项都在，只是顺序变了：行为定义源在前）。
  const evs3 = [
    { seq: 10, type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: `${repoRoot}/AGENTS.md` }) } },
    { seq: 900, type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: `${repoRoot}/dsh-adapter/README.md` }) } },
  ]
  const ra = extractReviewInput({ header: { cwd: repoRoot }, events: evs3 }, 800, 950, [])
  check('组包（auto 通道）：行为定义源优先于低优先级产物', ra.artifacts[0], `${repoRoot}/AGENTS.md`, 'S1-4/S2')
  check('组包（auto 通道）：名额未受限时低优先级照常入列（不因优先级被丢）', ra.artifacts.length, 2, 'S2')
  // R7 第八轮 S1-6：源码交付物与相对路径必须能进 auto 通道输入包
  const fx = mkdtempSync(join(tmpdir(), 'extfix-'))
  mkdirSync(join(fx, 'dsh-adapter/tests'), { recursive: true })
  const srcFile = join(fx, 'dsh-adapter/tests/x.ts')
  writeFileSync(srcFile, 'x')
  const evs4 = [
    { seq: 10, type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: 'dsh-adapter/tests/x.ts' }) } },
  ]
  const rsrc = extractReviewInput({ header: { cwd: fx }, events: evs4 }, 5, 20, [])
  check('输入包（auto）：相对路径的 .ts 源码能入列（原被白名单+startsWith 排除）', rsrc.artifacts.includes(srcFile), true, 'S1-6')
  rmSync(fx, { recursive: true, force: true })

  // (d) 任务描述按触发轮窗口取（原取会话首条 = L1 注入全文）
  const evs2 = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '（会话首条：L1 方法论注入全文……）' }] } },
    { seq: 50, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '本轮任务：修 L1 座位迁移与证据门，请评估交付' }] } },
  ]
  const rw = extractReviewInput({ header: { cwd: repoRoot }, events: evs2 }, 40, 60, [])
  check('组包：任务描述取自触发轮（非会话首条 L1 文本）', rw.task.startsWith('本轮任务'), true, 'S0-3')
  check('组包：任务描述来源标注为 trigger-turn', rw.taskSource, 'trigger-turn', 'S0-3')
  // R7 第九轮 S1-3：触发轮内只有短回复时，任务描述回落取最近的较长 user 消息（并标注来源）
  const evs5 = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '（会话首条：L1 方法论注入全文……）' }] } },
    { seq: 50, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '请评估 L1 证据门这一单元的交付并给出提交建议' }] } },
    { seq: 60, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '可以' }] } },
  ]
  // R7 第十轮 S1-3：回执（subagent-settled/report）不得被选为任务描述——fixture 必须包含该情形
  const evs5b = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '（会话首条：L1 方法论注入全文……）' }] } },
    { seq: 55, type: 'user/message', data: { source: { kind: 'subagent-settled' }, content: [{ type: 'text', text: 'Background subagent xyz finished and will do no further work unless you send it more.' }] } },
    { seq: 60, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '可以' }] } },
  ]
  // R7 第十一轮 S0-1：agent-instructions / plugin 注入同样不得充当"用户文本"（白名单收紧后的回归断言）
  const evs5c = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '请评估本轮交付（证据门单元）并给出提交建议' }] } },
    { seq: 55, type: 'user/message', data: { source: { kind: 'agent-instructions' }, content: [{ type: 'text', text: '<system-reminder>Updated instructions from: AGENTS.md …（2188 字符的注入）</system-reminder>' }] } },
    { seq: 56, type: 'user/message', data: { source: { kind: 'plugin' }, content: [{ type: 'text', text: '插件注入的长文本，含 --no-review 字面量，不得被当作指令' }] } },
    { seq: 60, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '可以' }] } },
  ]
  const rinj = extractReviewInput({ header: { cwd: repoRootOf(import.meta.url) }, events: evs5c }, 60, 60, [])
  check('组包：agent-instructions 注入不被选为任务描述', rinj.task.startsWith('<system-reminder>'), false, 'S0-1')
  check('组包：注入存在时回落到真实用户长消息', rinj.task, '请评估本轮交付（证据门单元）并给出提交建议', 'S0-1')
  const injEvs = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'agent-instructions' }, content: [{ type: 'text', text: '@review docs/08-kernel-maintenance-workflow.md' }] } },
    { seq: 2, type: 'user/message', data: { source: { kind: 'plugin' }, content: [{ type: 'text', text: '@review dsh-adapter/README.md' }] } },
  ]
  check('声明扫描：注入来源（agent-instructions/plugin）中的 @review 不计入', scanTurnDeclarations(injEvs, 0, 9), [], 'S0-1')

  const rsub = extractReviewInput({ header: { cwd: repoRootOf(import.meta.url) }, events: evs5b }, 60, 60, [])
  check('组包：回执不被选为任务描述（S1-3 修）', rsub.task.startsWith('Background subagent'), false, 'S1-3')
  check('组包：无可回落长消息时如实标注低信息量（trigger-turn-short）', rsub.taskSource, 'trigger-turn-short', 'S1-3')

  const rshort = extractReviewInput({ header: { cwd: repoRootOf(import.meta.url) }, events: evs5 }, 60, 60, [])
  check('组包：触发轮短回复（"可以"）→ 回落取最近长消息', rshort.task.startsWith('请评估 L1 证据门'), true, 'S1-3')
  check('组包：来源标注为 recent-user', rshort.taskSource, 'recent-user', 'S1-3')

  // (e) 漂移标注：组包后产物被改写 → 报告正文前出现机制检出标注
  const tmpRoot = mkdtempSync(join(tmpdir(), 'drift-'))
  const dfile = join(tmpRoot, 'deliverable.md')
  writeFileSync(dfile, 'v1')
  const fps = { [dfile]: fingerprint(dfile)! }
  writeFileSync(dfile, 'v2-被改写')
  persistReport(tmpRoot, { id: 'session-aaaa1111-0000-0000-0000-000000000000' }, 'session-bbbb2222-0000-0000-0000-000000000000', '报告正文', 'task', 1, 'declared', fps)
  const written = readFileSync(join(tmpRoot, 'run/review/aaaa1111/bbbb2222/review.md'), 'utf8')
  check('报告：组包后产物被改写 → 结论标失效（机制判定，2026-10-10 裁决 1 收紧）', written.includes('本轮结论已失效'), true, 'S1-4b')
  check('报告：状态行显式标注已失效', written.includes('- 状态: **已失效（窗口内产物漂移）**'), true, 'S1-4b')
  rmSync(tmpRoot, { recursive: true, force: true })
}

// ---------- 输出 ----------
const lines = [
  '# reviewer 逻辑单元测试结果（shared 模块）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`',
  '- 覆盖：触发判据（A/B 层）+ 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + INDEX 创建/追加/并发 + 共享模块单一事实来源（S1-2）+ 风暴抑制（quiet/冷却/hash/r7-）+ @review 声明通道',
  '',
  '| 用例 | 期望 | 实测 | 关联 |',
  '|---|---|---|---|',
  ...results,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
