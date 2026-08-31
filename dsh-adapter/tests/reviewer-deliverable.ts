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
 */
import { isArtifactPath, textHasDeliverable, reviewOutDir, emptyOutDir, pickReport, isReviewSelfOutput } from '../reviewer-shared'

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
check('写 selfcheck 输入包：run/review-selfcheck/input.md', isArtifactPath('run/review-selfcheck/input.md'), false, 'S1-5')
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
check('r7- 存档不排除（可被审）', isReviewSelfOutput('run/review/r7-348151ae/review.md'), false, 'S1-1')

// ---------- 输出 ----------
const lines = [
  '# reviewer 逻辑单元测试结果（shared 模块）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-deliverable.ts`',
  '- 覆盖：触发判据（A/B 层）+ 缺陷 2/3/4 + S1-1/S1-4/S1-5 + S2-2 + 共享模块单一事实来源（S1-2）',
  '',
  '| 用例 | 期望 | 实测 | 关联 |',
  '|---|---|---|---|',
  ...results,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
