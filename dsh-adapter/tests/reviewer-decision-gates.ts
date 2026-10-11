/**
 * 审查机制四项裁决的实现测试（2026-10-10，依据 run/review/handoff-reviewer-overreview.md §6）
 *
 * 裁决 1 漂移即失效 / 裁决 2 同目标复用（含 --force-review）/ 裁决 4 报告全文落盘。
 * （裁决 3 auto 最小间隔为触发路径参数，其判据由 `AUTO_MIN_GAP_MIN` 常量承载，见源码注释与账本 §2.1 R3。）
 *
 * 运行（在 dsh-adapter 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-decision-gates.ts
 */
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sameReviewTarget, persistReport, appendReuseRecord, fingerprint } from '../univedge-reviewer'
import { hasForceDirective, transcriptOf, reviewIndexPath } from '../reviewer-shared'

let pass = 0
let fail = 0
const results: string[] = []

function check(name: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${name} | ${expected} | ${got} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

// ---------- 裁决 2a：--force-review / review:force 指令识别 ----------
check('--force-review 识别', hasForceDirective('产物已更新，请 --force-review 重审'), true, '裁决2')
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
console.log(`\n**${pass}/${pass + fail} 通过, ${fail} 失败**`)
if (fail > 0) process.exit(1)
