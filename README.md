# SmartStudy — AI-Powered Study Planner

An intelligent, explainable academic study management system built with **React 18 + Vite**, **Express.js**, **Local MongoDB**, and a transparent **Python heuristic AI engine**.

Designed specifically for university students, coursework revision, academic project evaluations, and viva defense presentations.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS design system (Dark & Light modes), Lucide React icons
- **Backend API**: Node.js, Express.js, Mongoose ODM, asynchronous child process runner
- **Database**: Local MongoDB Community Server (`mongodb://127.0.0.1:27017/smartstudy`)
- **AI Recommendation Engine**: Python 3 (`backend/ai.py`) implementing weighted multi-criteria heuristic prioritization with fallback subprocess execution

---

## 📂 Project Structure

```text
AI_MINI_Project_SmartStudy/
├── backend/
│   ├── models/
│   │   └── Task.js              # Mongoose schema & validation (title, subject, deadline, etc.)
│   ├── .env                     # Server environment variables (PORT, MONGODB_URI, PYTHON_CMD)
│   ├── .env.example             # Example environment template
│   ├── ai.py                    # Python heuristic recommendation & scoring engine
│   ├── package.json             # Express, Mongoose, CORS, Dotenv dependencies
│   └── server.js                # Express API server, routes, & Python runner
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React SPA with 6 dedicated workspace views
│   │   ├── index.css            # Complete design system tokens, themes, & animations
│   │   └── main.jsx             # React DOM entry point
│   ├── index.html               # HTML template & Google Fonts (DM Sans, Manrope)
│   ├── package.json             # React 18, Lucide React, Vite dependencies
│   └── vite.config.js           # Vite dev server configuration
└── README.md                    # Project documentation
```

---

## 🧠 Explainable AI Heuristic Prioritization Model

Unlike black-box machine learning models, SmartStudy uses a **fully explainable multi-factor heuristic evaluation function**. This makes it ideal for academic evaluations, viva demonstrations, and students who need clear rationale for study recommendations.

### Evaluation Formula

$$\text{Priority Score} = (\text{Urgency} \times 0.50) + (\text{Importance} \times 2.0 \times 0.30) + (\text{Difficulty} \times 2.0 \times 0.20)$$

Simplified:
$$\text{Priority Score} = (\text{Urgency} \times 0.50) + (\text{Importance} \times 0.60) + (\text{Difficulty} \times 0.40)$$

**Total Score Range**: $1.0\text{ to }10.0$ points.

### Factor Breakdown

1. **Deadline Urgency (50% Weight, 0.0 – 5.0 points)**:
   - **Overdue**: $10.0\text{ pts}$ (Tier: Overdue — highlighted at the top of the queue)
   - **Due within 12 hours**: $9.5\text{ pts}$ (Tier: Due Today)
   - **Due within 24 hours**: $9.0\text{ pts}$ (Tier: Due Today)
   - **Due within 3 days (72 hours)**: $7.5\text{ pts}$ (Tier: Due Soon)
   - **Due within 1 week (168 hours)**: $6.0\text{ pts}$ (Tier: Upcoming)
   - **Due within 2 weeks (336 hours)**: $4.0\text{ pts}$ (Tier: Upcoming)
   - **Due > 2 weeks**: $2.0\text{ pts}$ (Tier: Flexible)

2. **Academic Importance (30% Weight, 0.6 – 3.0 points)**:
   - Graded on a scale of $1\text{ to }5$ based on syllabus weight, exam credits, and grade impact:
     - 1 = Supplemental reading
     - 2 = Practice problem set
     - 3 = Standard weekly assignment / quiz
     - 4 = Major lab report / project milestone
     - 5 = Midterm / End-semester final examination

3. **Cognitive Difficulty (20% Weight, 0.4 – 2.0 points)**:
   - Graded on a scale of $1\text{ to }5$ based on cognitive effort and problem complexity:
     - 1 = Quick definition review
     - 2 = Concept reading
     - 3 = Moderate implementation / problem solving
     - 4 = Complex algorithm / multi-step proof
     - 5 = Intensive theoretical derivation / full-stack build

4. **Deterministic Tie-Breaking Rules**:
   - If two tasks have equal Priority Scores, order is resolved deterministically by:
     1. Overdue status (Overdue first)
     2. Exact hours remaining until deadline
     3. Higher Academic Importance
     4. Higher Cognitive Difficulty

---

## ⚡ Core Workspace Views & Features

The application features a modern sidebar navigation with **6 dedicated workspace modules**:

### 1. 📊 Academic Dashboard
- **Welcome & Quick Actions**: Instant access to "+ Add study task" and overall progress tracking.
- **Key Statistics Cards**: Real-time counters for **Total Tasks**, **Completed (%)**, **Pending Tasks** (with overdue warning badges), and **Study Workload** (total pending hours).
- **AI Heuristic Coach Panel**:
  - Highlights your **Top Recommended Task** with a personalized actionable prompt.
  - Interactive **Formula** toggle breaking down the exact mathematical calculation for transparency.
  - Full **Ranked Tasks Queue** with per-task scores and granular component breakdown (Urgency, Importance, Difficulty).
  - Quick **"Study Now"** button to jump directly into a Pomodoro session for the top task.
- **Workload Management**: Instant search, subject filter, status filter tabs (**All**, **To Do**, **Completed**, **Overdue**), and multi-criteria sorting.
- **One-Click Demo Seeding**: Populates realistic engineering coursework (Data Structures, Database Systems, OS, etc.) without creating duplicates.

### 2. 📋 My Study Tasks (Academic Task Manager)
- **Full-Width Workspace**: Designed for managing heavy coursework backlogs across all enrolled subjects.
- **Subject Filter Pills**: Filter tasks by subject (e.g., Data Structures, Operating Systems, Web Technologies) with one click.
- **Multi-Factor Sorting**: Sort by **Earliest Deadline**, **AI Priority Score**, **Highest Importance**, **Hardest First**, or **Estimated Duration**.
- **Interactive Task Rows**:
  - Checkbox toggle for instant completion updates with animated visual feedback.
  - Urgency badges (`Overdue`, `Due Today`, `Due Soon`, `Upcoming`).
  - Metric chips showing subject, estimated hours, difficulty level, and importance rating.
  - **Focus Button**: Instantly assigns the task as the target for the Pomodoro timer.
  - **Safe Deletion**: Deletion confirmation dialog prevents accidental loss of assignment data.

### 3. ⏱️ Study Planner & Pomodoro Focus Timer
- **Integrated Pomodoro Focus Timer**:
  - Three distinct intervals: **Focus (25 min)**, **Short Break (5 min)**, and **Long Break (15 min)**.
  - **Task Binding**: Pick any active study task from a dropdown to focus on.
  - **Streak & Session Tracker**: Counts completed focus sessions with flame indicator.
  - Smooth Play / Pause / Reset controls and animated clock display.
  - Automatic transition between focus and break modes with toast notifications.
- **Chronological Study Timeline**:
  - Automatically buckets pending tasks into 4 chronological roadmaps:
    1. **Immediate Action: Overdue Tasks** (high-visibility alert banner)
    2. **Today's Priority Queue** (due within 24 hours)
    3. **Due Soon** (next 2–3 days)
    4. **Upcoming Coursework & Milestones** (this week & beyond)
- **Daily Workload Capacity Monitor**:
  - Compares scheduled study hours for today against a recommended 4.0 hr/day study threshold.
  - Visual capacity bar with warning indicator if workload exceeds healthy study limits.
- **Subject Workload Distribution Breakdown**:
  - Visual breakdown displaying hours and percentage allocation per subject to ensure balanced study time.

### 4. 📇 Flashcards & Spaced Repetition Engine
- **3D Flip Card Scene**: Realistic 3D perspective flip card revealing concept explanations and key formulas upon clicking.
- **Leitner / SuperMemo Spaced Repetition**:
  - Grade your recall with 3 review tiers:
    - 🔴 **Hard**: Review in 1 day
    - 🟡 **Good**: Review in 3 days
    - 🟢 **Easy**: Mastered! Review in 7 days
  - Mastery status badges (`NEW`, `LEARNING`, `MASTERED`).
- **Subject Filtering**: Toggle between all subjects or focus on specific courses (Data Structures, Database Systems, Operating Systems, Web Technologies, Computer Networks).
- **Custom Flashcard Creator**: Modal dialog to create new flashcards with custom questions, detailed multi-line answers, subjects, and difficulty levels.
- **Local Storage Persistence**: Flashcards and spaced repetition intervals persist across sessions.

### 5. 🗓️ Visual Academic Calendar
- **Interactive Monthly Calendar Board**:
  - Month navigation (Previous, Next, and "Today" quick jump).
  - Displays day numbers, current day highlight, and visual dot indicators for dates with scheduled tasks.
  - Colored task pills displayed directly on calendar days (`Completed`, `Overdue`, `Due Today`).
- **Selected Day Inspector**:
  - Click any calendar date to inspect all assignments and revision topics scheduled for that day.
  - Direct **"+ Add task on this date"** button that pre-fills the selected date into the task creation form.

### 6. 📚 Subjects & Curriculum Syllabus Tracker
- **Course Overview Cards**:
  - Course code badges (e.g., `CS201`, `CS202`, `CS301`, `CS302`, `CS303`) and academic credits (e.g., 3 or 4 credits).
  - Visual syllabus progress bar calculating percentage of coursework completed for each subject.
  - Detailed metrics: Total Topics, Finished Topics, and Remaining Study Hours per course.
- **Integrated Topic Checklist**:
  - Direct task completion checkboxes inside each course card.
  - Quick **"Add topic to {Subject}"** button pre-filling the course in the creation modal.
- **Curriculum Summary Metrics**: Enrolled courses count, average syllabus completion %, total semester credits, and total remaining workload.

---

## 🎨 UI/UX & Design System Highlights

- **🌓 Dark & Light Mode Support**:
  - One-click theme toggle in the top bar.
  - Rich glassmorphic dark mode (`#10121b`) and clean high-contrast light mode (`#f8fafc`).
  - Saved in browser `localStorage` (`smartstudy_theme`).
- **🔔 Toast Notification System**:
  - Real-time feedback alerts for theme changes, task creation, updates, deletions, timer milestones, flashcard grading, and AI recommendations.
- **⚡ Quick Deadline Presets**:
  - One-click buttons in the task creation form: `+8h (Today)`, `+1 Day (Tomorrow)`, `+3 Days`, `+1 Week`.
- **⌨️ Keyboard Shortcuts & Accessibility**:
  - Press `Escape` to close any open modal (Task form, Flashcard form, Delete confirmation).
  - Semantic HTML, unique interactive element IDs, and full ARIA modal attributes.
- **🛡️ Resilient Python Execution**:
  - Multi-candidate fallback (`python` $\rightarrow$ `py` $\rightarrow$ `python3`).
  - Windows UTF-8 encoding configuration (`PYTHONIOENCODING=utf-8`).
  - 8-second safety timeout protection to prevent hanging processes.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher (available in system PATH)
- **MongoDB**: Local MongoDB Community Server running on default port `27017`

Verify MongoDB service status on Windows:
```powershell
Get-Service -Name *mongo*
```

---

### 2. Backend Setup

In a terminal window:

```powershell
cd backend
npm install
```

Configure `.env` (optional, defaults provided):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smartstudy
PYTHON_CMD=python
```

Start the backend API server:
```powershell
npm run dev
```

*Backend runs at `http://localhost:5000`.*

---

### 3. Frontend Setup

In a second terminal window:

```powershell
cd frontend
npm install
npm run dev
```

*Open the Vite link in your browser: `http://localhost:5173`.*

To build for production:
```powershell
npm run build
```

---

## 📡 REST API Reference

| Method | Endpoint | Description | Sample Request / Query |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint: MongoDB connection state and active Python command | `GET /api/health` |
| `GET` | `/api/tasks` | Retrieve all tasks sorted by completion status and deadline | `GET /api/tasks` |
| `POST` | `/api/tasks` | Create a new study task with input validation | `{ "title": "Revise B-Trees", "subject": "Data Structures", "deadline": "2026-10-30T14:00", "difficulty": 4, "importance": 5, "estimatedHours": 2 }` |
| `PATCH` | `/api/tasks/:id` | Toggle task completion or edit title, subject, deadline, difficulty, importance, or hours | `{ "completed": true }` |
| `DELETE` | `/api/tasks/:id` | Remove a task by its MongoDB ObjectId | `DELETE /api/tasks/671d123...` |
| `POST` | `/api/tasks/seed` | Populate 5 balanced university demo tasks across various subjects and urgency tiers (duplicate-safe) | `POST /api/tasks/seed` |
| `GET` | `/api/recommendations` | Execute Python AI engine (`backend/ai.py`) to rank pending tasks and generate personalized recommendation | `GET /api/recommendations` |

---

## 🎓 Viva & Academic Evaluation Key Talking Points

When presenting SmartStudy for an academic project evaluation or viva defense:

1. **Why Heuristic AI instead of a Black-Box Neural Network?**
   - Study planning requires **explainability** — students and educators need to know *why* an assignment is prioritized.
   - Heuristic evaluation provides deterministic, transparent, and auditable decisions without hallucination or training data bias.
2. **Multi-Factor Decision Formulation**:
   - Balances urgency (temporal deadline pressure), importance (syllabus weight), and difficulty (cognitive load) with secondary tie-breakers.
3. **Cross-Language Systems Integration**:
   - Demonstrates practical architecture integrating **Node.js / Express** with **Python 3** subprocess runners via standard I/O (JSON streaming) and safety timeout fallbacks.
4. **Full-Stack End-to-End Workflow**:
   - Complete data flow: React state $\rightarrow$ Express REST API $\rightarrow$ MongoDB Mongoose storage $\rightarrow$ Python AI computation $\rightarrow$ Real-time UI updates with Pomodoro focus sessions, flashcards, and calendar scheduling.

---

## 📄 License

This project is developed for educational and academic demonstration purposes.
