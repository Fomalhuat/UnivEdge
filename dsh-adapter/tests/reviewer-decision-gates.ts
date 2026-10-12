/**
 * 审查机制四项裁决的实现测试（2026-10-10，依据 run/review/handoff-reviewer-overreview.md §6）
 *
 * 裁决 1 漂移即失效 / 裁决 2 同目标复用（含 --force-review）/ 裁决 4 报告全文落盘。
 * （裁决 3 auto 最小间隔为触发路径参数，其判据由 `AUTO_MIN_GAP_MIN` 常量承载，见源码注释与账本 §2.1 R3。）
 *
 * 运行（在 dsh-adapter 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-decision-gates.ts
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sameReviewTarget, persistReport, appendReuseRecord, fingerprint, turnHasQuietDirective, turnHasForceDirective, hasDeliverable, artifactPathsOfTurn } from '../univedge-reviewer'
import { hasForceDirective, hasQuietDirective, isTaskOutput, transcriptOf, reviewIndexPath } from '../reviewer-shared'

let pass = 0
let fail = 0
const results: string[] = []

function check(name: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${name} | ${expected} | ${got} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

// ---------- 裁决 2a：--force-review / review:force 指令识别 ----------
// 行内引述不构成指令（R7 第十八轮）；行首独立指令仍识别
check('--force-review 识别（行首独立指令）', hasForceDirective('--force-review'), true, '裁决2/S0-fix')
check('--force-review 行内引述不识别（判别夹具）', hasForceDirective('产物已更新，请 --force-review 重审'), false, 'S0-fix')
check('review: force 识别', hasForceDirective('review: force'), true, '裁决2')
check('quiet 字面量不误判为 force', hasForceDirective('--no-review'), false, '裁决2')
check('普通讨论文本不触发', hasForceDirective('这轮审查找出了实质问题'), false, '裁决2')

// ---------- 裁决 2b：sameReviewTarget（同清单 + 同指纹）----------
const dir = mkdtempSync(join(tmpdir(), 'univedge-gates-'))
const f1 = join(dir, 'a.md')
const f2 = join(dir, 'b.md')
writeFileSync(f1, 'v1')
writeFileSync(f2, 'v1')
const fp1 = fingerprint(f1) as string
const fp2 = fingerprint(f2) as string
const prev = { paths: [f1, f2], fingerprints: { [f1]: fp1, [f2]: fp2 } }

check('同清单 + 同指纹 → 复用', sameReviewTarget([f1, f2], prev), true, '裁决2')
check('清单顺序无关（内部排序比较）', sameReviewTarget([f2, f1], prev), true, '裁决2')
writeFileSync(f2, 'v2')
check('任一产物指纹变化 → 不复用（宁审勿漏）', sameReviewTarget([f1, f2], prev), false, '裁决2')
check('清单不同 → 不复用', sameReviewTarget([f1], prev), false, '裁决2')
check('无上轮记录 → 不复用', sameReviewTarget([f1, f2], undefined), false, '裁决2')
check('清单为空 → 不复用', sameReviewTarget([], prev), false, '裁决2')
check('产物不存在（读取失败）→ 不复用', sameReviewTarget([join(dir, 'missing.md')], prev), false, '裁决2')

// ---------- 裁决 4b：transcriptOf（评估者全文提取）----------
check('transcriptOf：多消息按 seq 顺序拼接',
  transcriptOf([
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '第一段' }] } } },
    { type: 'tool/call', data: {} },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '第二段' }] } } },
  ]),
  '第一段\n\n---\n\n第二段', '裁决4')
check('transcriptOf：无可提取文本 → 空串', transcriptOf([{ type: 'user/message', data: {} }]), '', '裁决4')

// ---------- 裁决 1 + 4a：漂移失效标注 + 全文落盘 ----------
const mainId = 'session-9e496951-ad7a-464b-a2fc-b72756b4ee02'
const childId = 'session-9546ca98-4b4c-48d1-aac1-8c7e5f936f66'
const report = '## 结论：通过\n审查报告本体（单条最长消息）'

// (a) 指纹失配（构造过时指纹）→ 结论须标"已失效"
const rootA = mkdtempSync(join(tmpdir(), 'univedge-rootA-'))
const sessionA = { id: mainId, header: { cwd: rootA } }
const staleFp = { [f1]: '999B/1970-01-01T00:00:00.000Z/deadbeef0000' }
persistReport(rootA, sessionA, childId, report, 'task-x', 7, 'declared', staleFp, '评估者全文 ABC')
const repA = readFileSync(join(rootA, 'run/review/9e496951/9546ca98/review.md'), 'utf8')
check('漂移：报告头标"已失效"', repA.includes('已失效'), true, '裁决1')
check('漂移：报告头声明为机制判定', repA.includes('本轮结论已失效'), true, '裁决1')
check('漂移：报告头状态行标注', repA.includes('- 状态: **已失效（窗口内产物漂移）**'), true, '裁决1')
const idxA = readFileSync(reviewIndexPath(rootA), 'utf8')
check('漂移：索引结论带失效后缀', idxA.includes('（⚠已失效：窗口内漂移）'), true, '裁决1')
check('全文落盘：transcript.md 存在', existsSync(join(rootA, 'run/review/9e496951/9546ca98/transcript.md')), true, '裁决4')
check('全文落盘：内容正确',
  readFileSync(join(rootA, 'run/review/9e496951/9546ca98/transcript.md'), 'utf8').includes('评估者全文 ABC'), true, '裁决4')

// (b) 指纹正确 → 不标失效；transcript 缺省 → 不落盘
const rootB = mkdtempSync(join(tmpdir(), 'univedge-rootB-'))
const sessionB = { id: mainId, header: { cwd: rootB } }
persistReport(rootB, sessionB, childId, report, 'task-y', 8, 'declared', { [f1]: fingerprint(f1) as string }, undefined)
const repB = readFileSync(join(rootB, 'run/review/9e496951/9546ca98/review.md'), 'utf8')
check('无漂移：报告头不标失效', repB.includes('已失效'), false, '裁决1')
check('无漂移：索引结论不带失效后缀', readFileSync(reviewIndexPath(rootB), 'utf8').includes('⚠已失效'), false, '裁决1')
check('transcript 缺省 → 不落盘（可选参数）',
  existsSync(join(rootB, 'run/review/9e496951/9546ca98/transcript.md')), false, '裁决4')

// ---------- 裁决 2c：复用记录（复用 ≠ 静默跳过）----------
appendReuseRecord(rootB, sessionB, childId)
const idxB = readFileSync(reviewIndexPath(rootB), 'utf8')
check('复用记录：通道列标 declared-reuse', idxB.includes('| declared-reuse |'), true, '裁决2')
check('复用记录：结论标注复用来源', idxB.includes('复用 9546ca98'), true, '裁决2')
check('复用记录：报告路径指向上轮', idxB.includes('run/review/9e496951/9546ca98/review.md'), true, '裁决2')

// ---------- 清理 ----------
rmSync(dir, { recursive: true, force: true })
rmSync(rootA, { recursive: true, force: true })
rmSync(rootB, { recursive: true, force: true })

// 落盘头部由**测试自己产出**（此前提交版是人工添加的 6 行头部，测试不产出 → 永远无法复现；
// 修法：把头部移进测试，随代码一起演进。见 run/review/handoff-reviewer-overreview.md §六）
console.log('# 测试落盘：reviewer-decision-gates\n')
console.log(`- 日期：${new Date().toISOString().slice(0, 10)}`)
console.log('- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-decision-gates.ts`')
console.log('- 场景：审查四项裁决实现（漂移即失效 / 同目标复用 + --force-review / auto 最小间隔常量 / 报告全文落盘）')
console.log('- 依据：`run/review/handoff-reviewer-overreview.md` §六 待裁决 1/2/4（裁决 3 为触发路径参数，见源码 `AUTO_MIN_GAP_MIN` 注释）')
console.log('')
console.log('| 用例 | 期望 | 实际 | 依据 | 结果 |')
console.log('|---|---|---|---|---|')
for (const r of results) console.log(r)
// ---------- quiet / force 判据的可响性（R7 第十八轮）：行首独立指令 + 仅用户消息 ----------
// 判别夹具：以下 4 条在**旧实现**（裸子串匹配 + assistant 不过滤）下会得出相反结论——
// 正因如此它们"会响"：修复前会失败、修复后通过。
{
  const ev = (kind: string | undefined, text: string, type = 'user/message') => ({
    seq: 1, type, data: { source: kind ? { kind } : undefined, content: [{ type: 'text', text }] },
  })
  check('quiet：行首独立指令（用户消息）命中', hasQuietDirective('--no-review'), true, 'S0-fix')
  check('quiet：行内引述不命中（旧实现会误命中 → 会响）',
    hasQuietDirective('我在回复里写 一行 --no-review 就能抑制本轮的审查'), false, 'S0-fix')
  check('quiet：行内代码块中的字面量不命中',
    hasQuietDirective('触发条件：`review:off` 或类似指令'), false, 'S0-fix')
  check('quiet：列表项形式的行首指令命中', hasQuietDirective('- --no-review'), true, 'S0-fix')
  check('quiet：引用符后的行首指令命中', hasQuietDirective('> review:off'), true, 'S0-fix')
  check('quiet 判定：assistant 文本即使行首出现指令也**不生效**（仅用户消息可静默）',
    turnHasQuietDirective({ events: [ev(undefined, '--no-review', 'assistant/message')] }, 0, 9), false, 'S0-fix')
  check('quiet 判定：用户消息行首指令生效',
    turnHasQuietDirective({ events: [ev('user', '--no-review')] }, 0, 9), true, 'S0-fix')
  check('quiet 判定：子代理回执（注入/报告）不生效',
    turnHasQuietDirective({ events: [ev('subagent-report', '--no-review')] }, 0, 9), false, 'S0-fix')
  check('force：同上，assistant 的行首指令不生效',
    turnHasForceDirective({ events: [ev(undefined, '--force-review', 'assistant/message')] }, 0, 9), false, 'S0-fix')
  check('force：用户消息行首指令生效',
    turnHasForceDirective({ events: [ev('user', '--force-review')] }, 0, 9), true, 'S0-fix')
}


// 生产形状探针（R7 第十八轮 S0-1）：真实 tool/call = {name, callId, step, turn, arguments: <JSON 串>}，
// 路径在 arguments 里、data 层没有 file_path。旧实现在此恒返回空 → 触发判据与 hash 去重门双双是空门。
{
  const fx = mkdtempSync(join(tmpdir(), 'tc-'))
  const target = join(fx, 'run', 'task-a', 'artifact.md')
  mkdirSync(join(fx, 'run', 'task-a'), { recursive: true }); writeFileSync(target, 'x')
  const realShape = [{ seq: 1, type: 'tool/call', data: { name: 'write', callId: 'c1', step: 1, turn: 1,
    arguments: JSON.stringify({ file_path: target, content: 'x' }) } }]
  const legacyShape = [{ seq: 1, type: 'tool/call', data: { name: 'write', file_path: target } }]
  check('生产形状：hasDeliverable 认得 arguments 里的产物路径（旧实现为 false）',
    hasDeliverable({ events: realShape }, 0, 9), true, 'S0-1')
  check('生产形状：artifactPathsOfTurn 取出该路径（旧实现为 []）',
    artifactPathsOfTurn({ events: realShape }, 0, 9), [target], 'S0-1')
  check('向后兼容：旧夹具形状（参数摊在 data 上）仍可解析',
    artifactPathsOfTurn({ events: legacyShape }, 0, 9), [target], 'S0-1')
  // hash 去重门的载体：路径非空即不再恒 false（allArtifactsUnchanged 的 !paths.length 分支）
  check('生产形状：去重门的前置（路径集合）不再为空',
    artifactPathsOfTurn({ events: realShape }, 0, 9).length > 0, true, 'S0-1')
  rmSync(fx, { recursive: true, force: true })
}


// ---------- 自动通道收窄（2026-10-12 用户裁决）：只有"任务产出"触发 ----------
{
  const fx = mkdtempSync(join(tmpdir(), 'auto-'))
  for (const d of ['docs', 'run/task-a', 'run/kernel-amendment', 'run/review']) mkdirSync(join(fx, d), { recursive: true })
  const mkWrite = (path: string) => ({ events: [{ seq: 1, type: 'tool/call',
    data: { name: 'write', callId: 'c', step: 1, turn: 1, arguments: JSON.stringify({ file_path: path }) } }] })
  const docMd = join(fx, 'docs', '10-proposal.md'); writeFileSync(docMd, 'x')
  const taskMd = join(fx, 'run', 'task-a', 'findings.md'); writeFileSync(taskMd, 'x')
  const infraMd = join(fx, 'run', 'kernel-amendment', 'contract.md'); writeFileSync(infraMd, 'x')
  const selfMd = join(fx, 'run', 'review', 'INDEX.md'); writeFileSync(selfMd, 'x')
  check('收窄：写内核文档 docs/*.md → **不**触发（判别夹具）', hasDeliverable(mkWrite(docMd), 0, 9), false, 'narrow')
  check('收窄：写任务产出 run/<任务>/*.md → 触发', hasDeliverable(mkWrite(taskMd), 0, 9), true, 'narrow')
  check('收窄：写基础设施 run/kernel-amendment/*.md → 不触发', hasDeliverable(mkWrite(infraMd), 0, 9), false, 'narrow')
  check('收窄：审查自输出 run/review/*.md → 不触发', hasDeliverable(mkWrite(selfMd), 0, 9), false, 'narrow')
  check('收窄：isTaskOutput 判定与豁免清单一致',
    [isTaskOutput(taskMd), isTaskOutput(infraMd), isTaskOutput(docMd), isTaskOutput('/x/run/other-t/m.md')],
    [true, false, false, true], 'narrow')
  process.env.UNIVEDGE_REVIEW_APPARATUS_AUTO = '1'
  check('收窄：总开关打开后，装置改动恢复自动触发（逃生门）', hasDeliverable(mkWrite(docMd), 0, 9), true, 'narrow')
  delete process.env.UNIVEDGE_REVIEW_APPARATUS_AUTO
  rmSync(fx, { recursive: true, force: true })
}

console.log(`\n**${pass}/${pass + fail} 通过, ${fail} 失败**`)
if (fail > 0) process.exit(1)
