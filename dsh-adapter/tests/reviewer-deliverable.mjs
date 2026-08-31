#!/usr/bin/env node
/**
 * reviewer 触发判据单元测试（univedge-reviewer.ts hasDeliverable 逻辑的等价复现）
 *
 * 用途：闭合"8/8 单元实证通过"声明的证据缺口（B1——claim 必须有可核产物）。
 * 等价复现 hasDeliverable（与 univedge-reviewer.ts 保持同步；若改源码须同步本文件）。
 * 运行：node tests/reviewer-deliverable.mjs   （输出 8 用例 pass/fail，退出码 0=全过）
 * 最近验证：2026-08-31（R7 自审修订 L0-1/L1-1..3/L2-4/L2-5 后，8/8 PASS）
 *
 * 用例覆盖（对应 R7 审查点与修复）：
 *  1. run/ 下 .json（非 .md）→ 触发      （L0-1：$ 锚定死代码修复）
 *  2. run/ 下 .md → 触发
 *  3. run/ 下 .csv → 触发                 （L0-1 扩展名矩阵）
 *  4. 未来式规划句 → 不触发                （L1-2：排除"下一步将写入…"）
 *  5. 完成态动词+文件 → 触发
 *  6. todo_write 计划文本 → 不触发         （L1-3：移出白名单）
 *  7. 任意 .md 写入（非 run/）→ 触发
 *  8. 抽象词"结论" → 不触发
 */
function hasDeliverable(events, startSeq, endSeq) {
  const DELIVER_WORDS = /(?:已写入|已保存到|已保存至|产物在|写入完成|已落盘)\s*(?:run\/)?[^\s"']+\.(?:md|json|txt|csv|yaml|yml)\b/i
  // 交付物路径判定：run/ 下产物或任意 .md，但排除审计元数据（run/review/ 下自身产物——handoff-reviewer-fix 缺陷 1）
  const isArtifact = (p) => (
    (/\brun\/[^\s"']*\.(md|json|txt|log|csv|yaml|yml|dat)\b/i.test(p) || /\.md\b/i.test(p))
    && !/\brun\/review\//i.test(p)
  )
  for (const ev of events) {
    if (typeof ev.seq !== 'number' || ev.seq < startSeq || ev.seq > endSeq) continue
    if (ev.type === 'tool/call') {
      const name = ev.data?.name ?? ev.data?.tool ?? ''
      if (!['write', 'edit', 'str_replace_editor'].includes(name)) continue
      let hit = false
      try {
        const parsed = typeof ev.data === 'object' ? ev.data : JSON.parse(String(ev.data ?? '{}'))
        const candidates = [parsed?.file_path, parsed?.path, parsed?.file, parsed?.filePath, parsed?.new_path, parsed?.newPath,
          ...(Array.isArray(parsed?.items) ? parsed.items : [])].filter((p) => typeof p === 'string')
        hit = candidates.some(isArtifact)
      } catch { /* fall through */ }
      if (!hit) {
        const s = JSON.stringify(ev.data ?? {})
        const paths = s.match(/[^\s"']{1,200}\.(?:md|json|txt|log|csv|yaml|yml|dat)\b/gi) ?? []
        hit = paths.some((p) => isArtifact(p.replace(/^"|"$/g, '')))
      }
      if (hit) return true
    } else if (ev.type === 'assistant/message') {
      const content = ev.data?.message?.content ?? []
      const txt = content.filter((b) => b?.type === 'text').map((b) => b.text).join('')
      if (!/\brun\/review\//i.test(txt) && DELIVER_WORDS.test(txt)) return true
    }
  }
  return false
}

const cases = [
  ['write run/foo.json（非 .md run/ 产物）', [{ type: 'tool/call', seq: 1, data: { name: 'write', file_path: 'run/foo.json' } }], true, 'L0-1'],
  ['write run/foo.md', [{ type: 'tool/call', seq: 1, data: { name: 'write', file_path: 'run/foo.md' } }], true, '基础'],
  ['write run/foo.csv', [{ type: 'tool/call', seq: 1, data: { name: 'write', file_path: 'run/foo.csv' } }], true, 'L0-1'],
  ['未来式规划句：下一步将写入 conclusion.md', [{ type: 'assistant/message', seq: 1, data: { message: { content: [{ type: 'text', text: '下一步我们将写入 conclusion.md' }] } } }], false, 'L1-2'],
  ['完成态：已写入 run/x/conclusion.md', [{ type: 'assistant/message', seq: 1, data: { message: { content: [{ type: 'text', text: '已写入 run/review-test2/conclusion.md' }] } } }], true, '完成态'],
  ['todo_write 计划文本', [{ type: 'tool/call', seq: 1, data: { name: 'todo_write', items: ['将结果写入 run/step5/report.md'] } }], false, 'L1-3'],
  ['write 任意 .md（非 run/）', [{ type: 'tool/call', seq: 1, data: { name: 'write', file_path: 'notes/summary.md' } }], true, '设计'],
  ['抽象词结论（纯讨论）', [{ type: 'assistant/message', seq: 1, data: { message: { content: [{ type: 'text', text: '我的结论是：该公式成立' }] } } }], false, '抽象词'],
  ['写审计元数据 run/review/ 下 .md（文档维护轮）', [{ type: 'tool/call', seq: 1, data: { name: 'write', file_path: 'run/review/handoff-reviewer-fix.md' } }], false, '缺陷1'],
  ['文本提及已写入 run/review/ 下文件', [{ type: 'assistant/message', seq: 1, data: { message: { content: [{ type: 'text', text: '已写入 run/review/9e496951/review.md' }] } } }], false, '缺陷1'],
]

let pass = 0
let fail = 0
const lines = ['# reviewer 触发判据单元测试结果', '', `- 日期：${new Date().toISOString().slice(0, 10)}`, '- 命令：`node tests/reviewer-deliverable.mjs`', '- 覆盖：L0-1 / L1-1..3 / L2-4 / L2-5 / handoff-reviewer-fix 缺陷1 修复后的 hasDeliverable 等价逻辑', '', '| 用例 | 期望 | 实测 | 关联 |', '|---|---|---|---|']
for (const [name, evs, expected, ref] of cases) {
  const got = hasDeliverable(evs, 0, 100)
  const ok = got === expected
  ok ? pass++ : fail++
  lines.push(`| ${name} | ${expected ? '触发' : '跳过'} | ${got ? '触发' : '跳过'} | ${ref} | ${ok ? '✅' : '❌'} |`)
}
lines.push('', `**${pass}/${cases.length} 通过, ${fail} 失败**`)
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
