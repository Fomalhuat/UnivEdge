/**
 * 测试用 runner：替代 headless-runner 用于验证 univedge-reviewer。
 * 主任务完成后不立即退出，轮询 run/review/<主会话前8位>/review.md（最多 6 分钟），
 * 然后打印审查报告状态并退出。
 * 零 dsh 运行时依赖（不 import dsh 包），仅用 node 内置模块。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'univedge-test-runner'
export const inject = ['agents', 'agentDefaultModel', 'sessions', 'headlessStartup']

export function apply(ctx: any): void {
  void (async () => {
    try {
      await ctx.loader?.await()
      const agents = ctx.agents
      const defaultModel = ctx.agentDefaultModel
      const sessions = ctx.sessions
      if (!agents || !defaultModel || !sessions) {
        console.error('[test-runner] 缺少核心服务')
        return exit(ctx, 1)
      }

      const selection = defaultModel.currentSelection()
      const sessionId = `session-${randomUUID()}`
      const { agent } = await agents.create({
        sessionId,
        meta: { cwd: process.cwd() },
        agentOptions: { provider: selection.provider, model: selection.model },
      })

      await agent.whenIdle()
      const task = ctx.headlessStartup?.task ?? ''
      agent.followup({
        id: randomUUID(),
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: task }],
      })
      await agent.whenIdle()
      await sessions.flush(agent.session)

      // 提取主 agent 最终回复
      let finalText = ''
      for (const ev of agent.session.events ?? []) {
        if (ev.type === 'assistant/message') {
          const content = ev.data?.message?.content ?? []
          const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
          if (txt.trim()) finalText = txt.trim()
        }
      }
      console.log('=== 主 agent 最终回复（前 600 字）===')
      console.log(finalText.slice(0, 600))

      // 轮询审查报告
      const shortId = sessionId.replace(/^session-/, '').slice(0, 8)
      const reviewDir = join(process.cwd(), 'run', 'review', shortId)
      const reviewFile = join(reviewDir, 'review.md')
      console.log(`[test-runner] 等待审查报告: ${reviewFile}`)
      let found = false
      for (let i = 0; i < 72; i += 1) {
        if (existsSync(reviewFile)) {
          found = true
          break
        }
        await new Promise((r) => setTimeout(r, 5000))
      }

      if (found) {
        const report = readFileSync(reviewFile, 'utf8')
        console.log('=== 审查报告（前 2000 字）===')
        console.log(report.slice(0, 2000))
      } else {
        console.log('=== 审查报告未在超时内生成 ===')
      }
      return exit(ctx, found ? 0 : 1)
    } catch (e) {
      console.error('[test-runner] 失败:', String(e))
      return exit(ctx, 1)
    }
  })()
}

function exit(ctx: any, code: number): void {
  const appExit = ctx.get('appExit')
  if (typeof appExit === 'function') appExit(code)
  else process.exit(code)
}
