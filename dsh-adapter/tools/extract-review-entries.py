#!/usr/bin/env python3
"""从 §5.6 意见核验表**提取条目清单**（docs/13 提案 C，按 B1 方案降级）。

**为何从"自动派生计数"降级（2026-10-13 实测）**：
  C 的初版试图按口径**自动**派生"实质发现计数"（= ✅ 成立 **且** 影响结论/数据/误差预算/状态标签）。
  在真实核验表上实测**严重漏计**：6 份表 → 仅 1 条，而其中一份表自述"S0×2 成立、**S1×5 全部成立**"。
  根因：**核验表格式不统一**——S0 用 `## S0-N【…】` 小节 + `✅ 成立` 标记；
  S1/S2 用**汇总表格** + "认可 / 处置"表述（既无 `## S1-N` 小节、也无 `✅` 字面量）。
  若据该计数做 `capability → regression` 毕业判定，**漏计 = 假阴性 = 把"仍在发现真问题"的工作类型
  误判为"零发现" → 错误毕业 → 此后漏审**——比"计不出"更危险。

**降级后的职责**（只做机械上可靠的那一半）：
  **不漏条地提取**核验表中的全部 S0/S1/S2 条目（同时支持"小节"与"表格行"两种形式），
  输出清单，供**生成者逐条判定**是否计入（口径：`knowledge/work-types.md §1`）。
  即 **提取自动、判定人工**——与 `work-types.md` 已写明的"最终值由生成者核验后确定"一致。

用法：
  python3 dsh-adapter/tools/extract-review-entries.py <核验表.md> [...]
  python3 dsh-adapter/tools/extract-review-entries.py          # 无参数 = 自验证（负控用）

会响性：self-test 的 fixture **同时含两种形式**（一个 `## S0-1` 小节 + 两行汇总表格），断言提取 3 条；
破坏"表格行"分支的匹配 → 提取降为 1 条 → self-test **必须失败**（负控注册表条目据此登记）。
"""
import pathlib
import re
import sys
import tempfile

SECTION_RE = re.compile(r'^##\s*(S[0-2]\s*-\s*\d+)\s*(.*)$', re.M)
ROW_RE = re.compile(r'^S[0-2]\s*-\s*\d+$')


def extract_entries(path: pathlib.Path) -> list[tuple[str, str]]:
    """提取全部 S0/S1/S2 条目（两种形式），不判定是否计入。"""
    text = path.read_text(encoding='utf-8')
    found: dict[str, str] = {}

    # 形式 1：## S0-1【成立｜…】 小节
    for m in SECTION_RE.finditer(text):
        key = re.sub(r'\s', '', m.group(1))
        title = m.group(2).strip().strip('【】').strip()
        found.setdefault(key, title)

    # 形式 2：汇总表格行 | S1-1 | … |
    for line in text.splitlines():
        if not line.lstrip().startswith('|'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if not cells:
            continue
        key = cells[0].strip('*`')
        if not ROW_RE.match(key):
            continue
        key = re.sub(r'\s', '', key)
        if key in found:                      # 小节已抓到的不重复登记
            continue
        body = max(cells[1:], key=len, default='')
        found[key] = re.sub(r'\s+', ' ', body)[:90]
    return sorted(found.items())


def self_test() -> int:
    with tempfile.TemporaryDirectory() as d:
        f = pathlib.Path(d) / 'fixture.md'
        f.write_text(
            '## S0-1【成立｜端到端结论不成立】\n| 我的独立复现 | ✅ 成立 |\n\n'
            '| # | 意见 | 处置 |\n|---|---|---|\n'
            '| S1-1 | 声明清单遗漏某文件 | 认可（我的疏漏）|\n'
            '| S1-2 | 另一条意见 | 相应处置 |\n',
            encoding='utf-8',
        )
        entries = extract_entries(f)
    ok = len(entries) == 3          # 小节 1 条 + 表格行 2 条
    print(f'{"✅" if ok else "❌"} self-test：提取 {len(entries)} 条（期望 3）→ {[e[0] for e in entries]}')
    return 0 if ok else 1


def main() -> int:
    args = sys.argv[1:]
    if not args:
        return self_test()
    total = 0
    for a in args:
        p = pathlib.Path(a)
        if not p.exists():
            print(f'⚠ 跳过（不存在）：{p}')
            continue
        entries = extract_entries(p)
        total += len(entries)
        print(f'{p}：条目 {len(entries)}')
        for key, title in entries:
            print(f'    {key}  {title}')
    print(f'\n合计提取条目：{total}')
    print('→ 请**逐条**判定是否计入（口径 work-types.md §1：✅ 成立 且 影响结论/数据/误差预算/状态标签）；')
    print('  本脚本只保证"不漏条"，**不代为判定**——以避免核验表格式差异造成的假阴性（详见 docstring）。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
