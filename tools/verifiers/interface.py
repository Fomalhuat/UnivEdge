"""UnivEdge 验证器接口（领域内核 · 零第三方依赖）。

每个检查项 = 一个 Verifier 子类，注册后由 check_id 定位。
约定见 VERIFICATION.md。
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

Status = Literal["pass", "fail", "need_human"]


@dataclass
class CheckResult:
    """验证结果：check_id + 三态判定 + 证据 + 附加数据。"""

    check_id: str
    status: Status
    evidence: str
    details: dict = field(default_factory=dict)


class Verifier(ABC):
    """验证器基类：只读产物、不修改，输出结构化结果。"""

    check_id: str = "unknown"
    name: str = "未命名检查"

    @abstractmethod
    def check(self, artifact: Path, ctx: dict) -> CheckResult:
        ...


_REGISTRY: dict[str, type[Verifier]] = {}


def register(cls: type[Verifier]) -> type[Verifier]:
    """注册验证器子类（按 check_id）。"""
    _REGISTRY[cls.check_id] = cls
    return cls


def get_verifier(check_id: str) -> Verifier:
    if check_id not in _REGISTRY:
        raise KeyError(f"未注册的检查项: {check_id}")
    return _REGISTRY[check_id]()


def run_verifiers(check_ids: list[str], artifact: Path, ctx: dict | None = None) -> list[CheckResult]:
    """批量运行检查项，返回结果列表（按传入顺序）。"""
    ctx = ctx or {}
    return [get_verifier(cid).check(artifact, ctx) for cid in check_ids]


def run_all(artifact: Path, ctx: dict | None = None) -> list[CheckResult]:
    """运行全部已注册检查项。"""
    ctx = ctx or {}
    return [cls().check(artifact, ctx) for cls in _REGISTRY.values()]
