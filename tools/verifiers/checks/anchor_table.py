"""NC-01 锚点对照表检查器。

输入：JSON 锚点对照表（schema 见 schemas/anchor_table.schema.json）
判定：逐判据按相对误差 vs 阈值；缺 reference → need_human。
"""
import json
from pathlib import Path

from ..interface import CheckResult, Verifier, register


@register
class AnchorTableVerifier(Verifier):
    check_id = "NC-01"
    name = "锚点对照表检查"

    def check(self, artifact: Path, ctx: dict) -> CheckResult:
        default_tol = ctx.get("default_tol", 1e-3)
        try:
            table = json.loads(artifact.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - 输入解析失败统一转 fail
            return CheckResult(self.check_id, "fail", f"对照表无法解析: {exc}")

        rows = table.get("criteria", [])
        if not rows:
            return CheckResult(self.check_id, "need_human", "对照表为空（无判据）")

        fails: list[str] = []
        need_human: list[str] = []
        details: list[dict] = []
        for row in rows:
            name = row.get("name", "?")
            tol = row.get("tolerance", default_tol)
            value, reference = row.get("value"), row.get("reference")
            if value is None or reference is None:
                need_human.append(name)
                details.append({**row, "status": "need_human"})
                continue
            rel = abs(value - reference) / max(abs(reference), 1e-300)
            ok = rel <= tol
            details.append({**row, "relative_error": rel, "status": "pass" if ok else "fail"})
            if not ok:
                fails.append(name)

        if fails:
            return CheckResult(
                self.check_id, "fail",
                f"超差判据（{len(fails)} 项）: {', '.join(fails)}",
                {"rows": details},
            )
        if need_human:
            return CheckResult(
                self.check_id, "need_human",
                f"缺参考值（{len(need_human)} 项）: {', '.join(need_human)}",
                {"rows": details},
            )
        return CheckResult(self.check_id, "pass", f"全部 {len(rows)} 项判据在阈值内", {"rows": details})
