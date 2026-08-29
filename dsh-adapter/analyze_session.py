#!/usr/bin/env python3
"""
UnivEdge × dsh：协议遵守率统计工具（L3-3，度量基础，4.1 验证闭环）

输入：dsh 的 session 日志（~/.dsh/sessions/<cwd编码>/session-<uuid>/session.jsonl.zstd，zstd 压缩 JSONL）
输出：协议遵守率指标表——对齐 UnivEdge 方法论的分层（L0 加载 / L1 导航与注入 / L2 契约与自省 / 工具代算 / 锚点对照）。

用法：
    python3 analyze_session.py <session.jsonl.zstd 路径>
    python3 analyze_session.py <目录>          # 自动找目录下最新 session
    python3 analyze_session.py                  # 默认扫 ~/.dsh/sessions/
    python3 analyze_session.py <session> --artifacts-dir <dir>
                                               # 补充检查：读产物目录下 .md 参与 L2/锚点判定
                                               # （agent 把契约/自省/锚点写进文件而非对话文本时的修正）

指标口径（与 UnivEdge 加载协议 L0-L2 + VERIFICATION 检查项对齐）：
  - L0 入口加载：user/message 里出现 AGENTS.md 内容（agent-instructions 注入）
  - L1 强制注入：user/message 里出现"UnivEdge 方法论 L1 层"（univedge-l1-inject 标记）
  - L1 导航：read 工具调用了 knowledge/ 或 METHODOLOGY/VERIFICATION 文件
  - L2 契约：assistant 输出**或产物文件**含"任务契约/完成定义/验证标准/测试计划"
  - L2 自省：assistant 输出**或产物文件**含"启动自省/根因/B1/B2/B3/B4"（B1-B4+P 逐条内省）
  - 工具代算：tool/call 含 bash/python/sympy/mathematica 等执行工具
  - 锚点对照：web_search 或引用 DLMF/Wikipedia/文献/独立参照（含产物文件）
"""

import sys
import os
import json
import re
import glob

# ---- 解压与解析 ----

def read_session(path: str) -> list[dict]:
    """读取 session.jsonl.zstd（或 .jsonl），返回事件列表。"""
    events: list[dict] = []
    if path.endswith('.zstd'):
        import zstandard
        with open(path, 'rb') as f:
            data = zstandard.ZstdDecompressor().stream_reader(f).read()
        text = data.decode('utf-8', errors='replace')
    else:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events

def resolve_path(arg: str | None) -> str:
    """解析输入参数：文件路径 / 目录（取最新）/ 默认 ~/.dsh/sessions。"""
    if arg and os.path.isfile(arg):
        return arg
    if arg and os.path.isdir(arg):
        files = sorted(glob.glob(os.path.join(arg, '**', 'session.jsonl.zstd'), recursive=True),
                       key=os.path.getmtime)
        return files[-1] if files else arg
    # 默认：最新 session（全 ~/.dsh/sessions 递归）
    files = sorted(glob.glob(os.path.expanduser('~/.dsh/sessions/**/session.jsonl.zstd'), recursive=True),
                   key=os.path.getmtime)
    return files[-1] if files else ''

# ---- 指标提取 ----

def extract(events: list[dict], artifacts_dir: str | None = None) -> dict:
    """从事件列表提取指标所需的原始信号。"""
    read_files: set[str] = set()          # read 工具读取的文件
    tool_names: list[str] = []            # 所有工具调用名
    assistant_texts: list[str] = []       # assistant 文本输出
    user_texts: list[str] = []            # user 侧文本（含注入）
    sources: set[str] = set()             # user/message 的 source.kind
    written_md: set[str] = set()          # write/edit 类工具写入的 .md 路径

    for ev in events:
        t = ev.get('type', '')
        d = ev.get('data', {})
        if t == 'tool/call':
            name = d.get('name') or d.get('tool') or '?'
            tool_names.append(name)
            args = json.dumps(d)[:2000]
            for m in re.findall(r'[A-Za-z0-9_./\-]+\.md', args):
                if 'UnivEdge' in args or '/knowledge/' in args or 'METHODOLOGY' in args or 'VERIFICATION' in args:
                    read_files.add(m)
            # write/edit 类工具写入的产物 md
            if name in ('write', 'edit', 'str_replace_editor', 'todo_write'):
                for m in re.findall(r'"(?:file_path|path)":\s*"([^"]+\.md)"', args):
                    written_md.add(m)
        elif t == 'assistant/message':
            msg = d.get('message', {})
            content = msg.get('content', []) if isinstance(msg, dict) else []
            for b in content:
                if isinstance(b, dict) and b.get('type') == 'text':
                    assistant_texts.append(b.get('text', ''))
        elif t == 'user/message':
            content = d.get('content', [])
            src = d.get('source', {})
            if isinstance(src, dict):
                sources.add(src.get('kind', '?'))
            for b in content:
                if isinstance(b, dict) and b.get('type') == 'text':
                    user_texts.append(b.get('text', ''))

    # 产物文件内容（agent 把契约/自省/锚点写进文件时，L2/锚点判定需读文件）
    artifact_texts: list[str] = []
    artifact_paths: set[str] = set()
    if artifacts_dir and os.path.isdir(artifacts_dir):
        for f in sorted(glob.glob(os.path.join(artifacts_dir, '**', '*.md'), recursive=True)):
            try:
                with open(f, 'r', encoding='utf-8', errors='replace') as fh:
                    artifact_texts.append(fh.read())
                artifact_paths.add(f)
            except OSError:
                continue
    else:
        # 无 --artifacts-dir 时：尝试读 session 里 write 的产物 md（存在才读）
        for p in written_md:
            if os.path.isfile(p):
                try:
                    with open(p, 'r', encoding='utf-8', errors='replace') as fh:
                        artifact_texts.append(fh.read())
                    artifact_paths.add(p)
                except OSError:
                    continue

    all_ast = '\n'.join(assistant_texts)
    all_usr = '\n'.join(user_texts)
    all_art = '\n'.join(artifact_texts)
    # L2/锚点判定文本 = assistant 输出 + 产物文件（排除 user 注入文本，避免 AGENTS.md 摘要污染）
    all_prod = all_ast + '\n' + all_art

    # 指标判定。
    # 口径：L0/L1 看注入侧（user 文本）；L2 契约/自省、锚点看 agent 的实际产出
    # （assistant 输出 + 产物文件——agent 把方法论产物写进文件而非对话文本时不被漏判）。
    metrics = {
        'L0 入口加载': bool(re.search(r'AGENTS\.md|Instructions from: AGENTS', all_usr)),
        'L1 强制注入': bool(re.search(r'UnivEdge 方法论 L1 层', all_usr)),
        'L1 导航': bool(read_files),
        'L2 契约(产出)': bool(re.search(r'任务契约|contract\.md|完成定义', all_prod)),
        'L2 自省(逐条)': bool(re.search(r'启动自省|基层已加载|逐条内省|B1.*B2.*B3.*B4', all_prod, re.S)),
        '工具代算': any(n in ('bash', 'python', 'exec', 'code', 'run') or 'sympy' in all_prod.lower()
                        for n in tool_names),
        '锚点对照': bool(re.search(r'web_search|DLMF|Wikipedia|MathWorld|文献|参照值|基准|Wald|Hartle', all_prod)),
    }
    return {
        'read_files': sorted(read_files),
        'tool_names': sorted(set(tool_names)),
        'sources': sorted(sources),
        'metrics': metrics,
        'assistant_chars': len(all_ast),
        'artifact_files': sorted(artifact_paths),
        'n_events': len(events),
    }

def render(result: dict) -> str:
    """渲染指标表。"""
    lines = []
    lines.append('=== UnivEdge 协议遵守率分析 ===')
    lines.append(f'事件数: {result["n_events"]}   assistant 输出字符: {result["assistant_chars"]}')
    lines.append(f'source.kind: {", ".join(result["sources"]) or "(无)"}')
    lines.append('')
    lines.append('| 指标 | 结果 |')
    lines.append('|---|---|')
    for k, v in result['metrics'].items():
        lines.append(f'| {k} | {"✅" if v else "❌"} |')
    lines.append('')
    lines.append(f'读取的文件: {", ".join(result["read_files"]) or "(无)"}')
    lines.append(f'产物文件(纳入判定): {", ".join(result["artifact_files"]) or "(无)"}')
    lines.append(f'工具调用: {", ".join(result["tool_names"]) or "(无)"}')
    return '\n'.join(lines)

# ---- 主入口 ----

def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    artifacts_dir = None
    if '--artifacts-dir' in sys.argv:
        i = sys.argv.index('--artifacts-dir')
        if i + 1 < len(sys.argv):
            artifacts_dir = sys.argv[i + 1]
    path = resolve_path(arg)
    if not path or not os.path.isfile(path):
        print(f'未找到 session 日志: {path or arg}')
        sys.exit(1)
    events = read_session(path)
    result = extract(events, artifacts_dir)
    print(f'分析对象: {path}')
    print(render(result))

if __name__ == '__main__':
    main()
