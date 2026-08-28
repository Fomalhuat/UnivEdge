import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const name = 'univedge-l1-inject'

/**
 * 从 workspace（session cwd）向上发现 UnivEdge 根：
 * 逐级向上找含 METHODOLOGY.md 的目录；找不到返回 undefined（不注入，避免干扰其他 workspace）。
 */
function findUnivEdgeRoot(start: string | undefined): string | undefined {
  let dir = start
  for (let depth = 0; dir && depth < 16; depth += 1) {
    if (existsSync(join(dir, 'METHODOLOGY.md'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** 提取 UnivEdge L1 层：METHODOLOGY §0+§1 + review-lessons 基层（与 METHODOLOGY 加载协议 L1 一致）。 */
function readL1(root: string): string {
  const methodology = readFileSync(join(root, 'METHODOLOGY.md'), 'utf8')
  const lines = methodology.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## 0.'))
  const end = lines.findIndex((l) => l.startsWith('## 2.'))
  const l1 = start >= 0 && end > start ? lines.slice(start, end).join('\n') : ''

  const reviewLessons = readFileSync(join(root, 'knowledge/review-lessons.md'), 'utf8')
  const rlStart = reviewLessons.indexOf('## 基层')
  const rlEnd = reviewLessons.indexOf('## 新增教训流程')
  const base = rlStart >= 0 && rlEnd > rlStart ? reviewLessons.slice(rlStart, rlEnd) : ''

  return [
    '以下是你必须遵循的 UnivEdge 方法论 L1 层（每次任务开始必加载，来自 METHODOLOGY §0+§1 与 review-lessons 基层）：',
    '',
    l1,
    '',
    base,
  ].join('\n')
}

export function apply(ctx: Context): void {
  ctx.on('agent/session-start', ({ agent }) => {
    const cwd = agent.session.header.cwd
    const root = findUnivEdgeRoot(cwd)
    if (!root) return
    agent.inject({
      content: [{ type: 'text', text: readL1(root) }],
      source: { kind: 'user' },
    })
  })
}
