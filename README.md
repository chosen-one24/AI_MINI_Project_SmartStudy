# SmartStudy — AI-Powered Study Planner

An intelligent, explainable student study planner built with **React + Vite**, **Express.js**, **Local MongoDB**, and a transparent **Python heuristic AI engine**.

Designed specifically for academic project evaluations, viva defense, and focused personal learning.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS design system, Lucide React icons
- **Backend API**: Node.js, Express.js, Mongoose ODM, child process runner
- **Database**: Local MongoDB Community Server (`mongodb://127.0.0.1:27017/smartstudy`)
- **AI Recommendation Engine**: Python 3 (`backend/ai.py`) using weighted multi-criteria heuristic evaluation

---

## 🧠 AI Heuristic Prioritization Model

SmartStudy uses a fully transparent and explainable heuristic evaluation function (ideal for demonstrating intelligent decision algorithms in an AI lab or viva presentation without black-box ML):

$$\text{Priority Score} = (\text{Urgency} \times 0.50) + (\text{Importance} \times 0.60) + (\text{Difficulty} \times 0.40)$$

Where:
- **Urgency (50% weight, 0–5.0 pts)**:
  - **Overdue**: 10.0 urgency score (Tier: Overdue — prioritized at the top of study queue)
  - **Due within 12 hours**: 9.5 urgency score (Tier: Due Today)
  - **Due within 24 hours**: 9.0 urgency score (Tier: Due Today)
  - **Due within 3 days**: 7.5 urgency score (Tier: Due Soon)
  - **Due within 1 week**: 6.0 urgency score (Tier: Upcoming)
  - **Due within 2 weeks**: 4.0 urgency score (Tier: Upcoming)
  - **Due > 2 weeks**: 2.0 urgency score (Tier: Flexible)
- **Importance (30% weight, 0.6–3.0 pts)**:
  - Academic credit & syllabus weight (1 = Supplemental reading to 5 = Midterm / Final exam)
- **Difficulty (20% weight, 0.4–2.0 pts)**:
  - Cognitive effort and problem complexity (1 = Quick review to 5 = Intensive derivation)
- **Deterministic Tie-Breaking**:
  - Secondary tie-breakers: Overdue status $\rightarrow$ Hours left $\rightarrow$ Importance $\rightarrow$ Difficulty.

---

## ⚡ Key Features

1. **AI Heuristic Coach**:
   - Analyzes pending study tasks, generates personalized recommendations, and displays transparent score factor breakdowns.
   - Interactive **Formula** toggle in the dashboard explaining the exact evaluation criteria.
2. **Search & Instant Filtering**:
   - Instant search across topics, assignments, and subjects.
   - Filter tabs: **All Tasks**, **To Do**, **Completed**, and **Overdue** (with visual alert badges).
3. **Multi-Criteria Sorting**:
   - Sort by **Earliest Deadline**, **AI Priority Score**, **Highest Importance**, **Hardest First**, or **Estimated Duration**.
4. **Study Workload & Analytics**:
   - Total tasks, completion percentage, remaining pending tasks, and **Total Estimated Study Workload (Hours)**.
5. **One-Click Demo Sample Seeding**:
   - Populates 5 balanced, realistic university coursework tasks across varied subjects and urgency levels with zero duplicate creation.
6. **Safe Task Management**:
   - Modal confirmation before task deletion to prevent accidental data loss.
   - Quick deadline presets (`+8h Today`, `+1 Day`, `+3 Days`, `+1 Week`) for rapid assignment logging.
7. **Resilient Python Execution**:
   - Multi-command fallback (`python` $\rightarrow$ `py` $\rightarrow$ `python3`), Windows CP1252/UTF-8 encoding safety, and process timeout safeguards.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher in PATH)
- **MongoDB Community Server** running locally on port 27017

Verify MongoDB is running:
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

Configure `.env` (optional, default provided):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smartstudy
PYTHON_CMD=python
```

Start the backend:
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

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status, MongoDB connection, and detected Python command |
| `GET` | `/api/tasks` | Retrieve all tasks sorted by completion and deadline |
| `POST` | `/api/tasks` | Create a new study task with validated inputs |
| `PATCH` | `/api/tasks/:id` | Toggle task completion or update task attributes |
| `DELETE` | `/api/tasks/:id` | Delete a task by MongoDB ObjectId |
| `POST` | `/api/tasks/seed` | Seed 5 demo tasks without creating duplicates |
| `GET` | `/api/recommendations` | Execute Python AI module to rank active tasks and generate recommendation |
