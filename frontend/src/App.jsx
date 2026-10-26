import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Award,
  BookOpen,
  BrainCircuit,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Flame,
  GraduationCap,
  Info,
  Layers,
  LayoutDashboard,
  ListTodo,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Target,
  Timer,
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

// Initial university academic flashcards for Spaced Repetition
const initialFlashcards = [
  {
    id: "fc-1",
    subject: "Data Structures",
    question: "What is the time complexity of search and balancing in an AVL Tree vs an unbalanced BST?",
    answer: "AVL Trees maintain strict balance (|balance factor| ≤ 1). Search, Insertion, and Deletion are all guaranteed O(log N) in worst case through LL, RR, LR, and RL rotations. In an unbalanced BST, skewed insertion degrades search to O(N).",
    difficulty: "Medium",
    mastery: "learning",
    reviewDays: 3
  },
  {
    id: "fc-2",
    subject: "Database Systems",
    question: "What is 3NF (Third Normal Form) and what anomaly does it eliminate?",
    answer: "A relation is in 3NF if it is in 2NF and NO non-prime attribute is transitively dependent on the candidate key. It eliminates update, insertion, and deletion anomalies caused by transitive dependencies (X → Y → Z).",
    difficulty: "Hard",
    mastery: "new",
    reviewDays: 1
  },
  {
    id: "fc-3",
    subject: "Operating Systems",
    question: "What are Coffman's 4 necessary conditions for Deadlock to occur in an OS?",
    answer: "1. Mutual Exclusion (resources cannot be shared)\n2. Hold and Wait (process holds resource while requesting more)\n3. No Preemption (resources cannot be forcibly taken)\n4. Circular Wait (closed cycle of processes waiting on each other).",
    difficulty: "Medium",
    mastery: "mastered",
    reviewDays: 7
  },
  {
    id: "fc-4",
    subject: "Web Technologies",
    question: "Explain the difference between idempotent and non-idempotent HTTP methods in REST.",
    answer: "An idempotent HTTP method produces identical server side-effects whether called once or multiple times (e.g., GET, PUT, DELETE). POST is non-idempotent because repeated requests create multiple distinct resources.",
    difficulty: "Easy",
    mastery: "mastered",
    reviewDays: 7
  },
  {
    id: "fc-5",
    subject: "Computer Networks",
    question: "How does the TCP 3-Way Handshake establish a reliable connection?",
    answer: "1. Client sends SYN (seq = x)\n2. Server responds with SYN-ACK (seq = y, ack = x + 1)\n3. Client confirms with ACK (ack = y + 1).\nThis synchronizes initial sequence numbers and guarantees bidirectional communication.",
    difficulty: "Medium",
    mastery: "learning",
    reviewDays: 2
  },
  {
    id: "fc-6",
    subject: "Data Structures",
    question: "When should you use Dijkstra's Algorithm over Bellman-Ford for Shortest Path?",
    answer: "Use Dijkstra's when edge weights are strictly non-negative (O((V + E) log V) with min-heap). Use Bellman-Ford (O(V × E)) when graphs contain negative edge weights or when detecting negative weight cycles.",
    difficulty: "Hard",
    mastery: "new",
    reviewDays: 1
  }
];

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
      formattedDate: due.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      isOverdue: true,
      tier: "overdue"
    };
  }
  if (diffHours <= 24) {
    return {
      label: "Due Today",
      formattedDate: due.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
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

// Formats seconds into MM:SS format
function formatTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function App() {
  // Theme state: "dark" | "light"
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("smartstudy_theme") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("smartstudy_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    showToast(`Switched to ${nextTheme === "dark" ? "Dark" : "Light"} Mode`, "info");
  };

  // Navigation View State: "dashboard" | "tasks" | "planner" | "flashcards" | "calendar" | "subjects"
  const [currentView, setCurrentView] = useState("dashboard");

  const [tasks, setTasks] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
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

  // Pomodoro Focus Timer State for Study Planner
  const [timerMode, setTimerMode] = useState("focus"); // "focus" | "shortBreak" | "longBreak"
  const [timeLeft, setTimeLeft] = useState(1500); // 25 mins
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState("");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Flashcards State
  const [flashcards, setFlashcards] = useState(() => {
    const saved = localStorage.getItem("smartstudy_flashcards");
    return saved ? JSON.parse(saved) : initialFlashcards;
  });
  const [fcSubjectFilter, setFcSubjectFilter] = useState("all");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showAddFcModal, setShowAddFcModal] = useState(false);
  const [newFcForm, setNewFcForm] = useState({ subject: "", question: "", answer: "", difficulty: "Medium" });

  // Calendar View State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Save flashcards to localStorage
  useEffect(() => {
    localStorage.setItem("smartstudy_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

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

  // Pomodoro Timer Interval
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerRunning(false);
            if (timerMode === "focus") {
              setSessionsCompleted((s) => s + 1);
              showToast("🎉 Focus session completed! Take a 5-minute break.", "success");
              setTimerMode("shortBreak");
              return 300;
            } else {
              showToast("☕ Break ended! Ready to start your next study block?", "info");
              setTimerMode("focus");
              return 1500;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, showToast]);

  // Handle ESC key to close open modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowForm(false);
        setTaskToDelete(null);
        setShowFormulaInfo(false);
        setShowAddFcModal(false);
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

  // Extract unique subjects for dropdown filter
  const availableSubjects = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.subject && t.subject.trim()) set.add(t.subject.trim());
    });
    return Array.from(set).sort();
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

      // 2. Subject filter
      if (subjectFilter !== "all" && task.subject !== subjectFilter) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const subjectMatch = task.subject?.toLowerCase().includes(q);
        if (!titleMatch && !subjectMatch) return false;
      }

      return true;
    });

    // 4. Sorting
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
  }, [tasks, filter, subjectFilter, searchQuery, sortBy, aiTaskMap]);

  // Top recommended task from Python AI engine
  const topTask = recommendation?.rankedTasks?.[0];

  // Auto-select timer task if not set
  useEffect(() => {
    if (!selectedTimerTaskId) {
      if (topTask?._id) {
        setSelectedTimerTaskId(topTask._id);
      } else {
        const firstPending = tasks.find((t) => !t.completed);
        if (firstPending?._id) {
          setSelectedTimerTaskId(firstPending._id);
        }
      }
    }
  }, [topTask, tasks, selectedTimerTaskId]);

  // Subject workload distribution for study planner
  const subjectWorkload = useMemo(() => {
    const map = {};
    tasks
      .filter((t) => !t.completed)
      .forEach((t) => {
        const sub = t.subject || "General";
        const hrs = Number(t.estimatedHours) || 1;
        map[sub] = (map[sub] || 0) + hrs;
      });
    return Object.entries(map)
      .map(([subject, hours]) => ({
        subject,
        hours: Number(hours.toFixed(1)),
        percent: totalPendingHours > 0 ? Math.round((hours / totalPendingHours) * 100) : 0
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [tasks, totalPendingHours]);

  // Chronological timeline buckets for Study Planner
  const timelineBuckets = useMemo(() => {
    const now = Date.now();
    const overdue = [];
    const today = [];
    const soon = [];
    const upcoming = [];
    const done = [];

    tasks.forEach((t) => {
      if (t.completed) {
        done.push(t);
        return;
      }
      if (!t.deadline) {
        upcoming.push(t);
        return;
      }
      const diffHours = (new Date(t.deadline).getTime() - now) / (1000 * 60 * 60);
      if (diffHours < 0) {
        overdue.push(t);
      } else if (diffHours <= 24) {
        today.push(t);
      } else if (diffHours <= 72) {
        soon.push(t);
      } else {
        upcoming.push(t);
      }
    });

    const sortBucket = (arr) => {
      return [...arr].sort((a, b) => {
        const scoreA = aiTaskMap.get(a._id)?.priorityScore ?? 0;
        const scoreB = aiTaskMap.get(b._id)?.priorityScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    };

    return {
      overdue: sortBucket(overdue),
      today: sortBucket(today),
      soon: sortBucket(soon),
      upcoming: sortBucket(upcoming),
      done
    };
  }, [tasks, aiTaskMap]);

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

  // Switch timer mode
  function switchTimerMode(mode) {
    setTimerMode(mode);
    setTimerRunning(false);
    if (mode === "focus") setTimeLeft(1500);
    else if (mode === "shortBreak") setTimeLeft(300);
    else if (mode === "longBreak") setTimeLeft(900);
  }

  // Quick action: study a specific task in the Focus Timer
  function handleStudyWithTimer(taskId) {
    setSelectedTimerTaskId(taskId);
    setTimerMode("focus");
    setTimeLeft(1500);
    setTimerRunning(true);
    setCurrentView("planner");
    showToast("Focus timer started for this task!", "info");
  }

  // Flashcards helpers
  const filteredFlashcards = useMemo(() => {
    if (fcSubjectFilter === "all") return flashcards;
    return flashcards.filter((f) => f.subject === fcSubjectFilter);
  }, [flashcards, fcSubjectFilter]);

  const activeCard = filteredFlashcards[activeCardIndex] || filteredFlashcards[0];

  function handleSpacedRepetitionGrade(grade) {
    if (!activeCard) return;
    const updated = flashcards.map((c) => {
      if (c.id === activeCard.id) {
        if (grade === "easy") {
          return { ...c, mastery: "mastered", reviewDays: 7 };
        } else if (grade === "good") {
          return { ...c, mastery: "learning", reviewDays: 3 };
        } else {
          return { ...c, mastery: "new", reviewDays: 1 };
        }
      }
      return c;
    });
    setFlashcards(updated);
    setCardFlipped(false);
    if (activeCardIndex < filteredFlashcards.length - 1) {
      setActiveCardIndex((i) => i + 1);
    } else {
      setActiveCardIndex(0);
      showToast("Completed revision cycle for this deck!", "success");
    }
  }

  function handleAddFlashcard(e) {
    e.preventDefault();
    if (!newFcForm.question.trim() || !newFcForm.answer.trim()) return;
    const newCard = {
      id: "fc-" + Date.now(),
      subject: newFcForm.subject.trim() || "General",
      question: newFcForm.question.trim(),
      answer: newFcForm.answer.trim(),
      difficulty: newFcForm.difficulty,
      mastery: "new",
      reviewDays: 1
    };
    setFlashcards([newCard, ...flashcards]);
    setNewFcForm({ subject: "", question: "", answer: "", difficulty: "Medium" });
    setShowAddFcModal(false);
    showToast("Flashcard added to revision deck!", "success");
  }

  // Calendar calculations
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString("default", { month: "long" });

  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(calYear, calMonth - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(calYear, calMonth, i),
        isCurrentMonth: true
      });
    }

    // Trailing padding days to fill 35 or 42 slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(calYear, calMonth + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [calYear, calMonth]);

  // Tasks mapped to selected calendar date
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return (
        d.getFullYear() === selectedCalendarDate.getFullYear() &&
        d.getMonth() === selectedCalendarDate.getMonth() &&
        d.getDate() === selectedCalendarDate.getDate()
      );
    });
  }, [tasks, selectedCalendarDate]);

  // Enrolled subjects with structured syllabus details
  const subjectsData = useMemo(() => {
    // Default university courses catalog
    const baseCatalog = [
      { code: "CS201", subject: "Data Structures", credits: 4, targetGrade: "A" },
      { code: "CS302", subject: "Database Systems", credits: 3, targetGrade: "A" },
      { code: "CS304", subject: "Operating Systems", credits: 4, targetGrade: "A" },
      { code: "CS305", subject: "Computer Networks", credits: 3, targetGrade: "A-" },
      { code: "CS401", subject: "Web Technologies", credits: 3, targetGrade: "A+" }
    ];

    // Combine with subjects found in tasks
    const map = new Map();
    baseCatalog.forEach((item) => map.set(item.subject.toLowerCase(), item));

    tasks.forEach((t) => {
      if (t.subject && !map.has(t.subject.toLowerCase())) {
        map.set(t.subject.toLowerCase(), {
          code: `CS${Math.floor(100 + Math.random() * 899)}`,
          subject: t.subject,
          credits: 3,
          targetGrade: "A"
        });
      }
    });

    return Array.from(map.values()).map((course) => {
      const courseTasks = tasks.filter(
        (t) => t.subject && t.subject.toLowerCase() === course.subject.toLowerCase()
      );
      const done = courseTasks.filter((t) => t.completed).length;
      const total = courseTasks.length;
      const hours = courseTasks
        .filter((t) => !t.completed)
        .reduce((sum, t) => sum + (Number(t.estimatedHours) || 1), 0);
      const completionPercent = total ? Math.round((done / total) * 100) : 0;

      return {
        ...course,
        totalTasks: total,
        completedTasks: done,
        pendingHours: Number(hours.toFixed(1)),
        completionPercent,
        tasksList: courseTasks
      };
    });
  }, [tasks]);

  // Selected task object for Pomodoro display
  const activeTimerTask = tasks.find((t) => t._id === selectedTimerTaskId) || topTask;

  // View title label for breadcrumbs
  const viewTitle =
    currentView === "dashboard"
      ? "Dashboard"
      : currentView === "tasks"
      ? "My study tasks"
      : currentView === "planner"
      ? "Study planner"
      : currentView === "flashcards"
      ? "Flashcards & Revision"
      : currentView === "calendar"
      ? "Calendar View"
      : "Subjects & Syllabus";

  return (
    <div className={`app-shell theme-${theme}`} data-theme={theme}>
      {/* Toast Notification */}
      {toast && (
        <div className={`app-toast toast-${toast.type}`}>
          <Sparkles size={14} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
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
        <button
          className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => setCurrentView("dashboard")}
          id="nav-dashboard-btn"
          aria-label="Dashboard"
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button
          className={`nav-item ${currentView === "tasks" ? "active" : ""}`}
          onClick={() => setCurrentView("tasks")}
          id="nav-tasks-btn"
          aria-label="My study tasks"
        >
          <ListTodo size={18} /> My study tasks <span className="nav-count">{pending}</span>
        </button>
        <button
          className={`nav-item ${currentView === "planner" ? "active" : ""}`}
          onClick={() => setCurrentView("planner")}
          id="nav-planner-btn"
          aria-label="Study planner"
        >
          <Clock3 size={18} /> Study planner
        </button>

        {/* 3 New Workspace Tabs */}
        <button
          className={`nav-item ${currentView === "flashcards" ? "active" : ""}`}
          onClick={() => setCurrentView("flashcards")}
          id="nav-flashcards-btn"
          aria-label="Flashcards and Revision"
        >
          <BookOpen size={18} /> Flashcards & Revision
        </button>
        <button
          className={`nav-item ${currentView === "calendar" ? "active" : ""}`}
          onClick={() => setCurrentView("calendar")}
          id="nav-calendar-btn"
          aria-label="Calendar View"
        >
          <CalendarDays size={18} /> Calendar View
        </button>
        <button
          className={`nav-item ${currentView === "subjects" ? "active" : ""}`}
          onClick={() => setCurrentView("subjects")}
          id="nav-subjects-btn"
          aria-label="Subjects and Syllabus"
        >
          <GraduationCap size={18} /> Subjects & Syllabus
        </button>

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
            Workspace <span>/</span> <strong>{viewTitle}</strong>
          </div>
          <div className="topbar-right">
            {/* Dark / Light Mode Switcher */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle theme mode"
              id="theme-toggle-btn"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

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

        {/* VIEW 1: DASHBOARD VIEW */}
        {currentView === "dashboard" && (
          <>
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
                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                  id="add-task-btn"
                >
                  <Plus size={18} /> Add study task
                </button>
              </div>
            </section>

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
                        <TaskRow
                          key={task._id}
                          task={task}
                          deadlineInfo={deadlineInfo}
                          aiInfo={aiInfo}
                          onToggle={toggleTask}
                          onDelete={(t) => setTaskToDelete(t)}
                          onFocus={handleStudyWithTimer}
                        />
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
                    Transparent heuristic prioritization based on deadline urgency, importance, and
                    difficulty.
                  </p>

                  {/* Explanatory Formula Popup/Card */}
                  {showFormulaInfo && (
                    <div className="formula-callout">
                      <strong>Heuristic Prioritization Formula:</strong>
                      <code>Score = (Urgency × 50%) + (Importance × 30%) + (Difficulty × 20%)</code>
                      <ul>
                        <li>
                          <strong>Urgency (50%):</strong> Overdue (10/10) → Due in 12h (9.5/10) → 24h
                          (9/10) → 3d (7.5/10)
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

                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
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
          </>
        )}

        {/* VIEW 2: MY STUDY TASKS VIEW */}
        {currentView === "tasks" && (
          <div className="tasks-full-container">
            {/* View Header */}
            <div className="view-header">
              <div className="view-header-main">
                <div className="section-kicker">ACADEMIC WORKSPACE</div>
                <h1>
                  My study tasks <span className="view-count-badge">{tasks.length} total</span>
                </h1>
                <p>
                  Manage, prioritize, and filter all coursework assignments and syllabus revision
                  topics with intelligent multi-factor heuristic evaluation.
                </p>
              </div>
              <div className="view-actions">
                <button
                  className="secondary-button"
                  onClick={seedSampleData}
                  disabled={seeding}
                  title="Load demo university tasks"
                >
                  <Database size={15} /> Demo Tasks
                </button>
                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                  id="view-add-task-btn"
                >
                  <Plus size={17} /> Add study task
                </button>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <section className="stats-grid">
              <StatCard
                icon={<ListTodo />}
                label="Total Coursework"
                value={tasks.length}
                note={`${availableSubjects.length} enrolled subjects`}
                tone="violet"
              />
              <StatCard
                icon={<Clock3 />}
                label="To Do Tasks"
                value={pending}
                note={overdueCount > 0 ? `⚠️ ${overdueCount} overdue task(s)` : "All on schedule"}
                tone={overdueCount > 0 ? "orange" : "blue"}
              />
              <StatCard
                icon={<CheckCircle2 />}
                label="Completed"
                value={completed}
                note={`${progress}% completion rate`}
                tone="green"
              />
              <StatCard
                icon={<Flame />}
                label="Remaining Workload"
                value={`${totalPendingHours}h`}
                note="Total estimated study time"
                tone="blue"
              />
            </section>

            {/* Full Width Tasks Panel */}
            <div className="panel tasks-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">TASK MANAGER</div>
                  <h2>All enrolled assignments & study topics</h2>
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

              {/* Enhanced Search, Subject Filter & Sort Toolbar */}
              <div className="toolbar-row">
                <div className="search-box">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by topic or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search study tasks"
                    id="task-search-input-dedicated"
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

                {/* Subject Selector */}
                {availableSubjects.length > 0 && (
                  <div className="subject-filter-box">
                    <BookOpen size={13} className="subject-filter-icon" />
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      aria-label="Filter by subject"
                    >
                      <option value="all">All Subjects ({availableSubjects.length})</option>
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sort-box">
                  <ArrowUpDown size={14} className="sort-icon" />
                  <select
                    id="task-sort-select-dedicated"
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
                      : subjectFilter !== "all"
                      ? `No tasks found in "${subjectFilter}"`
                      : filter === "completed"
                      ? "No completed tasks yet"
                      : filter === "overdue"
                      ? "No overdue tasks! You're on track."
                      : "Your study list is clear"}
                  </strong>
                  <p>
                    {searchQuery || subjectFilter !== "all"
                      ? "Try adjusting your filters or keyword."
                      : "Add a new assignment or click Load Demo Tasks to populate realistic university coursework."}
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
                      <TaskRow
                        key={task._id}
                        task={task}
                        deadlineInfo={deadlineInfo}
                        aiInfo={aiInfo}
                        onToggle={toggleTask}
                        onDelete={(t) => setTaskToDelete(t)}
                        onFocus={handleStudyWithTimer}
                      />
                    );
                  })}
                </div>
              )}

              {/* Task List Footer */}
              <div className="task-footer">
                <span>
                  Showing {visibleTasks.length} of {tasks.length} tasks
                  {subjectFilter !== "all" ? ` · Filtered by ${subjectFilter}` : ""}
                  {searchQuery ? ` · Search: "${searchQuery}"` : ""}
                </span>
                <span>
                  <span className="footer-dot" /> Live MongoDB Atlas/Local ODM & Python Heuristic
                  Engine
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: STUDY PLANNER VIEW */}
        {currentView === "planner" && (
          <div className="planner-container">
            {/* View Header */}
            <div className="view-header">
              <div className="view-header-main">
                <div className="section-kicker">AI-POWERED SCHEDULE & FOCUS</div>
                <h1>Study planner & Focus Timer</h1>
                <p>
                  Intelligent chronological timeline and Pomodoro focus timer driven by the
                  explainable multi-factor heuristic recommendation engine.
                </p>
              </div>
              <div className="view-actions">
                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                  id="planner-add-task-btn"
                >
                  <Plus size={17} /> Add to schedule
                </button>
              </div>
            </div>

            {/* Planner Grid Layout */}
            <div className="planner-grid">
              {/* Left Column: Pomodoro Focus Timer & Chronological Timeline */}
              <div className="planner-main-col">
                {/* Interactive Pomodoro Focus Timer Card */}
                <div className="focus-timer-card">
                  <div className="timer-card-header">
                    <div className="timer-badge">
                      <Timer size={14} />
                      {timerMode === "focus"
                        ? "POMODORO FOCUS SESSION"
                        : timerMode === "shortBreak"
                        ? "SHORT BREAK"
                        : "LONG BREAK"}
                    </div>
                    <div className="timer-streak">
                      <Flame size={14} /> {sessionsCompleted} session(s) completed
                    </div>
                  </div>

                  {/* Mode Selector Buttons */}
                  <div className="timer-modes">
                    <button
                      className={`timer-mode-btn ${timerMode === "focus" ? "active" : ""}`}
                      onClick={() => switchTimerMode("focus")}
                    >
                      Focus (25m)
                    </button>
                    <button
                      className={`timer-mode-btn ${timerMode === "shortBreak" ? "active" : ""}`}
                      onClick={() => switchTimerMode("shortBreak")}
                    >
                      Short Break (5m)
                    </button>
                    <button
                      className={`timer-mode-btn ${timerMode === "longBreak" ? "active" : ""}`}
                      onClick={() => switchTimerMode("longBreak")}
                    >
                      Long Break (15m)
                    </button>
                  </div>

                  {/* Big Digital Clock Display */}
                  <div className="timer-clock-container">
                    <div className="timer-display">{formatTimerDisplay(timeLeft)}</div>

                    {activeTimerTask && (
                      <div className="timer-current-task">
                        <Sparkles size={14} />
                        <span>
                          Current Focus: <strong>{activeTimerTask.title}</strong> (
                          {activeTimerTask.subject})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timer Controls */}
                  <div className="timer-controls">
                    <button
                      className={`timer-main-btn ${timerRunning ? "running" : ""}`}
                      onClick={() => setTimerRunning(!timerRunning)}
                      id="timer-toggle-btn"
                    >
                      {timerRunning ? (
                        <>
                          <Pause size={18} /> Pause Focus
                        </>
                      ) : (
                        <>
                          <Play size={18} /> Start Focus Session
                        </>
                      )}
                    </button>

                    <button
                      className="timer-reset-btn"
                      onClick={() => {
                        setTimerRunning(false);
                        if (timerMode === "focus") setTimeLeft(1500);
                        else if (timerMode === "shortBreak") setTimeLeft(300);
                        else setTimeLeft(900);
                      }}
                      title="Reset timer"
                    >
                      <RotateCcw size={15} /> Reset
                    </button>
                  </div>

                  {/* Active Task Selector */}
                  {tasks.filter((t) => !t.completed).length > 0 && (
                    <div className="timer-task-picker">
                      <label htmlFor="timer-task-select">Target Task:</label>
                      <select
                        id="timer-task-select"
                        value={selectedTimerTaskId}
                        onChange={(e) => setSelectedTimerTaskId(e.target.value)}
                      >
                        {tasks
                          .filter((t) => !t.completed)
                          .map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.title} ({t.subject} · {t.estimatedHours || 1}h)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Chronological Study Timeline Buckets */}
                <div className="planner-timeline">
                  {/* Bucket 1: Overdue Catch-up */}
                  {timelineBuckets.overdue.length > 0 && (
                    <div className="timeline-bucket bucket-overdue">
                      <div className="timeline-bucket-header">
                        <div className="timeline-bucket-title">
                          <AlertTriangle size={17} />
                          <span>Immediate Action: Overdue Tasks</span>
                        </div>
                        <div className="timeline-bucket-meta">
                          <span className="timeline-badge">
                            {timelineBuckets.overdue.length} task(s)
                          </span>
                        </div>
                      </div>
                      <div className="timeline-tasks-list">
                        {timelineBuckets.overdue.map((task) => (
                          <TaskRow
                            key={task._id}
                            task={task}
                            deadlineInfo={getDeadlineInfo(task.deadline)}
                            aiInfo={aiTaskMap.get(task._id)}
                            onToggle={toggleTask}
                            onDelete={(t) => setTaskToDelete(t)}
                            onFocus={handleStudyWithTimer}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bucket 2: Due Today */}
                  <div className="timeline-bucket bucket-today">
                    <div className="timeline-bucket-header">
                      <div className="timeline-bucket-title">
                        <Flame size={17} />
                        <span>Today's Study Priority Queue (Due ≤ 24h)</span>
                      </div>
                      <div className="timeline-bucket-meta">
                        <span className="timeline-badge">
                          {timelineBuckets.today.length} task(s)
                        </span>
                      </div>
                    </div>
                    {timelineBuckets.today.length === 0 ? (
                      <div className="timeline-empty">
                        No tasks due in the next 24 hours. Great position to work ahead!
                      </div>
                    ) : (
                      <div className="timeline-tasks-list">
                        {timelineBuckets.today.map((task) => (
                          <TaskRow
                            key={task._id}
                            task={task}
                            deadlineInfo={getDeadlineInfo(task.deadline)}
                            aiInfo={aiTaskMap.get(task._id)}
                            onToggle={toggleTask}
                            onDelete={(t) => setTaskToDelete(t)}
                            onFocus={handleStudyWithTimer}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bucket 3: Due Soon (2 - 3 Days) */}
                  <div className="timeline-bucket">
                    <div className="timeline-bucket-header">
                      <div className="timeline-bucket-title">
                        <Clock3 size={17} />
                        <span>Due Soon (Next 2–3 Days)</span>
                      </div>
                      <div className="timeline-bucket-meta">
                        <span className="timeline-badge">
                          {timelineBuckets.soon.length} task(s)
                        </span>
                      </div>
                    </div>
                    {timelineBuckets.soon.length === 0 ? (
                      <div className="timeline-empty">
                        No tasks scheduled for the next 3 days.
                      </div>
                    ) : (
                      <div className="timeline-tasks-list">
                        {timelineBuckets.soon.map((task) => (
                          <TaskRow
                            key={task._id}
                            task={task}
                            deadlineInfo={getDeadlineInfo(task.deadline)}
                            aiInfo={aiTaskMap.get(task._id)}
                            onToggle={toggleTask}
                            onDelete={(t) => setTaskToDelete(t)}
                            onFocus={handleStudyWithTimer}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bucket 4: Upcoming (This Week & Later) */}
                  <div className="timeline-bucket">
                    <div className="timeline-bucket-header">
                      <div className="timeline-bucket-title">
                        <CalendarDays size={17} />
                        <span>Upcoming Coursework & Milestones</span>
                      </div>
                      <div className="timeline-bucket-meta">
                        <span className="timeline-badge">
                          {timelineBuckets.upcoming.length} task(s)
                        </span>
                      </div>
                    </div>
                    {timelineBuckets.upcoming.length === 0 ? (
                      <div className="timeline-empty">No upcoming long-range tasks.</div>
                    ) : (
                      <div className="timeline-tasks-list">
                        {timelineBuckets.upcoming.map((task) => (
                          <TaskRow
                            key={task._id}
                            task={task}
                            deadlineInfo={getDeadlineInfo(task.deadline)}
                            aiInfo={aiTaskMap.get(task._id)}
                            onToggle={toggleTask}
                            onDelete={(t) => setTaskToDelete(t)}
                            onFocus={handleStudyWithTimer}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Workload Capacity, Subject Breakdown & AI Heuristic Snapshot */}
              <div className="planner-side-col">
                {/* Daily Workload Capacity Card */}
                <div className="daily-capacity-card">
                  <div className="capacity-header">
                    <h3>
                      <Clock3 size={17} /> Daily Study Target
                    </h3>
                    <span className="timeline-badge">Goal: 4.0 hrs/day</span>
                  </div>

                  <div className="capacity-stats">
                    <strong>
                      {timelineBuckets.today
                        .reduce((sum, t) => sum + (Number(t.estimatedHours) || 1), 0)
                        .toFixed(1)}
                      h
                    </strong>
                    <span>scheduled for today</span>
                  </div>

                  {(() => {
                    const todayHours = timelineBuckets.today.reduce(
                      (sum, t) => sum + (Number(t.estimatedHours) || 1),
                      0
                    );
                    const percent = Math.min(100, Math.round((todayHours / 4) * 100));
                    const isOver = todayHours > 4;

                    return (
                      <>
                        <div className="capacity-bar">
                          <div
                            className={`capacity-fill ${isOver ? "overload" : ""}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="capacity-note">
                          {isOver
                            ? "⚠️ Workload exceeds 4 hours today. Consider breaking sessions into Pomodoros or shifting non-urgent tasks."
                            : todayHours > 0
                            ? `Healthy study workload at ${percent}% capacity for today.`
                            : "No urgent deadlines today. Good opportunity to tackle upcoming modules."}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Subject Workload Distribution Breakdown */}
                <div className="subject-dist-card">
                  <h3>
                    <Layers size={17} /> Subject Workload Distribution
                  </h3>

                  {subjectWorkload.length === 0 ? (
                    <p className="capacity-note">No pending study tasks.</p>
                  ) : (
                    <div className="subject-dist-list">
                      {subjectWorkload.map((item) => (
                        <div key={item.subject} className="subject-dist-item">
                          <div className="subject-dist-row">
                            <span className="subject-name">{item.subject}</span>
                            <span className="subject-hours">
                              {item.hours}h ({item.percent}%)
                            </span>
                          </div>
                          <div className="subject-bar-track">
                            <div className="subject-bar-fill" style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Coach Card (Preserved from Dashboard) */}
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
                    Transparent heuristic prioritization based on deadline urgency, importance, and
                    difficulty.
                  </p>

                  {showFormulaInfo && (
                    <div className="formula-callout">
                      <strong>Heuristic Prioritization Formula:</strong>
                      <code>Score = (Urgency × 50%) + (Importance × 30%) + (Difficulty × 20%)</code>
                    </div>
                  )}

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
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: 📇 FLASHCARDS & REVISION VIEW */}
        {currentView === "flashcards" && (
          <div className="flashcard-workspace">
            {/* View Header */}
            <div className="view-header">
              <div className="view-header-main">
                <div className="section-kicker">SPACED REPETITION ENGINE</div>
                <h1>
                  Flashcards & Revision <span className="view-count-badge">{filteredFlashcards.length} cards</span>
                </h1>
                <p>
                  Accelerate syllabus recall using Leitner spaced repetition. Test yourself on key
                  engineering concepts, derivation steps, and exam questions.
                </p>
              </div>
              <div className="view-actions">
                <button
                  className="primary-button"
                  onClick={() => setShowAddFcModal(true)}
                  id="add-flashcard-btn"
                >
                  <Plus size={16} /> Create Flashcard
                </button>
              </div>
            </div>

            {/* Deck Controls & Subject Filter */}
            <div className="flashcard-deck-bar">
              <div className="flashcard-subjects-tabs">
                {["all", "Data Structures", "Database Systems", "Operating Systems", "Web Technologies", "Computer Networks"].map(
                  (sub) => (
                    <button
                      key={sub}
                      className={`flashcard-tab-btn ${fcSubjectFilter === sub ? "active" : ""}`}
                      onClick={() => {
                        setFcSubjectFilter(sub);
                        setActiveCardIndex(0);
                        setCardFlipped(false);
                      }}
                    >
                      {sub === "all" ? "All Subjects" : sub}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 3D Interactive Flip Card Area */}
            {filteredFlashcards.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={30} />
                <strong>No flashcards found for this subject</strong>
                <p>Click "Create Flashcard" to add custom study questions.</p>
              </div>
            ) : (
              <div className="flashcard-scene-container">
                <div className="flashcard-3d-scene">
                  <div
                    className={`flashcard-card ${cardFlipped ? "flipped" : ""}`}
                    onClick={() => setCardFlipped(!cardFlipped)}
                    title="Click anywhere to flip"
                  >
                    {/* Front Face: Question */}
                    <div className="flashcard-face flashcard-front">
                      <div className="flashcard-top-meta">
                        <span className="flashcard-subject-badge">{activeCard.subject}</span>
                        <span className={`flashcard-mastery-tag mastery-${activeCard.mastery}`}>
                          {activeCard.mastery.toUpperCase()}
                        </span>
                      </div>

                      <div className="flashcard-body">
                        <h3 className="flashcard-question-text">{activeCard.question}</h3>
                      </div>

                      <div className="flashcard-footer-prompt">
                        <span>Difficulty: {activeCard.difficulty}</span>
                        <span className="flashcard-flip-hint">
                          <RotateCcw size={13} /> Click card to reveal answer
                        </span>
                      </div>
                    </div>

                    {/* Back Face: Answer */}
                    <div className="flashcard-face flashcard-back">
                      <div className="flashcard-top-meta">
                        <span className="flashcard-subject-badge">{activeCard.subject}</span>
                        <span className="flashcard-flip-hint">
                          <CheckCircle2 size={14} /> Answer & Key Concept
                        </span>
                      </div>

                      <div className="flashcard-body">
                        <div className="flashcard-answer-text">
                          {activeCard.answer.split("\n").map((line, i) => (
                            <p key={i} style={{ margin: "4px 0" }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="flashcard-footer-prompt">
                        <span>Next review: in {activeCard.reviewDays} days</span>
                        <span className="flashcard-flip-hint">
                          <RotateCcw size={13} /> Click to flip back
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spaced Repetition Grading Controls */}
                <div className="spaced-repetition-bar">
                  <button
                    className="sr-btn sr-btn-hard"
                    onClick={() => handleSpacedRepetitionGrade("hard")}
                    title="Review again tomorrow"
                  >
                    🔴 Hard (1 day)
                  </button>
                  <button
                    className="sr-btn sr-btn-good"
                    onClick={() => handleSpacedRepetitionGrade("good")}
                    title="Review in 3 days"
                  >
                    🟡 Good (3 days)
                  </button>
                  <button
                    className="sr-btn sr-btn-easy"
                    onClick={() => handleSpacedRepetitionGrade("easy")}
                    title="Mastered! Review in 1 week"
                  >
                    🟢 Easy (7 days)
                  </button>
                </div>

                {/* Navigation Controls */}
                <div className="flashcard-nav-controls">
                  <button
                    className="flashcard-nav-btn"
                    disabled={activeCardIndex === 0}
                    onClick={() => {
                      setCardFlipped(false);
                      setActiveCardIndex((i) => Math.max(0, i - 1));
                    }}
                  >
                    <ChevronLeft size={16} /> Previous Card
                  </button>

                  <span className="flashcard-counter-badge">
                    Card {activeCardIndex + 1} of {filteredFlashcards.length}
                  </span>

                  <button
                    className="flashcard-nav-btn"
                    disabled={activeCardIndex === filteredFlashcards.length - 1}
                    onClick={() => {
                      setCardFlipped(false);
                      setActiveCardIndex((i) => Math.min(filteredFlashcards.length - 1, i + 1));
                    }}
                  >
                    Next Card <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: 🗓️ CALENDAR VIEW */}
        {currentView === "calendar" && (
          <div className="calendar-workspace">
            {/* View Header */}
            <div className="view-header">
              <div className="view-header-main">
                <div className="section-kicker">VISUAL ACADEMIC SCHEDULE</div>
                <h1>Monthly Deadline & Study Calendar</h1>
                <p>
                  Track all assignment due dates, midterm exams, and scheduled revision slots
                  across your entire semester.
                </p>
              </div>
              <div className="view-actions">
                <button
                  className="primary-button"
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      deadline: `${selectedCalendarDate.getFullYear()}-${String(
                        selectedCalendarDate.getMonth() + 1
                      ).padStart(2, "0")}-${String(selectedCalendarDate.getDate()).padStart(2, "0")}T12:00`
                    });
                    setShowForm(true);
                  }}
                  id="calendar-add-task-btn"
                >
                  <Plus size={16} /> Schedule Task
                </button>
              </div>
            </div>

            {/* Calendar Controls & Month Title */}
            <div className="calendar-topbar">
              <div className="calendar-month-title">
                <Calendar size={22} className="calendar-title-icon" />
                <h2>
                  {monthName} {calYear}
                </h2>
              </div>

              <div className="calendar-nav-group">
                <button
                  className="calendar-today-btn"
                  onClick={() => {
                    const today = new Date();
                    setCalendarDate(today);
                    setSelectedCalendarDate(today);
                  }}
                >
                  Today
                </button>
                <button
                  className="calendar-arrow-btn"
                  onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="calendar-arrow-btn"
                  onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar Board */}
            <div className="calendar-board">
              {/* Weekday Names Header */}
              <div className="calendar-weekdays-row">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                  <div key={day} className="calendar-weekday-cell">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="calendar-days-grid">
                {calendarDays.map((item, idx) => {
                  const dayDate = item.date;
                  const isToday =
                    new Date().getFullYear() === dayDate.getFullYear() &&
                    new Date().getMonth() === dayDate.getMonth() &&
                    new Date().getDate() === dayDate.getDate();

                  const isSelected =
                    selectedCalendarDate.getFullYear() === dayDate.getFullYear() &&
                    selectedCalendarDate.getMonth() === dayDate.getMonth() &&
                    selectedCalendarDate.getDate() === dayDate.getDate();

                  // Find tasks on this date
                  const dayTasks = tasks.filter((t) => {
                    if (!t.deadline) return false;
                    const d = new Date(t.deadline);
                    return (
                      d.getFullYear() === dayDate.getFullYear() &&
                      d.getMonth() === dayDate.getMonth() &&
                      d.getDate() === dayDate.getDate()
                    );
                  });

                  return (
                    <div
                      key={idx}
                      className={`calendar-day-box ${!item.isCurrentMonth ? "not-month" : ""} ${
                        isToday ? "is-today" : ""
                      } ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedCalendarDate(dayDate)}
                    >
                      <div className="calendar-day-header-num">
                        <span className="day-number">{dayDate.getDate()}</span>
                        {dayTasks.length > 0 && <span className="day-badge-dot" />}
                      </div>

                      <div className="calendar-day-tasks">
                        {dayTasks.slice(0, 2).map((t) => {
                          const dl = getDeadlineInfo(t.deadline);
                          return (
                            <div
                              key={t._id}
                              className={`calendar-task-pill ${
                                t.completed
                                  ? "pill-completed"
                                  : dl.isOverdue
                                  ? "pill-overdue"
                                  : dl.tier === "due-today"
                                  ? "pill-today"
                                  : ""
                              }`}
                              title={`${t.title} (${t.subject})`}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                        {dayTasks.length > 2 && (
                          <span className="calendar-more-count">+{dayTasks.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Inspector Panel */}
            <div className="calendar-day-inspector">
              <div className="inspector-header">
                <h3>
                  <CalendarDays size={18} className="inspector-title-icon" />
                  Tasks Scheduled for{" "}
                  {selectedCalendarDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}
                </h3>

                <button
                  className="secondary-button compact"
                  onClick={() => {
                    const pad = (n) => String(n).padStart(2, "0");
                    const dateStr = `${selectedCalendarDate.getFullYear()}-${pad(
                      selectedCalendarDate.getMonth() + 1
                    )}-${pad(selectedCalendarDate.getDate())}T14:00`;
                    setForm({ ...emptyForm, deadline: dateStr });
                    setShowForm(true);
                  }}
                >
                  <Plus size={14} /> Add task on this date
                </button>
              </div>

              {selectedDateTasks.length === 0 ? (
                <p className="inspector-empty">
                  No assignments or revisions scheduled for this date. Click "+ Add task on this date"
                  to schedule one.
                </p>
              ) : (
                <div className="task-list">
                  {selectedDateTasks.map((task) => (
                    <TaskRow
                      key={task._id}
                      task={task}
                      deadlineInfo={getDeadlineInfo(task.deadline)}
                      aiInfo={aiTaskMap.get(task._id)}
                      onToggle={toggleTask}
                      onDelete={(t) => setTaskToDelete(t)}
                      onFocus={handleStudyWithTimer}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: 📚 SUBJECTS & SYLLABUS VIEW */}
        {currentView === "subjects" && (
          <div className="subjects-workspace">
            {/* View Header */}
            <div className="view-header">
              <div className="view-header-main">
                <div className="section-kicker">ACADEMIC CURRICULUM</div>
                <h1>
                  Subjects & Syllabus Tracker{" "}
                  <span className="view-count-badge">{subjectsData.length} courses</span>
                </h1>
                <p>
                  Comprehensive course syllabus management, academic credit allocation, and target
                  grade tracking across all university modules.
                </p>
              </div>
              <div className="view-actions">
                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                  id="subjects-add-task-btn"
                >
                  <Plus size={16} /> Add Course Topic
                </button>
              </div>
            </div>

            {/* Subjects Overview Grid */}
            <section className="stats-grid">
              <StatCard
                icon={<GraduationCap />}
                label="Enrolled Courses"
                value={subjectsData.length}
                note="Active semester curriculum"
                tone="violet"
              />
              <StatCard
                icon={<CheckCircle2 />}
                label="Average Completion"
                value={`${
                  subjectsData.length
                    ? Math.round(
                        subjectsData.reduce((acc, c) => acc + c.completionPercent, 0) /
                          subjectsData.length
                      )
                    : 0
                }%`}
                note="Across all courses"
                tone="green"
              />
              <StatCard
                icon={<Award />}
                label="Total Credits"
                value={subjectsData.reduce((acc, c) => acc + (c.credits || 3), 0)}
                note="Semester credit hours"
                tone="orange"
              />
              <StatCard
                icon={<Flame />}
                label="Total Coursework Workload"
                value={`${totalPendingHours}h`}
                note="Remaining pending study time"
                tone="blue"
              />
            </section>

            {/* Subject Cards Grid */}
            <div className="subjects-grid">
              {subjectsData.map((course) => (
                <div key={course.subject} className="subject-card">
                  <div className="subject-card-top">
                    <div className="subject-icon-box">
                      <BookOpen size={20} />
                    </div>
                    <div className="subject-title-area">
                      <span className="subject-code-tag">{course.code}</span>
                      <h3>{course.subject}</h3>
                    </div>
                    <span className="subject-credits-badge">{course.credits} Credits</span>
                  </div>

                  {/* Syllabus Progress */}
                  <div className="subject-progress-box">
                    <div className="subject-progress-labels">
                      <span>Syllabus Progress</span>
                      <span className="subject-progress-percent">
                        {course.completionPercent}% completed
                      </span>
                    </div>
                    <div className="subject-progress-track">
                      <div
                        className="subject-progress-bar"
                        style={{ width: `${course.completionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="subject-metrics-row">
                    <div className="subject-metric-col">
                      <span className="subject-metric-val">{course.totalTasks}</span>
                      <span className="subject-metric-lbl">Total Topics</span>
                    </div>
                    <div className="subject-metric-col">
                      <span className="subject-metric-val">{course.completedTasks}</span>
                      <span className="subject-metric-lbl">Finished</span>
                    </div>
                    <div className="subject-metric-col">
                      <span className="subject-metric-val">{course.pendingHours}h</span>
                      <span className="subject-metric-lbl">Study Left</span>
                    </div>
                  </div>

                  {/* Topics List Under Subject */}
                  <div className="subject-topics-section">
                    <div className="subject-topics-heading">Coursework Topics</div>
                    {course.tasksList.length === 0 ? (
                      <span className="subject-empty-note">
                        No assignments logged yet for this subject.
                      </span>
                    ) : (
                      course.tasksList.map((t) => (
                        <div
                          key={t._id}
                          className={`subject-topic-item ${t.completed ? "done" : ""}`}
                        >
                          <button
                            className={`task-check ${t.completed ? "checked" : ""}`}
                            style={{ width: "18px", height: "18px" }}
                            onClick={() => toggleTask(t)}
                            title="Toggle completion"
                          >
                            {t.completed && <Check size={11} />}
                          </button>
                          <span className="subject-topic-title" title={t.title}>
                            {t.title}
                          </span>
                          <span className="subject-topic-time">
                            <Clock3 size={10} /> {t.estimatedHours || 1}h
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Add Topic Button */}
                  <button
                    className="subject-add-btn"
                    onClick={() => {
                      setForm({ ...emptyForm, subject: course.subject });
                      setShowForm(true);
                    }}
                  >
                    <Plus size={14} /> Add topic to {course.subject}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="page-footer">
          Made for focused learning <span>✦</span> SmartStudy AI Heuristic Planner
        </footer>
      </main>

      {/* Add Flashcard Modal */}
      {showAddFcModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setShowAddFcModal(false)}
        >
          <div className="modal">
            <div className="modal-heading">
              <div>
                <div className="section-kicker">SPACED REPETITION</div>
                <h2>Create Study Flashcard</h2>
                <p>Add key concepts, interview questions, or formulas for revision.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowAddFcModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFlashcard} className="task-form">
              <label>
                Subject
                <input
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  value={newFcForm.subject}
                  onChange={(e) => setNewFcForm({ ...newFcForm, subject: e.target.value })}
                />
              </label>

              <label>
                Question or Concept Prompt
                <textarea
                  required
                  rows={3}
                  className="task-form-textarea"
                  placeholder="e.g. What is the difference between TCP and UDP?"
                  value={newFcForm.question}
                  onChange={(e) => setNewFcForm({ ...newFcForm, question: e.target.value })}
                />
              </label>

              <label>
                Answer & Key Formula
                <textarea
                  required
                  rows={4}
                  className="task-form-textarea"
                  placeholder="e.g. TCP is connection-oriented with guaranteed delivery, while UDP is connectionless and faster."
                  value={newFcForm.answer}
                  onChange={(e) => setNewFcForm({ ...newFcForm, answer: e.target.value })}
                />
              </label>

              <label>
                Difficulty
                <select
                  value={newFcForm.difficulty}
                  onChange={(e) => setNewFcForm({ ...newFcForm, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddFcModal(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  <Plus size={16} /> Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal (Preserved exactly as original) */}
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

      {/* Confirmation Modal for Task Deletion (Preserved exactly as original) */}
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

// Reusable Task Row Component
function TaskRow({ task, deadlineInfo, aiInfo, onToggle, onDelete, onFocus }) {
  return (
    <article
      className={`task-row ${task.completed ? "task-done" : ""} ${
        deadlineInfo.isOverdue && !task.completed ? "task-row-overdue" : ""
      }`}
    >
      <button
        className={`task-check ${task.completed ? "checked" : ""}`}
        aria-label={`Mark task ${task.title} as ${task.completed ? "pending" : "complete"}`}
        onClick={() => onToggle(task)}
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

      {onFocus && !task.completed && (
        <button
          className="study-focus-btn"
          onClick={() => onFocus(task._id)}
          title="Start 25m Pomodoro focus session on this task"
        >
          <Play size={11} /> Focus
        </button>
      )}

      <button
        className="delete-button"
        aria-label={`Delete task ${task.title}`}
        onClick={() => onDelete(task)}
        title="Delete task"
      >
        <Trash2 size={15} />
      </button>
    </article>
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
