#!/usr/bin/env python3
"""P26 自审处置门：自审发现的问题必须 fixed（附证据）或 waived（附理由），否则不得交付。

用法：
    python tools/self_check_gate.py run/<task>/self-check.json --root .
    python tools/self_check_gate.py --selftest

规则：
  R1 findings 为非空数组；
  R2 每条 disposition ∈ {fixed, waived}（open/缺失 → 失败）；
  R3 fixed 须带证据：file:<存在路径> / commit:<sha> / test:<命令或结果>；
  R4 waived 须带非空 reason。
退出码：0 = 可交付；1 = 有未处置项；2 = 输入非法。
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

def evaluate(doc: dict, root: Path) -> dict:
    errors: list[str] = []
    findings = doc.get("findings")
    if not isinstance(findings, list) or not findings:
        errors.append("R1 findings 须为非空数组")
        findings = []
    counts = {"fixed": 0, "waived": 0}
    for i, f in enumerate(findings):
        if not isinstance(f, dict):
            errors.append(f"R1 findings[{i}] 须为对象"); continue
        fid = f.get("id") or f"F{i + 1}"
        d = f.get("disposition")
        if d not in ("fixed", "waived"):
            errors.append(f"R2 {fid}: disposition={d!r} 须为 fixed/waived"); continue
        counts[d] += 1
        if d == "fixed":
            ev = str(f.get("evidence") or "")
            if not ev.startswith(("file:", "commit:", "test:")):
                errors.append(f"R3 {fid}: fixed 缺证据（file:/commit:/test:）")
            elif ev.startswith("file:") and not (root / ev[5:]).exists():
                errors.append(f"R3 {fid}: 证据文件不存在（{ev[5:]}）")
        else:
            if not str(f.get("reason") or "").strip():
                errors.append(f"R4 {fid}: waived 缺 reason")
    return {"ok": not errors, "errors": errors, "counts": counts}

def _selftest() -> int:
    import tempfile
    td = tempfile.TemporaryDirectory()
    Path(td.name, "evidence.md").write_text("ok\n", encoding="utf-8")
    base = {"findings": [
        {"id": "F1", "disposition": "fixed", "evidence": "file:evidence.md"},
        {"id": "F2", "disposition": "waived", "reason": "超出本单元边界，已登记后续任务"},
    ]}
    cases = {"ok": (base, "ok")}
    open_ = json.loads(json.dumps(base)); open_["findings"][0]["disposition"] = "open"
    cases["open_fails"] = (open_, "fail")
    noreason = json.loads(json.dumps(base)); noreason["findings"][1].pop("reason")
    cases["waived_without_reason_fails"] = (noreason, "fail")
    missing = json.loads(json.dumps(base)); missing["findings"][0]["evidence"] = "file:NO_SUCH.md"
    cases["fixed_missing_file_fails"] = (missing, "fail")
    passed = 0
    for name, (doc, exp) in cases.items():
        out = evaluate(doc, Path(td.name))
        got = "ok" if out["ok"] else "fail"
        good = got == exp
        passed += 1 if good else 0
        print(f"[{'PASS' if good else 'FAIL'}] {name}: expected={exp} got={got}")
    print(f"**{passed}/{len(cases)} 通过, {len(cases) - passed} 失败**")
    td.cleanup()
    return 0 if passed == len(cases) else 1

def main() -> int:
    ap = argparse.ArgumentParser(description="P26 自审处置门")
    ap.add_argument("file", nargs="?")
    ap.add_argument("--root", default=".")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        return _selftest()
    if not a.file:
        ap.error("需要 self-check.json 或 --selftest")
    try:
        doc = json.loads(Path(a.file).read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "errors": [f"无法解析: {exc}"]}, ensure_ascii=False, indent=2))
        return 2
    out = evaluate(doc, Path(a.root).resolve())
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1

if __name__ == "__main__":
    sys.exit(main())
