#!/usr/bin/env python3
"""校验 review_depth fixtures 的期望档位（S0-3：证据入仓、期望成文）。"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import review_depth as rd  # noqa: E402

EXPECTED = {
    "t1_exec_fails.json": ("blocked", 0.0, False),
    "t2_negctl_silent.json": ("T1", 0.0, False),
    "t4_hc_none.json": ("T2", 1.0, True),
    "t5_hc_tautology.json": ("T1+scripts", 1.0, False),
    "t6_check_false.json": ("T2", 1.0, True),
    "t7_file_ok.json": ("T1+scripts", 1.0, False),
    "t8_file_missing.json": ("T2", 1.0, True),
    "t9_check_echo.json": ("T1+scripts", 1.0, False),
    "t10_cost_huge.json": ("T2", 1.0, True),
    "t11_cost_slurm.json": ("T2", 1.0, True),
}

def main() -> int:
    base = Path(__file__).resolve().parent / "fixtures" / "review-depth"
    fail = 0
    for name, (decision, cov, high) in EXPECTED.items():
        p = base / name
        out = rd.evaluate(json.loads(p.read_text(encoding="utf-8")), ROOT, run=True)
        got = (out["decision"], out["coverage"], out["high_cost"])
        ok = got == (decision, cov, high)
        fail += 0 if ok else 1
        print(f"[{'PASS' if ok else 'FAIL'}] {name}: got={got} expected={(decision, cov, high)}")
    return 1 if fail else 0

if __name__ == "__main__":
    sys.exit(main())
