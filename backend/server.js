require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const path = require("path");
const Task = require("./models/Task");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartstudy";
let PYTHON_CMD = process.env.PYTHON_CMD || "python";

// Flexible CORS for local Vite dev server ports (5173, 5174, etc.)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Helper: Validate MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SmartStudy API",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    pythonCmd: PYTHON_CMD
  });
});

// GET /api/tasks — Retrieve all tasks sorted by completion status and deadline
app.get("/api/tasks", async (_req, res) => {
  try {
    const tasks = await Task.find().sort({ completed: 1, deadline: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch tasks", error: err.message });
  }
});

// POST /api/tasks — Create a new task with validation
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, subject, deadline, difficulty, importance, estimatedHours } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Task title is required." });
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ message: "Subject is required." });
    }
    if (!deadline) {
      return res.status(400).json({ message: "Deadline is required." });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ message: "Invalid deadline format. Must be a valid date/time." });
    }

    const diffNum = Number(difficulty ?? 3);
    const clampedDiff = Math.max(1, Math.min(5, isNaN(diffNum) ? 3 : Math.round(diffNum)));

    const impNum = Number(importance ?? 3);
    const clampedImp = Math.max(1, Math.min(5, isNaN(impNum) ? 3 : Math.round(impNum)));

    const estNum = Number(estimatedHours ?? 1);
    const clampedHours = Math.max(0.25, Math.min(24, isNaN(estNum) ? 1 : Number(estNum.toFixed(2))));

    const task = await Task.create({
      title: title.trim().slice(0, 120),
      subject: subject.trim().slice(0, 80),
      deadline: parsedDeadline,
      difficulty: clampedDiff,
      importance: clampedImp,
      estimatedHours: clampedHours,
      completed: false
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: "Could not create task", error: err.message });
  }
});

// PATCH /api/tasks/:id — Update a task (completion or attributes)
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID format." });
    }

    const updates = {};
    if (req.body.completed !== undefined) {
      updates.completed = Boolean(req.body.completed);
    }
    if (req.body.title && typeof req.body.title === "string" && req.body.title.trim()) {
      updates.title = req.body.title.trim().slice(0, 120);
    }
    if (req.body.subject && typeof req.body.subject === "string" && req.body.subject.trim()) {
      updates.subject = req.body.subject.trim().slice(0, 80);
    }
    if (req.body.deadline) {
      const parsedDeadline = new Date(req.body.deadline);
      if (!isNaN(parsedDeadline.getTime())) {
        updates.deadline = parsedDeadline;
      }
    }
    if (req.body.difficulty !== undefined) {
      const d = Number(req.body.difficulty);
      if (!isNaN(d)) updates.difficulty = Math.max(1, Math.min(5, Math.round(d)));
    }
    if (req.body.importance !== undefined) {
      const i = Number(req.body.importance);
      if (!isNaN(i)) updates.importance = Math.max(1, Math.min(5, Math.round(i)));
    }
    if (req.body.estimatedHours !== undefined) {
      const h = Number(req.body.estimatedHours);
      if (!isNaN(h)) updates.estimatedHours = Math.max(0.25, Math.min(24, Number(h.toFixed(2))));
    }

    const task = await Task.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: "Could not update task", error: err.message });
  }
});

// DELETE /api/tasks/:id — Remove a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID format." });
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({ message: "Task deleted successfully.", id: task._id });
  } catch (err) {
    res.status(400).json({ message: "Could not delete task", error: err.message });
  }
});

// POST /api/tasks/seed — Populate demonstration sample data without duplicating
app.post("/api/tasks/seed", async (_req, res) => {
  try {
    const now = Date.now();
    const sampleTasks = [
      {
        title: "Complete SQL Database Normalization Assignment",
        subject: "Database Systems",
        // Overdue by 1 day
        deadline: new Date(now - 24 * 60 * 60 * 1000),
        difficulty: 3,
        importance: 4,
        estimatedHours: 1.5,
        completed: false
      },
      {
        title: "Revise Binary Trees & Graph Traversals",
        subject: "Data Structures",
        // Due in 10 hours
        deadline: new Date(now + 10 * 60 * 60 * 1000),
        difficulty: 4,
        importance: 5,
        estimatedHours: 2.0,
        completed: false
      },
      {
        title: "Prepare Operating Systems Deadlock Slides",
        subject: "Operating Systems",
        // Due in 2 days
        deadline: new Date(now + 48 * 60 * 60 * 1000),
        difficulty: 3,
        importance: 3,
        estimatedHours: 1.5,
        completed: false
      },
      {
        title: "Build REST API Endpoints with Express",
        subject: "Web Technologies",
        // Due in 5 days
        deadline: new Date(now + 5 * 24 * 60 * 60 * 1000),
        difficulty: 4,
        importance: 4,
        estimatedHours: 3.0,
        completed: false
      },
      {
        title: "Read Chapter 4: Computer Networks OSI Model",
        subject: "Computer Networks",
        // Due in 10 days
        deadline: new Date(now + 10 * 24 * 60 * 60 * 1000),
        difficulty: 2,
        importance: 2,
        estimatedHours: 1.0,
        completed: false
      }
    ];

    const seeded = [];
    for (const sample of sampleTasks) {
      // Avoid duplication by matching title
      const exists = await Task.findOne({ title: sample.title });
      if (!exists) {
        const created = await Task.create(sample);
        seeded.push(created);
      }
    }

    const allTasks = await Task.find().sort({ completed: 1, deadline: 1 });
    res.json({
      message: seeded.length > 0
        ? `Added ${seeded.length} sample study task(s).`
        : "Sample study tasks are already loaded.",
      seededCount: seeded.length,
      totalCount: allTasks.length,
      tasks: allTasks
    });
  } catch (err) {
    res.status(500).json({ message: "Could not seed sample tasks", error: err.message });
  }
});

// Helper: Run Python AI script with command fallback and timeout protection
function executePythonAI(scriptPath, payload) {
  return new Promise((resolve, reject) => {
    const candidates = [PYTHON_CMD, "python", "py", "python3"];
    // Deduplicate candidate commands
    const commandsToTry = [...new Set(candidates)];

    function tryCommand(index) {
      if (index >= commandsToTry.length) {
        return reject(
          new Error(
            `Could not start Python. Tried: ${commandsToTry.join(", ")}. Ensure Python 3 is installed and in PATH.`
          )
        );
      }

      const cmd = commandsToTry[index];
      let stdout = "";
      let stderr = "";
      let hasFinished = false;

      const child = spawn(cmd, [scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONIOENCODING: "utf-8" }
      });

      // 8-second safety timeout
      const timer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          child.kill("SIGKILL");
          reject(new Error("Python AI recommendation engine timed out after 8 seconds."));
        }
      }, 8000);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.stdin.on("error", () => {
        // Prevent uncaught EPIPE error if process closes early
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        if (hasFinished) return;
        if (err.code === "ENOENT") {
          // Command not found, try next candidate
          return tryCommand(index + 1);
        }
        hasFinished = true;
        reject(err);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (hasFinished) return;
        hasFinished = true;

        if (code !== 0) {
          return reject(
            new Error(`Python process exited with code ${code}. Stderr: ${stderr || "No stderr output"}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout);
          // Update cached working python command
          PYTHON_CMD = cmd;
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Python returned invalid JSON: ${stdout.slice(0, 200)}`));
        }
      });

      try {
        child.stdin.end(payload);
      } catch (writeErr) {
        clearTimeout(timer);
        if (!hasFinished) {
          hasFinished = true;
          reject(writeErr);
        }
      }
    }

    tryCommand(0);
  });
}

// GET /api/recommendations — Run heuristic ranking via Python
app.get("/api/recommendations", async (_req, res) => {
  try {
    const tasks = await Task.find({ completed: false }).lean();

    const payload = JSON.stringify({
      tasks: tasks.map((t) => ({
        id: String(t._id),
        title: t.title,
        subject: t.subject,
        deadline: new Date(t.deadline).toISOString(),
        difficulty: t.difficulty,
        importance: t.importance,
        estimatedHours: t.estimatedHours,
        completed: t.completed
      }))
    });

    const scriptPath = path.join(__dirname, "ai.py");
    const result = await executePythonAI(scriptPath, payload);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: "Could not generate recommendations from Python AI module.",
      error: err.message
    });
  }
});

// 404 handler for unknown API routes
app.use("/api/*", (_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// Database connection & Server Startup
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB at", MONGODB_URI);
    app.listen(PORT, () => console.log(`SmartStudy API running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Make sure the local MongoDB service is running.");
    process.exit(1);
  });
