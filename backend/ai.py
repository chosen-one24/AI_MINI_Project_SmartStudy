import sys
import json
from datetime import datetime, timezone

# Ensure UTF-8 standard streams on Windows environments
if hasattr(sys.stdin, "reconfigure"):
    try:
        sys.stdin.reconfigure(encoding="utf-8")
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def parse_iso_datetime(value):
    """Safely parse an ISO date string into a UTC datetime object."""
    if not value or not isinstance(value, str):
        return None
    try:
        clean = value.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None

def urgency_score(deadline_str, now_utc):
    """
    Computes an urgency score (0.0 to 10.0), tier, relative reason,
    and overdue status based on hours remaining until deadline.
    """
    due = parse_iso_datetime(deadline_str)
    if due is None:
        return 3.0, "No deadline specified", "unknown", False, 999999.0

    hours_left = (due - now_utc).total_seconds() / 3600.0

    if hours_left < 0:
        overdue_hours = abs(hours_left)
        if overdue_hours < 24:
            reason = f"Overdue by {int(overdue_hours)}h - requires immediate catch-up"
        else:
            days = max(1, int(overdue_hours // 24))
            reason = f"Overdue by {days}d - deadline has passed"
        return 10.0, reason, "overdue", True, hours_left

    if hours_left <= 12:
        hours = max(1, int(round(hours_left)))
        return 9.5, f"Due within {hours} hour(s) today", "due_today", False, hours_left

    if hours_left <= 24:
        return 9.0, "Due within 24 hours", "due_today", False, hours_left

    if hours_left <= 72:
        days = max(1, int(round(hours_left / 24.0)))
        return 7.5, f"Due within {days} day(s)", "due_soon", False, hours_left

    if hours_left <= 168:
        days = max(1, int(round(hours_left / 24.0)))
        return 6.0, f"Due in {days} days (within a week)", "upcoming", False, hours_left

    if hours_left <= 336:
        return 4.0, "Due within 2 weeks", "upcoming", False, hours_left

    return 2.0, "Deadline is more than 2 weeks away", "flexible", False, hours_left

def safe_int(value, default=3, min_val=1, max_val=5):
    """Safely convert value to clamped int with fallback default."""
    try:
        return max(min_val, min(max_val, int(value)))
    except (ValueError, TypeError):
        return default

def safe_float(value, default=1.0, min_val=0.25, max_val=24.0):
    """Safely convert value to clamped float with fallback default."""
    try:
        return max(min_val, min(max_val, float(value)))
    except (ValueError, TypeError):
        return default

def recommend(tasks):
    """
    Heuristic-based task prioritization engine for SmartStudy.
    Evaluates:
      - Deadline urgency (50% weight, max 5.0)
      - Academic importance (30% weight, max 3.0)
      - Task difficulty / cognitive load (20% weight, max 2.0)
    Total score scale: 1.0 to 10.0
    """
    now_utc = datetime.now(timezone.utc)
    active = [t for t in tasks if not t.get("completed", False)]

    if not active:
        return {
            "recommendation": "You're all caught up! Add a study task to get a personalized recommendation.",
            "rankedTasks": [],
            "activeCount": 0,
            "overdueCount": 0,
            "totalEstimatedHours": 0.0,
            "engineInfo": "SmartStudy Heuristic Engine v2.0 (Urgency 50% + Importance 30% + Difficulty 20%)"
        }

    ranked = []
    overdue_count = 0
    total_hours = 0.0

    for task in active:
        urgency, urgency_reason, urgency_tier, is_overdue, hours_left = urgency_score(
            task.get("deadline", ""), now_utc
        )
        if is_overdue:
            overdue_count += 1

        importance = safe_int(task.get("importance"), default=3, min_val=1, max_val=5)
        difficulty = safe_int(task.get("difficulty"), default=3, min_val=1, max_val=5)
        est_hours = safe_float(task.get("estimatedHours"), default=1.0, min_val=0.25, max_val=24.0)

        total_hours += est_hours

        # Transparent heuristic evaluation formula:
        urgency_component = urgency * 0.5
        importance_component = (importance * 2.0) * 0.3
        difficulty_component = (difficulty * 2.0) * 0.2
        total_score = urgency_component + importance_component + difficulty_component

        task_out = dict(task)
        task_out["priorityScore"] = round(total_score, 2)
        task_out["isOverdue"] = is_overdue
        task_out["urgencyTier"] = urgency_tier
        task_out["urgencyReason"] = urgency_reason
        task_out["hoursLeft"] = round(hours_left, 1) if hours_left < 999990 else None
        task_out["importance"] = importance
        task_out["difficulty"] = difficulty
        task_out["estimatedHours"] = est_hours
        task_out["reason"] = f"{urgency_reason} | Importance {importance}/5 | Difficulty {difficulty}/5"
        task_out["scoreBreakdown"] = {
            "urgency": round(urgency, 1),
            "urgencyScore": round(urgency_component, 2),
            "importance": importance,
            "importanceScore": round(importance_component, 2),
            "difficulty": difficulty,
            "difficultyScore": round(difficulty_component, 2),
            "weights": "Urgency: 50%, Importance: 30%, Difficulty: 20%"
        }
        ranked.append(task_out)

    ranked.sort(
        key=lambda t: (
            -t["priorityScore"],
            0 if t["isOverdue"] else 1,
            t["hoursLeft"] if t["hoursLeft"] is not None else 999999,
            -t["importance"],
            -t["difficulty"]
        )
    )

    top = ranked[0]
    top_title = top.get("title", "your next task")
    top_subj = top.get("subject", "General")
    top_hrs = top.get("estimatedHours", 1.0)
    top_score = top.get("priorityScore", 0.0)

    if top.get("isOverdue"):
        message = (
            f"Priority Alert: '{top_title}' ({top_subj}) is overdue. "
            f"Dedicate {top_hrs} hr(s) now to clear this backlog and prevent penalty marks."
        )
    elif top.get("urgencyTier") == "due_today":
        message = (
            f"Urgent Deadline: '{top_title}' ({top_subj}) is due within 24 hours. "
            f"Complete this {top_hrs} hr(s) session first to stay on schedule."
        )
    elif top_score >= 7.5:
        message = (
            f"High Priority Focus: '{top_title}' in {top_subj} (Priority Score: {top_score}/10). "
            f"Ranked highest due to urgency and {top.get('importance', 3)}/5 academic importance."
        )
    else:
        message = (
            f"Recommended Study: Start with '{top_title}' ({top_subj}) for {top_hrs} hr(s). "
            f"A proactive session here keeps your study schedule well-balanced."
        )

    return {
        "recommendation": message,
        "rankedTasks": ranked,
        "activeCount": len(active),
        "overdueCount": overdue_count,
        "totalEstimatedHours": round(total_hours, 2),
        "engineInfo": "SmartStudy Heuristic Engine v2.0 (Urgency 50% + Importance 30% + Difficulty 20%)"
    }

if __name__ == "__main__":
    try:
        raw = sys.stdin.read() or "{}"
        payload = json.loads(raw)
        tasks = payload.get("tasks", [])
        result = recommend(tasks)
        print(json.dumps(result, ensure_ascii=True))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True))
        sys.exit(1)
