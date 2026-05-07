"""
formula_engine.py — Safe server-side arithmetic expression evaluator.

Security requirements:
- NEVER uses eval() or exec()
- Whitelist-only: digits, decimal point, +, -, *, /, (, ), spaces
- Division-by-zero guard → returns None
- Column names substituted BEFORE evaluation
- All substitutions must produce a fully numeric expression
"""

import ast
import operator
import re
from typing import Any, Dict, List, Optional, Tuple


# ── Fixed Column Definitions ─────────────────────────────────────────────────

TOWER_EXPENSES_COLUMNS = {
    # Text columns — cannot be used as formula operands
    "Date":                  {"type": "date",      "eligible": False, "table": "tower_expenses"},
    "Tower ID":              {"type": "text",      "eligible": False, "table": "tower_expenses"},
    "Tower Name":            {"type": "text",      "eligible": False, "table": "tower_expenses"},
    "City":                  {"type": "text",      "eligible": False, "table": "tower_expenses"},
    # Numeric columns — formula-eligible
    "Fuel Cost":             {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "WAPDA Cost":            {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "HR Cost":               {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Rent":                  {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Other Costs":           {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Total Capacity (KW)":   {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "KW Produced":           {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "KW Sold":               {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "Attached Tenants":      {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "Max Tenants":           {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "Total OPEX":            {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Daily Cost":            {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Monthly OPEX":          {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Capacity Utilization %":{"type": "percent",   "eligible": True,  "table": "tower_expenses"},
    "Idle Capacity (KW)":    {"type": "number",    "eligible": True,  "table": "tower_expenses"},
    "Cost per KW":           {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Tenant Utilization %":  {"type": "percent",   "eligible": True,  "table": "tower_expenses"},
    "Total Revenue":         {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Profit":                {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
    "Idle Capacity Value":   {"type": "currency",  "eligible": True,  "table": "tower_expenses"},
}

TOWER_REVENUE_COLUMNS = {
    "Date":             {"type": "date",     "eligible": False, "table": "tower_revenue"},
    "Tenant Name":      {"type": "text",     "eligible": False, "table": "tower_revenue"},
    "Tower ID":         {"type": "text",     "eligible": False, "table": "tower_revenue"},
    "KW Sold":          {"type": "number",   "eligible": True,  "table": "tower_revenue"},
    "Price per KW":     {"type": "currency", "eligible": True,  "table": "tower_revenue"},
    "Daily Revenue":    {"type": "currency", "eligible": True,  "table": "tower_revenue"},
    "Monthly Revenue":  {"type": "currency", "eligible": True,  "table": "tower_revenue"},
}

ALL_COLUMNS: Dict[str, Dict] = {**TOWER_EXPENSES_COLUMNS, **TOWER_REVENUE_COLUMNS}

# Case-insensitive lookup
ALL_COLUMNS_LOWER: Dict[str, str] = {k.lower(): k for k in ALL_COLUMNS}


# ── Template Definitions ──────────────────────────────────────────────────────

FORMULA_TEMPLATES = {
    "ratio":         {"label": "Ratio",         "pattern": "A / B",               "min_cols": 2, "output_type": "number"},
    "percentage":    {"label": "Percentage",     "pattern": "(A / B) × 100",       "min_cols": 2, "output_type": "percentage"},
    "total":         {"label": "Total (Sum)",    "pattern": "A + B + …",           "min_cols": 2, "output_type": "number"},
    "difference":    {"label": "Difference",     "pattern": "A − B",               "min_cols": 2, "output_type": "number"},
    "product":       {"label": "Product",        "pattern": "A × B",               "min_cols": 2, "output_type": "number"},
    "cost_per_unit": {"label": "Cost per Unit",  "pattern": "A / B",               "min_cols": 2, "output_type": "currency"},
    "margin":        {"label": "Margin %",       "pattern": "(A − B) / A × 100",   "min_cols": 2, "output_type": "percentage"},
    "average":       {"label": "Average",        "pattern": "(A + B + …) / Count", "min_cols": 2, "output_type": "number"},
}


# ── Expression Builder ────────────────────────────────────────────────────────

def build_expression(template: str, columns: List[str]) -> str:
    """
    Given a template name and an ordered list of column names,
    returns the arithmetic expression string with [Column Name] tokens.
    """
    n = len(columns)
    cols = [f"[{c}]" for c in columns]

    if template == "ratio":
        return f"{cols[0]} / {cols[1]}"
    elif template == "percentage":
        return f"({cols[0]} / {cols[1]}) * 100"
    elif template == "total":
        return " + ".join(cols)
    elif template == "difference":
        return f"{cols[0]} - {cols[1]}"
    elif template == "product":
        return f"{cols[0]} * {cols[1]}"
    elif template == "cost_per_unit":
        return f"{cols[0]} / {cols[1]}"
    elif template == "margin":
        return f"({cols[0]} - {cols[1]}) / {cols[0]} * 100"
    elif template == "average":
        return f"({' + '.join(cols)}) / {n}"
    else:
        raise ValueError(f"Unknown template: {template}")


# ── Validation ────────────────────────────────────────────────────────────────

def validate_columns(columns: List[str]) -> Tuple[bool, str]:
    """
    Validate that all selected columns:
    - Exist in the fixed column list (case-insensitive)
    - Are formula-eligible (not text/date)
    - Meet count constraints (2–10)
    Returns (is_valid, error_message)
    """
    if len(columns) < 2:
        return False, "Minimum 2 columns required for a formula."
    if len(columns) > 10:
        return False, "Maximum 10 columns allowed per formula."

    for col in columns:
        canonical = ALL_COLUMNS_LOWER.get(col.lower())
        if canonical is None:
            return False, f"Column '{col}' is not in the fixed column list."
        meta = ALL_COLUMNS[canonical]
        if not meta["eligible"]:
            return False, f"Column '{col}' is a text/date column and cannot be used in formulas."

    return True, ""


def validate_expression(expression: str, columns: List[str]) -> Tuple[bool, str]:
    """
    Validate that the expression string:
    - Only uses allowed [Column Name] tokens
    - Only uses whitelisted operators
    - Is parseable as arithmetic
    """
    # Extract all column tokens from expression
    token_pattern = re.compile(r'\[([^\]]+)\]')
    tokens_in_expr = token_pattern.findall(expression)

    col_lower_set = {c.lower() for c in columns}
    for token in tokens_in_expr:
        if token.lower() not in col_lower_set:
            # Also check against all known columns
            canonical = ALL_COLUMNS_LOWER.get(token.lower())
            if canonical is None:
                return False, f"Unknown column in expression: '{token}'"
            if not ALL_COLUMNS[canonical]["eligible"]:
                return False, f"Text column '{token}' cannot be used in formulas."

    # After replacing column names with dummy values, check only safe chars remain
    test_expr = token_pattern.sub("1.0", expression)
    safe_chars = re.compile(r'^[\d\s\+\-\*\/\(\)\.]+$')
    if not safe_chars.match(test_expr):
        return False, "Expression contains disallowed characters. Only +, -, *, / operators are permitted."

    # Try parsing the dummy expression
    try:
        _safe_eval(test_expr)
    except Exception as e:
        return False, f"Expression syntax error: {str(e)}"

    return True, ""


# ── Safe AST Evaluator ────────────────────────────────────────────────────────

_ALLOWED_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _safe_eval(expr: str) -> float:
    """
    Evaluate a purely numeric arithmetic expression using the AST module.
    Raises ValueError for division by zero, TypeError for invalid ops.
    NEVER calls eval() or exec().
    """
    expr = expr.strip()
    if not expr:
        raise ValueError("Empty expression")

    try:
        tree = ast.parse(expr, mode='eval')
    except SyntaxError as e:
        raise ValueError(f"Syntax error: {e}")

    return _eval_node(tree.body)


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return float(node.value)
        raise TypeError(f"Unsupported constant type: {type(node.value)}")

    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _ALLOWED_OPS:
            raise TypeError(f"Unsupported operator: {op_type.__name__}")
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        if op_type == ast.Div and right == 0.0:
            raise ZeroDivisionError("Division by zero")
        return _ALLOWED_OPS[op_type](left, right)

    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _ALLOWED_OPS:
            raise TypeError(f"Unsupported unary operator: {op_type.__name__}")
        return _ALLOWED_OPS[op_type](_eval_node(node.operand))

    else:
        raise TypeError(f"Unsupported AST node: {type(node).__name__}")


# ── Expression Evaluator Against Data Row ────────────────────────────────────

def evaluate_expression(expression: str, data_row: Dict[str, Any]) -> Optional[float]:
    """
    Substitute [Column Name] tokens in expression with actual values from data_row,
    then evaluate the resulting numeric expression safely.
    
    Returns:
        float if successful
        None if any column value is missing or non-numeric, or division by zero
    """
    token_pattern = re.compile(r'\[([^\]]+)\]')
    tokens = token_pattern.findall(expression)

    substituted = expression

    for token in tokens:
        # Case-insensitive lookup in data_row
        value = None
        for key, val in data_row.items():
            if key.lower() == token.lower():
                value = val
                break

        if value is None:
            return None  # Column not found in data

        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None  # Non-numeric value

        # Replace [Token] with numeric value, escaping special regex chars
        escaped_token = re.escape(f"[{token}]")
        substituted = re.sub(escaped_token, str(numeric), substituted)

    # Final safety check — should only be digits and operators now
    safe_chars = re.compile(r'^[\d\s\+\-\*\/\(\)\.]+$')
    if not safe_chars.match(substituted):
        return None

    try:
        result = _safe_eval(substituted)
        return round(result, 4)
    except ZeroDivisionError:
        return None
    except Exception:
        return None


# ── Batch Evaluator ───────────────────────────────────────────────────────────

def evaluate_formula_on_dataset(
    expression: str,
    data_rows: List[Dict[str, Any]],
    output_type: str = "number"
) -> Dict[str, Any]:
    """
    Evaluate a formula expression across multiple data rows.
    Returns aggregate stats: avg, min, max, latest, row_results.
    """
    results = []
    for row in data_rows:
        val = evaluate_expression(expression, row)
        results.append(val)

    numeric_results = [r for r in results if r is not None]

    if not numeric_results:
        return {
            "result": None,
            "formatted": "N/A",
            "row_count": len(data_rows),
            "valid_count": 0,
            "avg": None,
            "min": None,
            "max": None,
        }

    avg = round(sum(numeric_results) / len(numeric_results), 2)
    minimum = round(min(numeric_results), 2)
    maximum = round(max(numeric_results), 2)
    latest = numeric_results[-1]

    # Format result based on output type
    if output_type == "percentage":
        formatted = f"{avg:.1f}%"
    elif output_type == "currency":
        formatted = f"PKR {avg:,.0f}"
    else:
        formatted = f"{avg:,.2f}"

    return {
        "result": avg,
        "formatted": formatted,
        "row_count": len(data_rows),
        "valid_count": len(numeric_results),
        "avg": avg,
        "min": minimum,
        "max": maximum,
        "latest": latest,
    }
