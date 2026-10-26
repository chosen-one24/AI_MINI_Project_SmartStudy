const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    deadline: { type: Date, required: true },
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    importance: { type: Number, min: 1, max: 5, default: 3 },
    estimatedHours: { type: Number, min: 0.25, max: 24, default: 1 },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
