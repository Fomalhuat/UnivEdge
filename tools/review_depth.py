#!/usr/bin/env python3
"""审查深度判定器（P14）：把"判据可得性"与"高代价"变成可执行的检查。

v0.17（2026-10-19）：负控必须**执行**（--run），未执行只能给 T1（declared）；
高代价 false 须给可核证据（check:/file:/basis:），`none` 视为未知→按高代价。

用法：
    python tools/review_depth.py run/<task>/review-depth.json --root . --run
    python tools/review_depth.py --selftest        # 内置正/负控（不触碰仓库文件）

输入（JSON）：
{
  "task": "...", "artifact_id": "...",
  "critical_steps": ["S1","S2"],
  "criteria": [{
      "step":"S1", "criterion":"...", "anchor_id":"bench:x",
      "anchor_source":"arxiv:0803.0439 eq.(12)", "tolerance":"rel<=1e-3",
      "judge_mode":"script",
      "exec_cmd":"python3 checks/x.py", "negative_control_cmd":"python3 checks/x.py --negctl",
      "last_result":"pass", "negative_control_result":"fail"
  }],
  "high_cost": {
      "irreversible_action": {"value": false, "evidence": "check:..."},
      "downstream_amplification": {"value": false, "evidence": "basis:docs-only"},
      ...
      "cost_threshold": {"est_wall_min":5,"est_gpu_hours":0,"batch_runs":1,"source":"none"}
  }
}

规则：
  R1 结构齐全；R2 行完整；R3 锚点可解析（arxiv:/doi:/file:/bench:/claim:）
  R4 script 行有 exec_cmd；--run 时须 exit 0；未 --run 时读 last_result（declared）
  R5 负控：--run 时须有 negative_control_cmd 且 exit != 0（证明确实会响）；
     未 --run 时读 negative_control_result（declared）
  R6 人工判据须 decision_rule + 第二方确认（不计入覆盖）
  R7 覆盖 = 关键步骤中被"已执行/已声明且通过 R4+R5"的 script 行覆盖的比例
  R8 高代价：六项任一 true → high；false 须给 check:/file:/basis:（none→按高代价）；
     cost 可由 SLURM --time 解析；check: 在 --run 时执行（exit 0 才算"无高代价证据"）
  R9 判定：
     structural fail → invalid；任一 script fail → blocked
     coverage==1 且 --run 且无 basis 型高代价依据 → T1+scripts
     coverage==1 但未 --run 或含 basis → T1（declared）
     否则 high → T2；low → T1
  退出码：0=判定可用；2=无效；3=blocked
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path

DEFAULT_COST = {"est_wall_min": 30, "est_gpu_hours": 2, "batch_runs": 10}
HIGH_COST_KEYS = ["irreversible_action", "downstream_amplification", "conclusionization", "handoff", "convention_change"]
ANCHOR = [re.compile(r"^arxiv:\d{4}\.\d{4,5}"), re.compile(r"^doi:10\.\d{4,9}/\S+"),
          re.compile(r"^file:\S+"), re.compile(r"^bench:\S+"), re.compile(r"^claim:\S+")]
EVIDENCE_OK = ("check:", "file:", "basis:")


def _anchor_ok(src: str, root: Path) -> bool:
    if not any(p.match(src) for p in ANCHOR):
        return False
    return (root / src[5:]).exists() if src.startswith("file:") else True


def _run(cmd: str, root: Path, timeout: int) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, shell=True, cwd=root, timeout=timeout,
                           capture_output=True, text=True)
        return p.returncode, (p.stdout + p.stderr)[-400:]
    except Exception as exc:  # noqa: BLE001
        return 127, f"执行失败: {exc}"


def evaluate(contract: dict, root: Path, cost_cfg: dict | None = None,
             run: bool = False, timeout: int = 120) -> dict:
    cost_cfg = {**DEFAULT_COST, **(cost_cfg or {})}
    reasons: list[str] = []
    rules: dict[str, str] = {}
    missing = [k for k in ("task", "critical_steps", "criteria", "high_cost") if k not in contract]
    if missing:
        return {"decision": "invalid", "reasons": [f"R1 缺字段: {', '.join(missing)}"], "rules": {"R1": "fail"}}
    critical, rows, hc = contract["critical_steps"], contract["criteria"], contract["high_cost"]
    if not critical or not rows:
        return {"decision": "invalid", "reasons": ["R1 critical_steps/criteria 为空"], "rules": {"R1": "fail"}}
    rules["R1"] = "pass"

    structural, notes, blocked, covered = [], [], [], set()
    for i, row in enumerate(rows):
        tag = row.get("step", f"row{i}")
        miss = [k for k in ("step", "criterion", "anchor_id", "anchor_source", "tolerance", "judge_mode") if not row.get(k)]
        if miss:
            structural.append(f"{tag}: R2 缺 {', '.join(miss)}"); continue
        if not _anchor_ok(row["anchor_source"], root):
            structural.append(f"{tag}: R3 锚点不可解析（{row['anchor_source']}）"); continue
        mode = row["judge_mode"]
        if mode == "script":
            if not row.get("exec_cmd"):
                structural.append(f"{tag}: R4 缺 exec_cmd"); continue
            if run:
                rc, out = _run(row["exec_cmd"], root, timeout)
                if rc != 0:
                    blocked.append(tag); notes.append(f"{tag}: exec_cmd exit={rc} {out[:120]}")
                    continue
                if not row.get("negative_control_cmd"):
                    notes.append(f"{tag}: R5 缺 negative_control_cmd → 不计入覆盖"); continue
                nrc, nout = _run(row["negative_control_cmd"], root, timeout)
                if nrc == 0:
                    notes.append(f"{tag}: R5 负控未失败（exit 0）→ 会不响，不计入覆盖"); continue
                covered.add(tag)
            else:
                if row.get("last_result") not in ("pass", "fail"):
                    notes.append(f"{tag}: R4 declared 未执行（last_result={row.get('last_result')!r}）→ 不计入覆盖"); continue
                if row.get("negative_control_result") != "fail":
                    notes.append(f"{tag}: R5 declared 负控未证伪 → 不计入覆盖"); continue
                if row["last_result"] == "fail":
                    blocked.append(tag); continue
                covered.add(tag)
        elif mode == "human":
            if not row.get("decision_rule") or not row.get("human_confirmed_by"):
                notes.append(f"{tag}: R6 人工判据缺 decision_rule/第二方确认 → 不计入覆盖")
        else:
            structural.append(f"{tag}: judge_mode 非法（{mode!r}）")
    rules["R2-R6"] = "pass" if not structural else "fail"

    coverage = len([s for s in critical if s in covered]) / len(critical)
    rules["R7"] = f"coverage={coverage:.2f}"

    high, hc_notes, hc_declared = False, [], False
    for k in HIGH_COST_KEYS:
        item = hc.get(k)
        if not isinstance(item, dict):
            high = True; hc_notes.append(f"{k}=缺失/非法→按高代价"); continue
        v, ev = item.get("value"), item.get("evidence")
        if v is None or not ev:
            high = True; hc_notes.append(f"{k}=未知/无证据→按高代价"); continue
        if v is True:
            high = True; hc_notes.append(f"{k}=true（{ev}）"); continue
        if not str(ev).startswith(EVIDENCE_OK):
            high = True; hc_notes.append(f"{k}=false 但证据不可核（{ev}）→按高代价"); continue
        if str(ev).startswith("check:"):
            if run:
                rc, out = _run(str(ev)[6:], root, timeout)
                if rc != 0:
                    high = True; hc_notes.append(f"{k}: check exit={rc}→按高代价"); continue
            else:
                hc_declared = True
        elif str(ev).startswith("file:"):
            if not (root / str(ev)[5:]).exists():
                high = True; hc_notes.append(f"{k}=false 但证据文件不存在→按高代价")
        else:
            hc_declared = True
    cost = hc.get("cost_threshold") or {}
    src, parsed = cost.get("source"), None
    if isinstance(src, str) and src.startswith("file:"):
        sp = root / src[5:]
        if sp.exists():
            m = re.search(r"--time[= ](\d+):(\d{2}):(\d{2})", sp.read_text(encoding="utf-8", errors="ignore"))
            parsed = int(m.group(1)) * 60 + int(m.group(2)) + int(m.group(3)) / 60 if m else None
        else:
            high = True; hc_notes.append(f"cost.source 不存在（{src}）")
    for k in ("est_wall_min", "est_gpu_hours", "batch_runs"):
        v = cost.get(k, parsed if k == "est_wall_min" else None)
        if v is None:
            high = True; hc_notes.append(f"cost.{k}=未知→按高代价")
        elif float(v) > float(cost_cfg[k]):
            high = True; hc_notes.append(f"cost.{k}={v}>{cost_cfg[k]}")
    if parsed is not None:
        hc_notes.append(f"cost.est_wall_min 由 SLURM --time 解析={parsed:.0f}min")
    rules["R8"] = "high" if high else ("low(declared)" if hc_declared else "low")

    if structural:
        decision = "invalid"; reasons.extend(structural)
    elif blocked:
        decision = "blocked"; reasons.append(f"R9 脚本判据失败: {', '.join(blocked)}")
    elif coverage == 1.0 and run and not hc_declared:
        decision = "T1+scripts"; reasons.append("R9 关键步骤脚本+负控均已执行且高代价证据可核 → T1+脚本")
    elif coverage == 1.0:
        decision = "T1"; reasons.append("R9 覆盖 1.0 但存在 declared（未 --run 或高代价用 basis）→ 最高 T1")
    elif high:
        decision = "T2"; reasons.append("R9 覆盖不足且高代价 → 全量重推")
    else:
        decision = "T1"; reasons.append("R9 覆盖不足但低代价 → 终态抽验（残余风险记录）")
    reasons.extend(notes)
    if high:
        reasons.append("R8 高代价依据: " + "; ".join(hc_notes))
    return {"task": contract.get("task"), "decision": decision, "mode": "run" if run else "declared",
            "coverage": round(coverage, 3), "high_cost": high,
            "reasons": reasons, "rules": rules}


def _selftest() -> int:
    base = {
        "task": "selftest", "critical_steps": ["S1", "S2"],
        "criteria": [
            {"step": "S1", "criterion": "x", "anchor_id": "bench:b", "anchor_source": "arxiv:0803.0439",
             "tolerance": "0", "judge_mode": "script", "exec_cmd": "true",
             "negative_control_cmd": "false", "last_result": "pass", "negative_control_result": "fail"},
            {"step": "S2", "criterion": "y", "anchor_id": "claim:c", "anchor_source": "claim:C-1",
             "tolerance": "0", "judge_mode": "script", "exec_cmd": "true",
             "negative_control_cmd": "false", "last_result": "pass", "negative_control_result": "fail"}],
        "high_cost": {k: {"value": False, "evidence": "check:true"} for k in HIGH_COST_KEYS} |
                      {"cost_threshold": {"est_wall_min": 5, "est_gpu_hours": 0, "batch_runs": 1, "source": "none"}},
    }
    cases = {}
    cases["ok_run_T1scripts"] = (base, True, "T1+scripts")
    cases["declared_T1"] = (base, False, "T1")
    neg = json.loads(json.dumps(base)); neg["criteria"][0]["negative_control_cmd"] = "true"
    cases["negctl_not_failing_T1"] = (neg, True, "T1")
    basis = json.loads(json.dumps(base)); basis["high_cost"]["handoff"] = {"value": False, "evidence": "basis:no handoff"}
    cases["hc_basis_T1"] = (basis, True, "T1")
    none = json.loads(json.dumps(base)); none["high_cost"].pop("handoff")
    none["criteria"][1] = {"step": "S2", "criterion": "y", "anchor_id": "claim:c", "anchor_source": "claim:C-1",
                           "tolerance": "0", "judge_mode": "human", "decision_rule": "A and B", "human_confirmed_by": "han"}
    cases["hc_missing_T2"] = (none, True, "T2")
    fail = json.loads(json.dumps(base)); fail["criteria"][0]["exec_cmd"] = "false"
    cases["exec_fail_blocked"] = (fail, True, "blocked")
    bad = json.loads(json.dumps(base)); bad["criteria"][0]["anchor_source"] = "memory"
    cases["anchor_invalid"] = (bad, True, "invalid")
    ok = True
    for name, (c, r, exp) in cases.items():
        got = evaluate(c, Path(".").resolve(), run=r)["decision"]
        good = got == exp; ok &= good
        print(f"[{'PASS' if good else 'FAIL'}] {name}: expected={exp} got={got}")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="P14 审查深度判定器")
    ap.add_argument("contract", nargs="?")
    ap.add_argument("--root", default=".")
    ap.add_argument("--run", action="store_true", help="执行 exec_cmd / negative_control_cmd（否则只读声明）")
    ap.add_argument("--timeout", type=int, default=120)
    ap.add_argument("--explain", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        return _selftest()
    if not a.contract:
        ap.error("需要 contract 路径或 --selftest")
    try:
        contract = json.loads(Path(a.contract).read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"decision": "invalid", "reasons": [f"无法解析: {exc}"]}, ensure_ascii=False, indent=2))
        return 2
    out = evaluate(contract, Path(a.root).resolve(), run=a.run, timeout=a.timeout)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    if a.explain:
        print("\n规则:", json.dumps(out.get("rules", {}), ensure_ascii=False))
    return 0 if out["decision"] in ("T1", "T1+scripts", "T2") else (3 if out["decision"] == "blocked" else 2)


if __name__ == "__main__":
    sys.exit(main())
