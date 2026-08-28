import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { execFileSync } from 'node:child_process'

export const name = 'univedge-hpc-gate'
export const inject = ['tools']

/** 副作用前核对清单字段（对齐 METHODOLOGY §1.2 / v0.8 slurm_submit_template.sh 的 CHECK_*）。 */
const CHECK_FIELDS = [
  ['h', '步长 h'],
  ['lmax', '截断 lmax'],
  ['rp', '轨道半径 r_p'],
  ['ref', '对照值/参照来源（锚点，必填）'],
  ['peer', '对端配置（对照实现是否同一套参数，必填）'],
  ['table_range', '表范围'],
  ['gl_nodes', 'GL 节点'],
] as const

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'submit_hpc_job',
    description: '提交 HPC（SLURM）作业——UnivEdge 副作用前门控：提交前必须填全 7 个核对字段'
      + '（h / lmax / rp / ref / peer / table_range / gl_nodes），任一为空则拒绝提交。'
      + 'ref 必须给出对照值来源（锚点原则），peer 必须确认对端实现与本次使用同一套参数（防对端配置漂移）。'
      + '提交 HPC 作业请用本工具，不要直接用 bash sbatch（本工具强制核对清单）。',
    parameters: {
      script_path: { type: 'string', required: true, description: '要提交的 SLURM 脚本路径（绝对路径）' },
      h: { type: 'string', required: true, description: '步长 h（如 0.005）' },
      lmax: { type: 'string', required: true, description: '截断 lmax（如 39）' },
      rp: { type: 'string', required: true, description: '轨道半径 r_p（如 10）' },
      ref: { type: 'string', required: true, description: '对照值/参照来源（如 PRD77 Table I ∂t(10M)=1.747254e-5）' },
      peer: { type: 'string', required: true, description: '对端配置：对照实现是否与本次使用同一套参数（h/lmax/表范围等），写明核对结果' },
      table_range: { type: 'string', required: true, description: '表范围（如 t∈[0,T]，步长与层数）' },
      gl_nodes: { type: 'string', required: true, description: 'GL 节点数' },
      extra_args: { type: 'string', description: '附加 sbatch 参数（如 --partition=r2 --time=24:00:00）' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          rejected_fields: { type: 'array', items: { type: 'string' } },
          message: { type: 'string', required: true },
          sbatch_output: { type: 'string' },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: value.ok
          ? `作业已提交（sbatch ${String(args.script_path)}）：${value.message}`
          : `拒绝提交：缺失核对字段 [${(value.rejected_fields ?? []).join(', ')}]，补齐后重试。`,
      }],
    },
    async execute(args: Record<string, unknown>, _exec) {
      const missing = CHECK_FIELDS
        .filter(([key]) => !String(args[key] ?? '').trim())
        .map(([, label]) => label)
      if (missing.length > 0) {
        return {
          ok: false,
          rejected_fields: missing,
          message: `缺失核对字段: ${missing.join(', ')}（副作用前核对清单未填全，拒绝提交）`,
        }
      }
      const script = String(args.script_path)
      const extra = String(args.extra_args ?? '').trim()
      const sbatchArgs = [...(extra ? extra.split(/\s+/) : []), script]
      try {
        const out = execFileSync('sbatch', sbatchArgs, { encoding: 'utf8', timeout: 60000 })
        return {
          ok: true,
          message: `sbatch 已提交（h=${args.h}, lmax=${args.lmax}, rp=${args.rp}, ref=${args.ref}, peer=${args.peer}）`,
          sbatch_output: out.trim(),
        }
      } catch (error) {
        return { ok: false, message: `sbatch 执行失败: ${String(error)}` }
      }
    },
  }))
}
