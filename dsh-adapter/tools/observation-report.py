#!/usr/bin/env python3
"""暂停期观察报告（实地使用 → 数据汇总；2026-10-13 用户裁决的"暂停并收集数据"）。

用途：暂停结束（或任意时刻）跑一次，得到"这段时间实际发生了什么"的可核快照——
  ① 审查轮次与通道分布  ② R2 计数行在场情况  ③ 待裁决队列增长  ④ L1 规模与余量
  ⑤ 六项检查与负控状态  ⑥ 工作类型毕业计数（从快照读）
不设门、不判定，只汇总（判定由人与评估者做）。
用法：python3 dsh-adapter/tools/observation-report.py
"""
import json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAUSE = ROOT / 'run/physics-observation/pause-start.txt'

def sh(cmd: str) -> str:
    try: return subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except Exception as e: return f'({e})'

def main() -> int:
    print('# 暂停期观察报告\n')
    print(f'- 生成时间：{sh("date -Iseconds")}')
    print(f'- HEAD：{sh("git log -1 --format='%h %ci %s'")}')
    if PAUSE.exists():
        print(f'- 暂停起点：{PAUSE.read_text().strip()}')
    else:
        print('- 暂停起点：**未记录**（建议写 `run/physics-observation/pause-start.txt`）')
    # ① 审查轮次
    idx = ROOT/'run/review/INDEX.md'
    rows = [l for l in idx.read_text().splitlines() if l.startswith('| 20')] if idx.exists() else []
    print(f'\n## ① 审查轮次：累计 {len(rows)}')
    if rows:
        print(f'- 末 3 条：')
        for r in rows[-3:]: print('  -', r[:120])
    # ② R2 计数行
    reports = sorted((ROOT/'run/review').glob('*/*/review.md'))
    with_line = [f for f in reports if '实质发现计数' in f.read_text(errors='ignore')]
    print(f'\n## ② R2 计数行：{len(with_line)}/{len(reports)} 份报告含该行')
    # ③ 待裁决队列
    pd = ROOT/'run/physics-observation/pending-decisions.md'
    q = len([l for l in pd.read_text().splitlines() if l.startswith('| 2026')]) if pd.exists() else 0
    print(f'\n## ③ 待裁决队列：{q} 条（`run/physics-observation/pending-decisions.md`）')
    # ④ L1
    try:
        b = json.loads((ROOT/'dsh-adapter/test-results/l1-baseline.json').read_text())
        src = (ROOT/'dsh-adapter/univedge-l1-inject.ts').read_text()
        lim = int(re.search(r'export const L1_CHAR_LIMIT = ([\d_]+)', src).group(1).replace('_',''))
        print(f"\n## ④ L1：{b['l1Chars']} 字符 / {b['l1Lines']} 行（门 {lim}，余量 {lim-b['l1Chars']}＝{round((lim-b['l1Chars'])/lim*100,1)}%）")
    except Exception as e:
        print(f'\n## ④ L1：读取失败 {e}')
    # ⑤ 检查状态（读最近一次证据）
    print('\n## ⑤ 上次运行检查结果（读证据文件末行）')
    for f in sorted((ROOT/'dsh-adapter/test-results').glob('2026-*-*.md')):
        last = [l for l in f.read_text(errors='ignore').splitlines() if l.strip().startswith('**')]
        if last: print(f'- {f.name}: {last[-1].strip()}')
    # ⑥ 工作类型计数快照
    snap = ROOT/'docs/audit/work-types-counts-snapshot.md'
    if snap.exists():
        m = re.search(r'生成时间\*\*：([^｜]+)', snap.read_text(errors='ignore'))
        print(f"\n## ⑥ 工作类型计数快照：{snap.relative_to(ROOT)}（生成于 {m.group(1).strip() if m else '?'}）")
    print('\n> 说明：本报告只汇总、不判定；结论由人与评估者给出（见 `run/physics-observation/protocol.md`）。')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
