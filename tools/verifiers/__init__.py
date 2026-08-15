"""UnivEdge 验证器包。导入 checks 触发注册。"""
from .interface import CheckResult, Verifier, get_verifier, register, run_all, run_verifiers
from . import checks  # noqa: F401  # 副作用：注册全部检查项

__all__ = [
    "CheckResult",
    "Verifier",
    "register",
    "get_verifier",
    "run_verifiers",
    "run_all",
]
