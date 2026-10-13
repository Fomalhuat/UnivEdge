#!/usr/bin/env python3
"""把 `knowledge/work-types.md` 的计数快照导出到**受版本控制**的路径（docs/13 提案 Q4b，2026-10-13 用户批准）。

动机：该文件在 `.gitignore` 内（领域资产），而 R2 的毕业计数数据（审查次数 / 实质发现数）全落在它的
§2 表 → **干净检出无法审计毕业判定**。本脚本产出 `docs/audit/work-types-counts-snapshot.md`：
带**生成时间**与**源文件 sha256**，读者可知快照的新鲜度；源文件更新后重跑本脚本即可。
"""
import hashlib, pathlib, re, sys, datetime

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'knowledge/work-types.md'
OUT = ROOT / 'docs/audit/work-types-counts-snapshot.md'

def main() -> int:
    if not SRC.exists():
        print(f'❌ 源文件不存在：{SRC}'); return 1
    txt = SRC.read_text(encoding='utf-8')
    sha = hashlib.sha256(txt.encode()).hexdigest()[:16]
    # 抽取所有表格行（§2 状态表 / §3 漏审登记 / §5 判断类动作登记）
    rows = [l for l in txt.splitlines() if l.startswith('|')]
    title = [l for l in txt.splitlines() if l.startswith('## ')]
    body = '\n'.join(rows)
    now = datetime.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %z')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(f'''# 工作类型计数快照（生成物，勿手改）

> **生成时间**：{now}｜**源**：`knowledge/work-types.md`（**在 .gitignore 内**）sha256[:16] = `{sha}`
> **用途**：让"capability → regression 毕业判定"的依据在**干净检出**中可审计（R2 的数据全落在源文件的 §2 表）。
> **刷新**：源文件更新后运行 `python3 dsh-adapter/tools/export-work-types-snapshot.py`。
> **边界**：本快照是**点的记录**，不是权威源；权威源仍是 `knowledge/work-types.md`（以 sha 判新鲜度）。

## 源文件的章节

{chr(10).join('- ' + t for t in title)}

## 表格快照（逐行）

{body}
''', encoding='utf-8')
    print(f'✓ 已导出快照：{OUT.relative_to(ROOT)}（源 sha256[:16]={sha}，{len(rows)} 行）')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
