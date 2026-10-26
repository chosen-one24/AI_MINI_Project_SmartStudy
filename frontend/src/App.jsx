import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  Flame,
  GraduationCap,
  Info,
  LayoutDashboard,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X
} from "lucide-react";

const API = "http://localhost:5000/api";
const emptyForm = {
  title: "",
  subject: "",
  deadline: "",
  difficulty: 3,
  importance: 3,
  estimatedHours: 1
};

// Formats deadline with overdue and urgency indicators
function getDeadlineInfo(deadline) {
  if (!deadline) return { label: "No deadline", isOverdue: false, tier: "none" };
  const due = new Date(deadline);
  if (isNaN(due.getTime())) return { label: "Invalid date", isOverdue: false, tier: "none" };

  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) {
    const overdueDays = Math.floor(Math.abs(diffHours) / 24);
    return {
      label: overdueDays > 0 ? `Overdue by ${overdueDays}d` : "Overdue today",
      formattedDate: due.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      isOverdue: true,
      tier: "overdue"
    };
  }
  if (diffHours <= 24) {
    return {
      label: "Due Today",
      formattedDate: due.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      isOverdue: false,
      tier: "due-today"
    };
  }
  if (diffHours <= 72) {
    return {
      label: "Due Soon (3d)",
      formattedDate: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      isOverdue: false,
      tier: "due-soon"
    };
  }
  return {
    label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    formattedDate: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    isOverdue: false,
    tier: "upcoming"
  };
}

// Generates local ISO string for datetime-local input based on hours from now
function getPresetDate(hoursAhead) {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Helper to trigger transient toasts
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, []);

  // Fetch tasks from Express API
  const loadTasks = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(`${API}/tasks`);
      if (!response.ok) throw new Error("Backend returned an error.");
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setError("Can't connect to the backend. Start MongoDB and run 'npm run dev' in backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch AI heuristic recommendations from Python engine
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    try {
      const response = await fetch(`${API}/recommendations`);
      if (response.ok) {
        const data = await response.json();
        setRecommendation(data);
      }
    } catch {
      // Retain previous recommendations if backend/Python is busy
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation, tasks.length]);

  // Handle ESC key to close open modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowForm(false);
        setTaskToDelete(null);
        setShowFormulaInfo(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mapping AI ranking metrics to tasks by ID for quick lookup
  const aiTaskMap = useMemo(() => {
    const map = new Map();
    if (recommendation?.rankedTasks) {
      for (const t of recommendation.rankedTasks) {
        if (t.id) map.set(t.id, t);
      }
    }
    return map;
  }, [recommendation]);

  // Statistics
  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.length - completed;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => !t.completed && new Date(t.deadline).getTime() < now).length;
  }, [tasks]);

  const totalPendingHours = useMemo(() => {
    const hours = tasks
      .filter((t) => !t.completed)
      .reduce((sum, t) => sum + (Number(t.estimatedHours) || 1), 0);
    return Number(hours.toFixed(1));
  }, [tasks]);

  // Filtered and sorted tasks
  const visibleTasks = useMemo(() => {
    const now = Date.now();
    let result = tasks.filter((task) => {
      // 1. Completion / Status filter
      if (filter === "pending" && task.completed) return false;
      if (filter === "completed" && !task.completed) return false;
      if (filter === "overdue") {
        const isTaskOverdue = !task.completed && new Date(task.deadline).getTime() < now;
        if (!isTaskOverdue) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const subjectMatch = task.subject?.toLowerCase().includes(q);
        if (!titleMatch && !subjectMatch) return false;
      }

      return true;
    });

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === "priority") {
        const scoreA = aiTaskMap.get(a._id)?.priorityScore ?? 0;
        const scoreB = aiTaskMap.get(b._id)?.priorityScore ?? 0;
        return scoreB - scoreA;
      }
      if (sortBy === "importance") {
        return (b.importance ?? 3) - (a.importance ?? 3);
      }
      if (sortBy === "difficulty") {
        return (b.difficulty ?? 3) - (a.difficulty ?? 3);
      }
      if (sortBy === "estimatedHours") {
        return (b.estimatedHours ?? 1) - (a.estimatedHours ?? 1);
      }
      // Default: Earliest deadline first
      return new Date(a.deadline) - new Date(b.deadline);
    });

    return result;
  }, [tasks, filter, searchQuery, sortBy, aiTaskMap]);

  // Create task
  async function addTask(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save task.");
      setTasks((current) => [data, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      showToast("Study task added successfully!", "success");
      loadRecommendation();
    } catch (err) {
      setError(err.message || "Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  // Toggle completion
  async function toggleTask(task) {
    const nextStatus = !task.completed;
    try {
      const response = await fetch(`${API}/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextStatus })
      });
      if (!response.ok) throw new Error("Update failed.");
      const updated = await response.json();
      setTasks((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      showToast(nextStatus ? "Task marked completed!" : "Task moved to pending.");
      loadRecommendation();
    } catch {
      setError("Couldn't update the task. Please try again.");
    }
  }

  // Delete task after confirmation
  async function confirmDeleteTask() {
    if (!taskToDelete) return;
    try {
      const response = await fetch(`${API}/tasks/${taskToDelete._id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed.");
      setTasks((current) => current.filter((task) => task._id !== taskToDelete._id));
      showToast("Task deleted.");
      setTaskToDelete(null);
      loadRecommendation();
    } catch {
      setError("Couldn't delete the task. Please try again.");
    }
  }

  // Seed sample demonstration tasks without duplicates
  async function seedSampleData() {
    setSeeding(true);
    try {
      const response = await fetch(`${API}/tasks/seed`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Seeding failed.");
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else {
        await loadTasks();
      }
      showToast(data.message || "Sample study tasks loaded!", "success");
      loadRecommendation();
    } catch (err) {
      setError(err.message || "Could not load sample tasks.");
    } finally {
      setSeeding(false);
    }
  }

  const topTask = recommendation?.rankedTasks?.[0];

  return (
    <div className="app-shell">
      {/* Toast Notification */}
      {toast && (
        <div className={`app-toast toast-${toast.type}`}>
          <Sparkles size={14} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrainCircuit size={23} />
          </div>
          <div>
            <strong>smartstudy</strong>
            <span>YOUR AI STUDY COMPANION</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active">
          <LayoutDashboard size={18} /> Dashboard
        </div>
        <div className="nav-item">
          <ListTodo size={18} /> My study tasks <span className="nav-count">{pending}</span>
        </div>
        <div className="nav-item">
          <CalendarDays size={18} /> Study planner
        </div>

        <div className="sidebar-bottom">
          <div className="mini-ai">
            <div className="mini-ai-icon">
              <Sparkles size={17} />
            </div>
            <strong>Heuristic AI Engine</strong>
            <p>Ranks tasks by urgency (50%), importance (30%), and difficulty (20%).</p>
            <button
              onClick={() => {
                loadRecommendation();
                showToast("Recalculating recommendation...", "info");
              }}
              disabled={recLoading}
              aria-label="Refresh AI recommendations"
            >
              <RefreshCw size={13} className={recLoading ? "spin" : ""} />
              {recLoading ? "Analyzing..." : "Refresh recommendation"}
            </button>
          </div>

          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <strong>Student workspace</strong>
              <span>Personal planner</span>
            </div>
            <span className="online-dot" title="MongoDB & Backend connected" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Dashboard</strong>
          </div>
          <div className="topbar-right">
            <button
              className="seed-button"
              onClick={seedSampleData}
              disabled={seeding}
              title="Add 5 sample study tasks across subjects"
            >
              <Database size={14} />
              {seeding ? "Loading..." : "Load Demo Tasks"}
            </button>
            <span className="today-label">
              <CalendarDays size={15} />{" "}
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
              })}
            </span>
            <div className="avatar top-avatar">S</div>
          </div>
        </header>

        {/* Welcome Row */}
        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="pulse" /> YOUR PERSONAL STUDY SPACE
            </div>
            <h1>
              Let's make today <span>count.</span>
            </h1>
            <p>Smart task prioritization powered by an explainable AI heuristic evaluation model.</p>
          </div>
          <div className="welcome-actions">
            <button className="primary-button" onClick={() => setShowForm(true)} id="add-task-btn">
              <Plus size={18} /> Add study task
            </button>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              onClick={() => {
                loadTasks();
                loadRecommendation();
              }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Statistics Grid */}
        <section className="stats-grid">
          <StatCard
            icon={<ListTodo />}
            label="Total tasks"
            value={tasks.length}
            note="Across all enrolled subjects"
            tone="violet"
          />
          <StatCard
            icon={<CheckCircle2 />}
            label="Completed"
            value={completed}
            note={`${progress}% overall completion`}
            tone="green"
          />
          <StatCard
            icon={<Clock3 />}
            label="Pending tasks"
            value={pending}
            note={overdueCount > 0 ? `⚠️ ${overdueCount} task(s) overdue` : "All deadlines on track"}
            tone={overdueCount > 0 ? "orange" : "blue"}
          />
          <StatCard
            icon={<Flame />}
            label="Study workload"
            value={`${totalPendingHours} hrs`}
            note="Estimated pending study time"
            tone="blue"
          />
        </section>

        {/* Content Grid */}
        <section className="content-grid">
          {/* Tasks Panel */}
          <div className="panel tasks-panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">YOUR WORKLOAD</div>
                <h2>Study tasks</h2>
              </div>
              <div className="panel-heading-actions">
                <button
                  className="icon-button"
                  aria-label="Refresh tasks list"
                  onClick={() => {
                    loadTasks();
                    loadRecommendation();
                    showToast("Tasks refreshed.");
                  }}
                  title="Refresh tasks"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="toolbar-row">
              <div className="search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by topic or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search study tasks"
                  id="task-search-input"
                />
                {searchQuery && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="sort-box">
                <ArrowUpDown size={14} className="sort-icon" />
                <label htmlFor="task-sort-select" className="sr-only">
                  Sort by
                </label>
                <select
                  id="task-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="deadline">Sort: Earliest deadline</option>
                  <option value="priority">Sort: AI Priority Score</option>
                  <option value="importance">Sort: Highest importance</option>
                  <option value="difficulty">Sort: Hardest first</option>
                  <option value="estimatedHours">Sort: Longest study time</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-row">
              {[
                ["all", "All tasks", tasks.length],
                ["pending", "To do", pending],
                ["completed", "Completed", completed],
                ["overdue", "Overdue", overdueCount]
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  className={`filter-tab ${filter === key ? "selected" : ""} ${
                    key === "overdue" && overdueCount > 0 ? "filter-has-overdue" : ""
                  }`}
                  onClick={() => setFilter(key)}
                  id={`filter-${key}`}
                >
                  {label}
                  <span className="filter-badge">{count}</span>
                </button>
              ))}
            </div>

            {/* Task List or Empty State */}
            {loading ? (
              <div className="empty-state">
                <RefreshCw size={24} className="spin empty-spin" />
                <p>Loading your study tasks from MongoDB...</p>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Target size={22} />
                </div>
                <strong>
                  {searchQuery
                    ? "No matching tasks found"
                    : filter === "completed"
                    ? "No completed tasks yet"
                    : filter === "overdue"
                    ? "No overdue tasks! You're on track."
                    : "Your study list is clear"}
                </strong>
                <p>
                  {searchQuery
                    ? `Try a different keyword or clear your search for "${searchQuery}".`
                    : "Create an assignment, or populate realistic demonstration data in 1 click."}
                </p>
                <div className="empty-actions">
                  <button className="primary-button compact" onClick={() => setShowForm(true)}>
                    <Plus size={15} /> Create a task
                  </button>
                  {tasks.length === 0 && (
                    <button
                      className="secondary-button compact"
                      onClick={seedSampleData}
                      disabled={seeding}
                    >
                      <Database size={14} /> Load demo sample tasks
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="task-list">
                {visibleTasks.map((task) => {
                  const deadlineInfo = getDeadlineInfo(task.deadline);
                  const aiInfo = aiTaskMap.get(task._id);

                  return (
                    <article
                      className={`task-row ${task.completed ? "task-done" : ""} ${
                        deadlineInfo.isOverdue && !task.completed ? "task-row-overdue" : ""
                      }`}
                      key={task._id}
                    >
                      <button
                        className={`task-check ${task.completed ? "checked" : ""}`}
                        aria-label={`Mark task ${task.title} as ${task.completed ? "pending" : "complete"}`}
                        onClick={() => toggleTask(task)}
                      >
                        {task.completed && <Check size={14} />}
                      </button>

                      <div className="task-main">
                        <div className="task-title-row">
                          <strong title={task.title}>{task.title}</strong>
                          {aiInfo?.priorityScore !== undefined && !task.completed && (
                            <span
                              className={`ai-score-pill ${
                                aiInfo.priorityScore >= 8.5
                                  ? "score-high"
                                  : aiInfo.priorityScore >= 6.5
                                  ? "score-med"
                                  : "score-low"
                              }`}
                              title={aiInfo.reason || "AI heuristic priority score out of 10"}
                            >
                              <Sparkles size={11} /> Score {aiInfo.priorityScore}/10
                            </span>
                          )}
                        </div>

                        <div className="task-meta">
                          <span className="task-subject-tag">{task.subject}</span>
                          <span className="meta-dot">·</span>

                          <span className={`task-deadline-pill ${deadlineInfo.tier}`}>
                            <CalendarDays size={12} />
                            {deadlineInfo.label}
                          </span>

                          <span className="meta-dot">·</span>
                          <span className="task-time-pill" title="Estimated study time">
                            <Clock3 size={11} /> {task.estimatedHours || 1}h
                          </span>

                          <span className="meta-dot">·</span>
                          <span className="task-importance-pill" title={`Importance: ${task.importance || 3}/5`}>
                            Imp: {task.importance || 3}/5
                          </span>
                        </div>
                      </div>

                      <span
                        className={`difficulty difficulty-${task.difficulty || 3}`}
                        title={`Difficulty level: ${task.difficulty || 3} of 5`}
                      >
                        {["", "Easy", "Light", "Medium", "Hard", "Tough"][task.difficulty] || "Medium"}
                      </span>

                      <button
                        className="delete-button"
                        aria-label={`Delete task ${task.title}`}
                        onClick={() => setTaskToDelete(task)}
                        title="Delete task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Task List Footer */}
            <div className="task-footer">
              <span>
                Showing {visibleTasks.length} of {tasks.length} tasks
                {searchQuery ? ` (filtered from "${searchQuery}")` : ""}
              </span>
              <span>
                <span className="footer-dot" /> Synced with MongoDB & Python Heuristic Engine
              </span>
            </div>
          </div>

          {/* Right Column: AI Study Coach & Progress */}
          <div className="right-column">
            {/* AI Coach Card */}
            <div className="ai-card">
              <div className="ai-card-top">
                <div className="ai-badge">
                  <Sparkles size={15} /> AI HEURISTIC COACH
                </div>
                <button
                  className="formula-toggle-btn"
                  onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                  title="Explain heuristic evaluation formula"
                  aria-label="Explain algorithm"
                >
                  <Info size={14} /> Formula
                </button>
              </div>

              <h2>Your next best move.</h2>
              <p className="ai-description">
                Transparent heuristic prioritization based on deadline urgency, importance, and difficulty.
              </p>

              {/* Explanatory Formula Popup/Card */}
              {showFormulaInfo && (
                <div className="formula-callout">
                  <strong>Heuristic Prioritization Formula:</strong>
                  <code>Score = (Urgency × 50%) + (Importance × 30%) + (Difficulty × 20%)</code>
                  <ul>
                    <li>
                      <strong>Urgency (50%):</strong> Overdue (10/10) → Due in 12h (9.5/10) → 24h (9/10) → 3d (7.5/10)
                    </li>
                    <li>
                      <strong>Importance (30%):</strong> Academic weight (1 to 5 scale)
                    </li>
                    <li>
                      <strong>Difficulty (20%):</strong> Cognitive workload & effort (1 to 5 scale)
                    </li>
                  </ul>
                </div>
              )}

              {/* Top Recommendation Box */}
              <div className="recommendation-box">
                <div className="rec-icon">
                  <BrainCircuit size={19} />
                </div>
                <div>
                  <span className="rec-label">TOP RECOMMENDED TASK</span>
                  <strong>{topTask ? topTask.title : "Ready when you are"}</strong>
                  <p>
                    {topTask
                      ? `${topTask.subject} · Priority Score: ${topTask.priorityScore}/10`
                      : "Add a task and the Python AI module will rank it."}
                  </p>
                </div>
              </div>

              <p className="ai-message">
                {recommendation?.recommendation ||
                  "Your personalized recommendation will appear here once tasks are evaluated."}
              </p>

              {topTask && (
                <div className="reason-chip" title="Reason calculated by backend/ai.py">
                  <CheckCircle2 size={14} />
                  <span>
                    <strong>Why this task: </strong>
                    {topTask.reason}
                  </span>
                </div>
              )}

              <div className="ai-card-actions">
                <button
                  className="ai-refresh"
                  onClick={() => {
                    loadRecommendation();
                    showToast("AI recommendations updated!");
                  }}
                  disabled={recLoading}
                >
                  <RefreshCw size={14} className={recLoading ? "spin" : ""} />
                  {recLoading ? "Recalculating..." : "Recalculate recommendation"}
                </button>
              </div>
            </div>

            {/* Progress Overview Panel */}
            <div className="panel progress-panel">
              <div className="panel-heading compact">
                <div>
                  <div className="section-kicker">YOUR CONSISTENCY</div>
                  <h2>Progress overview</h2>
                </div>
                <TrendingUp size={18} className="muted-icon" />
              </div>

              <div className="progress-big">
                <strong>
                  {progress}
                  <small>%</small>
                </strong>
                <span>tasks completed</span>
              </div>

              <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
                <div style={{ width: `${progress}%` }} />
              </div>

              <div className="progress-labels">
                <span>{completed} completed</span>
                <span>{pending} remaining</span>
              </div>

              <div className="progress-note">
                <GraduationCap size={17} />
                <span>
                  {progress === 100 && tasks.length
                    ? "Outstanding! All scheduled tasks are complete."
                    : overdueCount > 0
                    ? `Focus on clearing the ${overdueCount} overdue assignment(s) first.`
                    : "Consistent daily effort leads to top grades. Keep it up!"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer className="page-footer">
          Made for focused learning <span>✦</span> SmartStudy AI Heuristic Planner
        </footer>
      </main>

      {/* Add Task Modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="modal">
            <div className="modal-heading">
              <div>
                <div className="section-kicker">PLAN YOUR PROGRESS</div>
                <h2>Add a study task</h2>
                <p>Provide details for your Python AI coach to rank and evaluate.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addTask} className="task-form">
              <label htmlFor="form-title">
                Task or topic
                <input
                  id="form-title"
                  required
                  maxLength={120}
                  placeholder="e.g. Revise Binary Search Trees & AVL rotations"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label htmlFor="form-subject">
                Subject or Course
                <input
                  id="form-subject"
                  required
                  maxLength={80}
                  placeholder="e.g. Data Structures & Algorithms"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </label>

              <label htmlFor="form-deadline">
                Deadline
                <input
                  id="form-deadline"
                  required
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
                <div className="deadline-quick-presets">
                  <span className="preset-label">Quick set:</span>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setForm({ ...form, deadline: getPresetDate(8) })}
                  >
                    +8h (Today)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setForm({ ...form, deadline: getPresetDate(24) })}
                  >
                    +1 Day (Tomorrow)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setForm({ ...form, deadline: getPresetDate(72) })}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setForm({ ...form, deadline: getPresetDate(168) })}
                  >
                    +1 Week
                  </button>
                </div>
              </label>

              <div className="form-two">
                <label htmlFor="form-difficulty">
                  Difficulty (Cognitive load)
                  <select
                    id="form-difficulty"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                  >
                    <option value="1">1 — Very easy (Quick review)</option>
                    <option value="2">2 — Easy (Basic concepts)</option>
                    <option value="3">3 — Medium (Standard)</option>
                    <option value="4">4 — Hard (Complex problem solving)</option>
                    <option value="5">5 — Very hard (Intensive derivation)</option>
                  </select>
                </label>

                <label htmlFor="form-importance">
                  Importance (Academic weight)
                  <select
                    id="form-importance"
                    value={form.importance}
                    onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })}
                  >
                    <option value="1">1 — Low (Supplemental reading)</option>
                    <option value="2">2 — Slight (Minor quiz)</option>
                    <option value="3">3 — Normal (Weekly lab)</option>
                    <option value="4">4 — High (Graded assignment)</option>
                    <option value="5">5 — Critical (Midterm / Final exam)</option>
                  </select>
                </label>
              </div>

              <label htmlFor="form-hours">
                Estimated study duration
                <select
                  id="form-hours"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })}
                >
                  <option value="0.5">30 minutes</option>
                  <option value="1">1 hour</option>
                  <option value="1.5">1.5 hours</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                  <option value="4">4 hours</option>
                  <option value="6">6 hours</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={saving} type="submit">
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <Plus size={17} /> Save task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Task Deletion */}
      {taskToDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setTaskToDelete(null)}
        >
          <div className="modal modal-danger">
            <div className="modal-heading">
              <div>
                <div className="section-kicker kicker-danger">CONFIRM DELETION</div>
                <h2>Delete study task?</h2>
                <p>
                  Are you sure you want to permanently delete{" "}
                  <strong>"{taskToDelete.title}"</strong> ({taskToDelete.subject})?
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setTaskToDelete(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setTaskToDelete(null)}
              >
                Keep task
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={confirmDeleteTask}
                id="confirm-delete-btn"
              >
                <Trash2 size={16} /> Delete task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, note, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}

export default App;
