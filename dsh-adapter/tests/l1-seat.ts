/**
 * L1 座位迁移单元测试（L1 从"用户消息注入"改为"会话作用域 system prompt section"）
 *
 * 运行（在 dsh-adapter 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/l1-seat.ts
 *
 * 覆盖：
 *  - L1 内容完整性：readL1 提取 METHODOLOGY §0+§1 + review-lessons 基层（关键标记逐项）
 *  - section 注册行为（伪宿主，无需 dsh 运行）：名称/次序/文本 provider、幂等性、非 UnivEdge workspace 跳过、
 *    服务未就绪不误记状态、pre-step 兜底不改写 next() 决策
 *  - 静态回归守卫：源码不得再出现消息注入（agent.inject / source.kind='user'）与旧的双时机补齐逻辑
 *  - workspace 根发现：workspace 自身/子目录命中、/tmp 与 undefined 不命中
 *  - 审计留痕：注册事实写入 /tmp/univedge-l1.log（系统提示不落盘，故需独立留痕）
 */
import { readFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { name, inject, apply, readL1, findUnivEdgeRoot, L1_SECTION_NAME, L1_SECTION_ORDER } from '../univedge-l1-inject.ts'

let pass = 0
let fail = 0
const results: string[] = []

function check(caseName: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${caseName} | ${JSON.stringify(expected)} | ${JSON.stringify(got)} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

// 主体包进 async 函数：tsx 以 cjs 输出时不支持顶层 await。
async function main(): Promise<void> {
// 测试用的诊断日志写到临时文件（UNIVEDGE_L1_LOG 覆盖），避免污染生产审计日志 /tmp/univedge-l1.log
const diagPath = '/tmp/univedge-l1-test.log'
process.env.UNIVEDGE_L1_LOG = diagPath
try { rmSync(diagPath, { force: true }) } catch { /* 不存在即可 */ }

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(here))
const sourcePath = join(repoRoot, 'dsh-adapter', 'univedge-l1-inject.ts')
const source = readFileSync(sourcePath, 'utf8')

// ---------- 1. 导出契约（dsh 插件加载器读取的字段） ----------
check('插件名', name, 'univedge-l1-inject', '契约')
check('依赖声明含 systemPrompt', inject, ['systemPrompt'], '契约')
check('section 名', L1_SECTION_NAME, 'univedge:l1', '契约')
check('section 次序（persona 0 之后、工具 100+ 之前）', L1_SECTION_ORDER > 0 && L1_SECTION_ORDER < 100, true, '契约')
check('apply 是函数', typeof apply, 'function', '契约')

// ---------- 2. L1 内容完整性（readL1 提取） ----------
const l1 = readL1(repoRoot)
check('L1 首行为 section 标题', l1.split('\n')[0].includes('UnivEdge 方法论 L1 层'), true, '内容')
check('L1 规模 > 4000 字符（全量，非精简版）', l1.length > 4000, true, '内容')
for (const marker of ['B1', 'B2', 'B3', 'B4', 'P 流程', '启动自省', '确认纪律', '锚点原则', '任务契约', '状态机', 'claimed', '产物格式', '工具代算', '审查触发']) {
  check(`L1 含标记「${marker}」`, l1.includes(marker), true, '内容')
}

// ---------- 3. workspace 根发现 ----------
check('workspace 自身', findUnivEdgeRoot(repoRoot), repoRoot, '发现')
check('子目录向上命中', findUnivEdgeRoot(join(repoRoot, 'dsh-adapter', 'tests')), repoRoot, '发现')
check('非 UnivEdge 目录不命中', findUnivEdgeRoot('/tmp'), undefined, '发现')
check('cwd 缺失不命中', findUnivEdgeRoot(undefined), undefined, '发现')

// ---------- 4. section 注册行为（伪宿主） ----------
interface Captured {
  name: string
  order: number
  text: string | ((context: unknown) => string)
}
const handlers: Record<string, (...args: any[]) => any> = {}
const fakeCtx: any = { on: (event: string, handler: (...args: any[]) => any) => { handlers[event] = handler } }
apply(fakeCtx)
check('注册 session-start 处理器', typeof handlers['agent/session-start'], 'function', '接口')
check('注册 pre-step 兜底处理器', typeof handlers['agent/pre-step'], 'function', '接口')

const captured: Captured[] = []
const injectCalls: string[][] = []
const makeScope = () => ({ systemPrompt: { section: (cfg: Captured) => { captured.push(cfg); return () => {} } } })
const makeAgent = (cwd: string, id: string, withScope = true): any => ({
  session: { header: { cwd, id } },
  ctx: withScope
    ? { inject: (deps: string[], cb: (scope: unknown) => void) => { injectCalls.push(deps); cb(makeScope()) } }
    : {},
})

const a1 = makeAgent(repoRoot, 'session-test-0001')
handlers['agent/session-start']({ agent: a1 })
check('session-start 注册 1 个 section', captured.length, 1, '注册')
check('section 名（agent 作用域）', captured[0]?.name, 'univedge:l1', '注册')
check('section 次序', captured[0]?.order, 10, '注册')
check('text 为 provider（每请求求值，与源同步）', typeof captured[0]?.text, 'function', '注册')
const rendered = typeof captured[0]?.text === 'function' ? (captured[0].text as (c: unknown) => string)({}) : ''
check('provider 返回全量 L1', rendered.length > 4000 && rendered.includes('B1'), true, '注册')

handlers['agent/session-start']({ agent: a1 })
check('重复 session-start 不重复注册（同名会 throw）', captured.length, 1, '幂等')

const sentinel = { kind: 'enter', messages: [] }
const decision = await handlers['agent/pre-step']({ agent: a1 }, () => sentinel)
check('pre-step 不改写 next() 决策', decision, sentinel, '兜底')
check('pre-step 对已注册 agent 不重复注册', captured.length, 1, '幂等')

const a2 = makeAgent('/tmp', 'session-test-0002')
handlers['agent/session-start']({ agent: a2 })
handlers['agent/pre-step']({ agent: a2 }, () => sentinel)
check('非 UnivEdge workspace 不注册（且不干扰用户）', captured.length, 1, '隔离')

const a3 = makeAgent(repoRoot, 'session-test-0003', false)
handlers['agent/session-start']({ agent: a3 })
check('作用域不可用时不注册', captured.length, 1, '时序')
check('作用域不可用时不误记状态（未调用 inject）', injectCalls.length, 1, '时序')
a3.ctx.inject = (deps: string[], cb: (scope: unknown) => void) => { injectCalls.push(deps); cb(makeScope()) }
handlers['agent/pre-step']({ agent: a3 }, () => sentinel)
check('作用域就绪后兜底补注册', captured.length, 2, '时序')
check('按 dsh 惯用法声明依赖（agent.ctx.inject）', injectCalls[1], ['systemPrompt'], '时序')

// ---------- 5. 审计留痕（系统提示不落盘 → 需独立日志） ----------
const diagText = existsSync(diagPath) ? readFileSync(diagPath, 'utf8') : ''
check('注册事实写入诊断日志（含 session id）', diagText.includes('session=session-test-0001'), true, '审计')
check('注册事实写入诊断日志（含 workspace 根）', diagText.includes(`workspace=${repoRoot}`), true, '审计')

// ---------- 6. 静态回归守卫 ----------
check('源码不再注入消息（agent.inject）', source.includes('agent.inject('), false, '回归')
check('源码不再出现用户消息身份（kind: user）', /kind:\s*'user'/.test(source), false, '回归')
check('旧版每步补精简版逻辑已删除（readL1Brief）', source.includes('readL1Brief'), false, '回归')
check('旧版上下文扫描已删除（l1InContext）', source.includes('l1InContext'), false, '回归')
check('源码含模块级 inject 声明', source.includes("inject = ['systemPrompt']"), true, '回归')
check('源码用 in-tree 惯用法 agent.ctx.inject（避开未知属性抛错）', source.includes("agent.ctx.inject(['systemPrompt']"), true, '回归')
check('源码不直接属性访问服务（agent.ctx.systemPrompt）', source.includes('agent.ctx.systemPrompt'), false, '回归')
check('section 注册限制在 agent 作用域（非全局 ctx.systemPrompt）', /\bctx\.systemPrompt\.section\(/.test(source), false, '回归')

// ---------- 输出 ----------
const lines = [
  '# L1 座位迁移单元测试结果（用户消息注入 → 系统提示 section）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`<dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/l1-seat.ts`',
  '- 覆盖：导出契约 + L1 内容完整性 + workspace 根发现 + section 注册行为（伪宿主，无需 dsh 运行）+ 审计留痕 + 静态回归守卫',
  '- 边界说明：本测试用伪宿主验证插件自身的注册逻辑；**宿主集成（真实 dsh 提示组装中 L1 是否出现）需重启实例后验证**，本测试不对其作断言。',
  '',
  '| 用例 | 期望 | 实测 | 关联 |',
  '|---|---|---|---|',
  ...results,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
}

void main()
