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

print(f'证据文件检查 {checked} 份')
if fails:
    print('❌ 不变量不成立：')
    for x in fails: print('   -', x)
    sys.exit(1)
print('✅ 仓库不变量全部成立')
