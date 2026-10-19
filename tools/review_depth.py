#!/usr/bin/env python3
"""审查深度判定器（P14）：把"判据可得性"与"高代价"变成可执行的检查。

设计原则：**agent 不自评**。agent 只负责填契约里的两张表；本工具按固定规则判定
（规则失败即 fail/need_human，并给出理由），输出 T1 / T1+scripts / T2 / blocked。

用法：
    python tools/review_depth.py run/<task>/review-depth.json [--root .] [--explain]
    python tools/review_depth.py --selftest        # 跑内置正/负控样例

输入（JSON）：
{
  "task": "...",
  "critical_steps": ["S1", "S2"],
  "criteria": [
    {"step": "S1", "criterion": "p >= 3.5（收敛阶）", "anchor_id": "bench:rp12-dt",
     "anchor_source": "arxiv:0803.0439 eq.(12)", "tolerance": "rel <= 1e-3",
     "judge_mode": "script", "exec_cmd": "python checks/hconv.py ...",
     "last_result": "pass", "negative_control": "把 h 表末项改坏 → 必须 fail",
     "negative_control_result": "fail"},
    {"step": "S2", "criterion": "...", "judge_mode": "human",
     "decision_rule": "若 A 与 B 同时成立则 pass", "human_confirmed_by": "han"}
  ],
  "high_cost": {
    "irreversible_action": false,
    "downstream_amplification": true,   # 产物被下游引用/批量放大
    "conclusionization": false,
    "cost_threshold": {"est_wall_min": 45, "est_gpu_hours": 0, "batch_runs": 3},
    "handoff": false,
    "convention_change": false
  }
}

判定规则（全部机械）：
  R1 结构：task/critical_steps/criteria/high_cost 齐全且非空
  R2 行完整：每行须有 step/criterion/anchor_id/anchor_source/tolerance/judge_mode/negative_control
  R3 锚点可解析：anchor_source 匹配 arxiv:/doi:/file:/bench:/claim: 之一；file: 须存在
  R4 脚本已执行：judge_mode=script → exec_cmd 非空且 last_result ∈ {pass, fail}
  R5 负控会响：script 行须有 negative_control 且 negative_control_result == "fail"
  R6 人工判据须有决策规则 + 第二方确认（否则不计入覆盖）
  R7 覆盖：关键步骤中被 script 行（R4+R5 通过且 last_result=pass）覆盖的比例
  R8 高代价：任一 true → high；字段缺失/未知 → high（fail-safe）；成本超阈值 → high
  R9 判定：
       blocked（任一 script 行 fail）→ blocked
       coverage == 1.0 → T1+scripts
       high → T2
       else → T1

退出码：0=判定可用；2=契约不合法；3=blocked。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DEFAULT_COST = {"est_wall_min": 30, "est_gpu_hours": 2, "batch_runs": 10}
ANCHOR_PATTERNS = [
    re.compile(r"^arxiv:\d{4}\.\d{4,5}"),
    re.compile(r"^doi:10\.\d{4,9}/\S+"),
    re.compile(r"^file:\S+"),
    re.compile(r"^bench:\S+"),
    re.compile(r"^claim:\S+"),
]
REQUIRED_ROW = ["step", "criterion", "anchor_id", "anchor_source", "tolerance", "judge_mode", "negative_control"]
HIGH_COST_KEYS = ["irreversible_action", "downstream_amplification", "conclusionization", "handoff", "convention_change"]


def _anchor_resolves(source: str, root: Path) -> bool:
    if not any(p.match(source) for p in ANCHOR_PATTERNS):
        return False
    if source.startswith("file:"):
        return (root / source[5:]).exists()
    return True


def evaluate(contract: dict, root: Path, cost_cfg: dict | None = None) -> dict:
    cost_cfg = {**DEFAULT_COST, **(cost_cfg or {})}
    reasons: list[str] = []
    rules: dict[str, str] = {}

    # R1
    missing = [k for k in ("task", "critical_steps", "criteria", "high_cost") if k not in contract]
    if missing:
        return {"decision": "invalid", "reasons": [f"R1 缺字段: {', '.join(missing)}"], "rules": {"R1": "fail"}}
    critical = contract["critical_steps"]
    rows = contract["criteria"]
    if not critical or not rows:
        return {"decision": "invalid", "reasons": ["R1 critical_steps/criteria 为空"], "rules": {"R1": "fail"}}
    rules["R1"] = "pass"

    # R2/R3/R4/R5/R6
    structural_fail: list[str] = []
    coverage_notes: list[str] = []
    blocked: list[str] = []
    covered_steps: set[str] = set()
    for i, row in enumerate(rows):
        tag = row.get("step", f"row{i}")
        miss = [k for k in REQUIRED_ROW if not row.get(k)]
        if miss:
            structural_fail.append(f"{tag}: R2 缺 {', '.join(miss)}")
            continue
        if not _anchor_resolves(row["anchor_source"], root):
            structural_fail.append(f"{tag}: R3 锚点不可解析（{row['anchor_source']}）")
            continue
        mode = row["judge_mode"]
        if mode == "script":
            if not row.get("exec_cmd"):
                structural_fail.append(f"{tag}: R4 script 行缺 exec_cmd")
                continue
            result = row.get("last_result")
            if result not in ("pass", "fail"):
                coverage_notes.append(f"{tag}: R4 未执行（last_result={result!r}）→ 不计入覆盖")
                continue
            if row.get("negative_control_result") != "fail":
                coverage_notes.append(f"{tag}: R5 负控未证伪 → 判据会不响，不计入覆盖")
                continue
            if result == "fail":
                blocked.append(tag)
            else:
                covered_steps.add(tag)
        elif mode == "human":
            if not row.get("decision_rule") or not row.get("human_confirmed_by"):
                coverage_notes.append(f"{tag}: R6 人工判据缺 decision_rule 或第二方确认 → 不计入覆盖")
            # 人工判据不计入覆盖（诚实：没有可执行判据）
        else:
            structural_fail.append(f"{tag}: judge_mode 非法（{mode!r}）")
    rules["R2-R6"] = "pass" if not structural_fail else "fail"

    # R7
    crit = [s for s in critical]
    coverage = len([s for s in crit if s in covered_steps]) / len(crit)
    rules["R7"] = f"coverage={coverage:.2f}"

    # R8（证据绑定：无证据=未知=按高代价；成本可从 SLURM 脚本解析）
    hc = contract["high_cost"]
    high = False
    hc_reasons: list[str] = []
    for k in HIGH_COST_KEYS:
        item = hc.get(k)
        if isinstance(item, bool):          # 纯布尔=无证据 → 按未知
            high = True
            hc_reasons.append(f"{k}=无证据({item})→按高代价")
            continue
        if not isinstance(item, dict):
            high = True
            hc_reasons.append(f"{k}=缺失/格式非法→按高代价")
            continue
        v, ev = item.get("value"), item.get("evidence")
        if v is None or not ev:
            high = True
            hc_reasons.append(f"{k}=未知或缺 evidence→按高代价")
            continue
        if v is True:
            high = True
            hc_reasons.append(f"{k}=true（{ev}）")
            continue
        # v is False：证据必须可解析（否则视为未知）
        if ev.startswith("file:"):
            if not (root / ev[5:]).exists():
                high = True
                hc_reasons.append(f"{k}=false 但证据文件不存在（{ev}）→按高代价")
        elif ev not in ("none", "not_applicable"):
            high = True
            hc_reasons.append(f"{k}=false 但证据格式不可解析（{ev}）→按高代价")
    cost = hc.get("cost_threshold") or {}
    src = cost.get("source")
    parsed_wall = None
    if isinstance(src, str) and src.startswith("file:"):
        sp = root / src[5:]
        if sp.exists():
            m = re.search(r"--time[= ](\d+):(\d{2}):(\d{2})", sp.read_text(encoding="utf-8", errors="ignore"))
            if m:
                parsed_wall = int(m.group(1)) * 60 + int(m.group(2)) + int(m.group(3)) / 60
        else:
            hc_reasons.append(f"cost.source 文件不存在（{src}）→按高代价")
            high = True
    for k in ("est_wall_min", "est_gpu_hours", "batch_runs"):
        v = cost.get(k, parsed_wall if k == "est_wall_min" else None)
        if v is None:
            high = True
            hc_reasons.append(f"cost.{k}=未知→按高代价")
        elif float(v) > float(cost_cfg[k]):
            high = True
            hc_reasons.append(f"cost.{k}={v}>{cost_cfg[k]}")
    if parsed_wall is not None:
        hc_reasons.append(f"cost.est_wall_min 由 SLURM --time 解析={parsed_wall:.0f}min")
    rules["R8"] = "high" if high else "low"

    # R9
    if structural_fail:
        decision = "invalid"
        reasons.extend(structural_fail)
    elif blocked:
        decision = "blocked"
        reasons.append(f"R9 脚本判据失败: {', '.join(blocked)}")
    elif coverage == 1.0:
        decision = "T1+scripts"
        reasons.append("R9 关键步骤全部有「脚本判据+负控会响」→ 脚本覆盖，审查抽验台账")
    elif high:
        decision = "T2"
        reasons.append("R9 覆盖不足且高代价 → 全量重推")
    else:
        decision = "T1"
        reasons.append("R9 覆盖不足但低代价 → 终态抽验（残余风险记录）")
    reasons.extend(coverage_notes)
    if high:
        reasons.append("R8 高代价依据: " + "; ".join(hc_reasons))
    return {
        "task": contract.get("task"),
        "decision": decision,
        "coverage": round(coverage, 3),
        "high_cost": high,
        "reasons": reasons,
        "rules": rules,
    }


def _selftest() -> int:
    root = Path(".").resolve()
    base = {
        "task": "selftest",
        "critical_steps": ["S1", "S2"],
        "criteria": [
            {"step": "S1", "criterion": "p>=3.5", "anchor_id": "bench:b", "anchor_source": "arxiv:0803.0439 eq.(12)",
             "tolerance": "rel<=1e-3", "judge_mode": "script", "exec_cmd": "python x.py",
             "last_result": "pass", "negative_control": "破坏末项→fail", "negative_control_result": "fail"},
            {"step": "S2", "criterion": "abs<=1e-6", "anchor_id": "claim:c", "anchor_source": "claim:C-12",
             "tolerance": "abs<=1e-6", "judge_mode": "script", "exec_cmd": "python y.py",
             "last_result": "pass", "negative_control": "置零→fail", "negative_control_result": "fail"},
        ],
        "high_cost": {
            "irreversible_action": {"value": False, "evidence": "none"},
            "downstream_amplification": {"value": False, "evidence": "none"},
            "conclusionization": {"value": False, "evidence": "none"},
            "handoff": {"value": False, "evidence": "none"},
            "convention_change": {"value": False, "evidence": "none"},
            "cost_threshold": {"est_wall_min": 10, "est_gpu_hours": 0, "batch_runs": 1, "source": "none"}},
    }
    cases = {}
    cases["ok_T1scripts"] = (base, "T1+scripts")
    gap = json.loads(json.dumps(base))
    gap["criteria"][1]["judge_mode"] = "human"
    gap["criteria"][1].pop("exec_cmd", None)
    gap["criteria"][1]["decision_rule"] = "A 与 B 同时成立"
    gap["criteria"][1]["human_confirmed_by"] = "han"
    cases["gap_low_T1"] = (gap, "T1")
    gap_high = json.loads(json.dumps(gap))
    gap_high["high_cost"]["downstream_amplification"] = {"value": True, "evidence": "file:knowledge/claims.md"}
    cases["gap_high_T2"] = (gap_high, "T2")
    unexec = json.loads(json.dumps(base))
    unexec["criteria"][0]["last_result"] = None
    unexec["high_cost"]["downstream_amplification"] = {"value": True, "evidence": "file:knowledge/claims.md"}
    cases["unexecuted_T2"] = (unexec, "T2")
    neg = json.loads(json.dumps(base))
    neg["criteria"][0]["negative_control_result"] = "pass"
    cases["negcontrol_broken_T1"] = (neg, "T1")
    blocked = json.loads(json.dumps(base))
    blocked["criteria"][0]["last_result"] = "fail"
    cases["script_fail_blocked"] = (blocked, "blocked")
    missing_anchor = json.loads(json.dumps(base))
    missing_anchor["criteria"][0]["anchor_source"] = "记忆里说过"
    cases["anchor_unresolvable_invalid"] = (missing_anchor, "invalid")

    ok = True
    for name, (contract, expected) in cases.items():
        got = evaluate(contract, root)["decision"]
        status = "PASS" if got == expected else "FAIL"
        ok &= got == expected
        print(f"[{status}] {name}: expected={expected} got={got}")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="P14 审查深度判定器")
    ap.add_argument("contract", nargs="?", help="review-depth.json 路径")
    ap.add_argument("--root", default=".", help="仓库根（解析 file: 锚点）")
    ap.add_argument("--explain", action="store_true", help="打印规则明细")
    ap.add_argument("--selftest", action="store_true", help="跑内置正/负控样例")
    args = ap.parse_args()
    if args.selftest:
        return _selftest()
    if not args.contract:
        ap.error("需要 contract 路径或 --selftest")
    try:
        contract = json.loads(Path(args.contract).read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"decision": "invalid", "reasons": [f"无法解析: {exc}"]}, ensure_ascii=False, indent=2))
        return 2
    out = evaluate(contract, Path(args.root).resolve())
    print(json.dumps(out, ensure_ascii=False, indent=2))
    if args.explain:
        print("\n规则:", json.dumps(out.get("rules", {}), ensure_ascii=False))
    return 0 if out["decision"] in ("T1", "T1+scripts", "T2") else (3 if out["decision"] == "blocked" else 2)


if __name__ == "__main__":
    sys.exit(main())
