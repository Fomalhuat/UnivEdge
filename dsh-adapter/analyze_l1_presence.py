#!/usr/bin/env python3
"""L4 长会话分析：统计 dsh session 中 L1 注入消息的在场性（每步），检查 pre-step 双时机注入在长会话中的表现。

用法: python3 analyze_l1_presence.py <session.jsonl.zstd>

输出:
  - L1 注入消息（全量/精简版）的位置与总数
  - 每 step/start 之前模型上下文里是否有 L1 消息（近似在场性）
  - compaction 痕迹（若事件类型中出现相关事件）
  - 步数 / 工具调用数 / 总事件数
"""
import sys
import json


def main(path: str) -> None:
    import zstandard  # noqa: F401
    d = zstandard.ZstdDecompressor()
    with open(path, 'rb') as f:
        raw = d.stream_reader(f).read().decode('utf-8', errors='replace')

    events = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    l1_full_seqs: list[int] = []    # 全量 L1 注入的 seq
    l1_brief_seqs: list[int] = []   # 精简版 L1 注入的 seq
    step_starts: list[int] = []     # step/start 的 seq
    tool_calls = 0
    compact_events = []             # 疑似 compaction 相关事件
    user_msg_seqs: dict[int, str] = {}  # seq -> user/message 文本摘要

    for ev in events:
        t = ev.get('type', '')
        seq = ev.get('seq')
        if t == 'user/message':
            content = ev.get('data', {}).get('content', [])
            txt = ''.join(b.get('text', '') for b in content if isinstance(b, dict) and b.get('type') == 'text')
            user_msg_seqs[seq] = txt
            if 'UnivEdge 方法论 L1 层' in txt:
                l1_full_seqs.append(seq)
            elif '方法论精简版' in txt:
                l1_brief_seqs.append(seq)
        elif t == 'step/start':
            step_starts.append(seq)
        elif t == 'tool/call':
            tool_calls += 1
        if 'compact' in t.lower():
            compact_events.append((seq, t))

    print('=== L1 注入统计 ===')
    print(f'  全量 L1 注入: {len(l1_full_seqs)} 次 (seq: {l1_full_seqs[:10]})')
    print(f'  精简版注入: {len(l1_brief_seqs)} 次 (seq: {l1_brief_seqs[:10]})')
    print(f'  总步数: {len(step_starts)}, 工具调用: {tool_calls}, 总事件: {len(events)}')
    print(f'  compaction 相关事件: {compact_events if compact_events else "无"}')

    # 每步在场性：step/start 之前已出现的 user/message 中是否有 L1（近似该步模型上下文）
    print('=== 每步 L1 在场性 ===')
    l1_seqs = set(l1_full_seqs) | set(l1_brief_seqs)
    for i, s in enumerate(step_starts):
        prior = [seq for seq in user_msg_seqs if seq <= s]
        has_l1 = any(seq in l1_seqs for seq in prior)
        marker = 'L1在场' if has_l1 else 'L1缺失!'
        print(f'  step {i+1} (seq {s}): {marker}  (此步前 user/message {len(prior)} 条)')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python3 analyze_l1_presence.py <session.jsonl.zstd>')
        sys.exit(1)
    main(sys.argv[1])
