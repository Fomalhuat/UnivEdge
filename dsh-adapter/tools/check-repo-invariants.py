#!/usr/bin/env python3
"""仓库不变量检查（R7 第十八轮 S0-1/S1-5 机械化）：
  ① 每份套件证据文件：**断言行数 == 末行 N**（"通过数"与"留档明细"必须一致）；
  ② L1 角色门：l1-baseline.json 的 l1Chars ≤ univedge-l1-inject.ts 的 L1_CHAR_LIMIT；
  ③ 负控注册表可解析且**至少一条目标在版本库内**（不带 `?`）。
退出码即判据；本脚本同时登记为 negative-controls.txt 的目标（破坏式须使其失败）。
"""
import json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
fails = []

# ① 证据自洽
ev = sorted((ROOT/'dsh-adapter/test-results').glob('2026-*-*.md'))
checked = 0
for f in ev:
    txt = f.read_text(errors='ignore')
    m = re.search(r'\*\*(\d+)/(\d+) 通过, (\d+) 失败\*\*', txt)
    if not m:
        continue
    n = int(m.group(1))
    rows = sum(1 for l in txt.splitlines() if l.startswith('| ') and not l.startswith('|---'))
    if any(l.startswith('|---') for l in txt.splitlines()):
        rows = max(0, rows - 1)          # 有表头分隔行 → 扣掉列名行；无（如 review-declare）则不扣
    if rows == 0:
        continue                          # 无表格的落盘格式（如负控门输出）不适用本项
    checked += 1
    if rows != n:
        fails.append(f'{f.name}: 断言行 {rows} 行 ≠ 末行通过数 {n}')

# ② L1 预算
try:
    base = json.loads((ROOT/'dsh-adapter/test-results/l1-baseline.json').read_text())
    src = (ROOT/'dsh-adapter/univedge-l1-inject.ts').read_text()
    limit = int(re.search(r'export const L1_CHAR_LIMIT = ([\d_]+)', src).group(1).replace('_', ''))
    if base['l1Chars'] > limit:
        fails.append(f"L1 {base['l1Chars']} > 门 {limit}")
except Exception as e:
    fails.append(f'L1 预算检查异常: {e}')

# ③ 负控注册表
reg = (ROOT/'dsh-adapter/negative-controls.txt')
if not reg.exists():
    fails.append('缺少 negative-controls.txt')
else:
    live = [l for l in reg.read_text().splitlines() if l.strip() and not l.startswith('#')]
    versioned = [l for l in live if '| ?' not in l and l.split('|')[1].strip().startswith('dsh-adapter/')]
    if not versioned:
        fails.append('负控注册表中没有版本库内目标（全部带 ? 前缀）')

# ④ R2 计数行（docs/13 Q4a；2026-10-13 用户批准）：D 只验 prompt 内含第 7 项，**产出侧无人核验**。
#    判据：晚于**最近一次 `apply called`**（进程加载插件的时刻）产出的报告，其正文必须含 `实质发现计数` 行。
#    无适用报告时**不报错**（过渡期常态）——避免在"下一次审查尚未发生"时制造假红。
#    `UNIVEDGE_COUNT_CUTOFF=<ISO|unix>` 可覆盖基准时刻；`--self-test` 用临时夹具证明本判据会响。
import os, time
def _cutoff() -> float:
    env = os.environ.get('UNIVEDGE_COUNT_CUTOFF')
    if env:
        try: return float(env)
        except ValueError: return time.mktime(time.strptime(env, '%Y-%m-%dT%H:%M:%SZ')) - time.timezone
    log = pathlib.Path(os.environ.get('UNIVEDGE_REVIEWER_LOG', '/tmp/univedge-reviewer.log'))
    best = 0.0
    if log.exists():
        for line in log.read_text(errors='ignore').splitlines()[-2000:]:
            if 'apply called' in line:
                m = re.match(r'\[(\S+?)\]', line)
                if m:
                    try: best = max(best, time.mktime(time.strptime(m.group(1)[:19], '%Y-%m-%dT%H:%M:%S')) - time.timezone)
                    except ValueError: pass
    return best

def _feature_live() -> tuple[bool, float]:
    """第 7 项是否**已在运行进程中生效**：源文件须含该项，且最近一次 apply 晚于源改动。
    否则任何报告都不可能含该行（进程仍是旧 prompt）→ 判据应**跳过**而非报红。"""
    src = ROOT/'dsh-adapter/univedge-reviewer.ts'
    if not src.exists() or '实质发现计数' not in src.read_text(errors='ignore'):
        return False, 0.0
    src_m = src.stat().st_mtime
    cut = _cutoff()
    return (cut >= src_m), max(cut, src_m)

def _check_count_line(reports_dir: pathlib.Path, cutoff: float) -> list[str]:
    out = []
    for f in sorted(reports_dir.glob('*/*/review.md')):
        if f.stat().st_mtime <= cutoff: continue
        txt = f.read_text(errors='ignore')
        if '实质发现计数' not in txt:
            try: rel = f.relative_to(ROOT)
            except ValueError: rel = f          # 自验证夹具在 /tmp，不属于仓库
            out.append(f'{rel}: 晚于最近一次 apply 的报告缺 `实质发现计数` 行（R2 第 7 项）')
    return out

if '--self-test' in sys.argv:
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        d = pathlib.Path(td) / 'a' / 'b'; d.mkdir(parents=True)
        r = d / 'review.md'
        r.write_text('无该行的报告'); r.touch()
        bad = _check_count_line(pathlib.Path(td), 0.0)
        r.write_text('实质发现计数：2（明细：S0-1、S1-3）')
        good = _check_count_line(pathlib.Path(td), 0.0)
    ok = (len(bad) == 1 and len(good) == 0)
    print(('✅' if ok else '❌') + f' ④ 自验证：缺行报告被判失败={len(bad)==1}，含行报告通过={len(good)==0}')
    sys.exit(0 if ok else 1)

live, cut = _feature_live()
if not live:
    print('R2 计数行：⏭ 跳过——第 7 项尚未在运行进程中生效（需重启 dsh；重启后本项自动生效）')
else:
    applicable = [f for f in (ROOT/'run/review').glob('*/*/review.md') if f.stat().st_mtime > cut] if (ROOT/'run/review').exists() else []
    fails += _check_count_line(ROOT/'run/review', cut)
    print(f'R2 计数行：适用报告 {len(applicable)} 份（基准＝最近一次 apply called，且晚于源改动）')

print(f'证据文件检查 {checked} 份')
if fails:
    print('❌ 不变量不成立：')
    for x in fails: print('   -', x)
    sys.exit(1)
print('✅ 仓库不变量全部成立')
