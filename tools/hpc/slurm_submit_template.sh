#!/bin/bash
# ============================================================================
# UnivEdge · HPC 提交脚本模板（SLURM）
#
# 用途：把 METHODOLOGY §1.2「副作用前核对清单」做成"可强制执行"的代码——
#   提交作业前必须填全下方 CHECK_* 字段，脚本启动时自校验，
#   任一必填字段为空则拒绝提交（exit 1），从源头拦 B1/P 类错误。
#
# 用法：复制本模板为你的提交脚本，填全 CHECK_* 字段，在末尾接你的
#   sbatch 提交逻辑。未填全字段时脚本会报错并退出，不会提交。
#
# 对应规范：METHODOLOGY §1.2（副作用前核对清单）、§1.3（权限门 L2）。
# ============================================================================

# ---- 副作用前核对清单（必填，未填全拒绝提交）----
CHECK_h=""            # 步长，如 0.005
CHECK_lmax=""         # 球谐截断，如 29
CHECK_rp=""           # 粒子轨道半径，如 12
CHECK_ref=""          # 对照值/参考来源，如 PRD77 3.750227e-5
CHECK_peer=""         # 对端配置：对照实现是否用同一套参数，如 "时域 rp=12 h=0.005"
CHECK_table_range=""  # 表范围，如 [-100,800]
CHECK_gl_nodes=""     # GL 节点数，如 600

# ---- 自校验：任一必填字段为空则拒绝提交 ----
MISSING=""
[ -z "$CHECK_h" ]           && MISSING="$MISSING CHECK_h"
[ -z "$CHECK_lmax" ]        && MISSING="$MISSING CHECK_lmax"
[ -z "$CHECK_rp" ]          && MISSING="$MISSING CHECK_rp"
[ -z "$CHECK_ref" ]         && MISSING="$MISSING CHECK_ref"
[ -z "$CHECK_peer" ]        && MISSING="$MISSING CHECK_peer"
[ -z "$CHECK_table_range" ] && MISSING="$MISSING CHECK_table_range"
[ -z "$CHECK_gl_nodes" ]    && MISSING="$MISSING CHECK_gl_nodes"

if [ -n "$MISSING" ]; then
  echo "[UnivEdge 门控] 副作用前核对清单未填全，拒绝提交。"
  echo "  缺失字段:$MISSING"
  echo "  请填全上方 CHECK_* 字段后重试（见 METHODOLOGY §1.2 副作用前核对清单）。"
  exit 1
fi

echo "[UnivEdge 门控] 核对清单已填全，允许提交："
echo "  h=$CHECK_h  lmax=$CHECK_lmax  rp=$CHECK_rp  ref=$CHECK_ref"
echo "  peer=$CHECK_peer  table=$CHECK_table_range  gl=$CHECK_gl_nodes"

# ---- 在这里接你的 sbatch 提交逻辑（示例，按实际环境改）----
# sbatch --export=H="$CHECK_h",LMAX="$CHECK_lmax",RP="$CHECK_rp" your_job.slurm
