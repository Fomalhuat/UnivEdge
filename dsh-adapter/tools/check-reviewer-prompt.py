#!/usr/bin/env python3
"""检查评估者 prompt 的输出格式 7 项在场（docs/13 提案 D）。

依据：`VERIFICATION §3.4.1 #6`（新机制须附"会响、且取自真实运行路径"的探针）——
R2（commit 447aa41）给评估者 prompt 加了输出格式第 7 项「实质发现计数」，
但此前**没有任何判据证明它会被输出** → 按元原则只能是 claimed。本脚本补上该判据。

判据（取自**真实运行路径**：插件源码即 prompt 的唯一构造处）：
  `dsh-adapter/univedge-reviewer.ts` 的【输出格式】段必须含 1..7 七项，且第 7 项为「实质发现计数」。

会响性（负控注册表条目）：破坏式删除第 7 项 → 本脚本**必须失败**。

用法：python3 dsh-adapter/tools/check-reviewer-prompt.py   （无参数即执行检查）
"""
import pathlib
import re
import sys

SRC = pathlib.Path(__file__).resolve().parents[1] / 'univedge-reviewer.ts'
SEG_LEN = 2000  # 【输出格式】段在源码中的近似长度上限


def main() -> int:
    if not SRC.exists():
        print(f'❌ 未找到插件源码：{SRC}')
        return 1
    text = SRC.read_text(encoding='utf-8')
    i = text.find('【输出格式】')
    if i < 0:
        print('❌ 未找到【输出格式】段（prompt 结构已变，判据需更新）')
        return 1
    seg = text[i:i + SEG_LEN]
    # 段内到数组结束（遇到 ']' 或下一个非缩进行即止，取更保守者）
    end = seg.find('\n  ]')
    if end > 0:
        seg = seg[:end]
    missing = [f'{n}.' for n in range(1, 8) if not re.search(rf"'{n}\.\s", seg)]
    if missing:
        print(f'❌ 输出格式缺项：{missing}')
        return 1
    if '实质发现计数' not in seg:
        print('❌ 第 7 项存在但不是「实质发现计数」')
        return 1
    print('✅ 输出格式 7 项在场（第 7 项 = 实质发现计数）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
