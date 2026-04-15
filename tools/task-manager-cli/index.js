#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const VALID_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "cancelled",
]);

function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case "list-tasks":
        listTasks();
        break;
      case "start-task":
        startTask(args[0]);
        break;
      case "complete-task":
        completeTask(args[0], args.slice(1).join(" "));
        break;
      case "cancel-task":
        cancelTask(args[0], args.slice(1).join(" "));
        break;
      case "--help":
      case "-h":
      case undefined:
        printHelp();
        break;
      default:
        fail(`Unknown command: ${command}`);
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function printHelp() {
  console.log("Usage:");
  console.log("  task-manager list-tasks");
  console.log("  task-manager start-task <task_id>");
  console.log('  task-manager complete-task <task_id> "Brief description"');
  console.log('  task-manager cancel-task <task_id> "Reason"');
}

function listTasks() {
  const tasks = readTasks();

  if (tasks.length === 0) {
    console.log("No tasks found in documentation/tasks.");
    return;
  }

  for (const task of tasks) {
    console.log(`${task.id} | ${task.status} | ${task.priority} | ${task.title}`);
  }
}

function startTask(taskId) {
  requireValue(taskId, "Missing task ID. Usage: task-manager start-task <task_id>");

  const taskFile = findTaskFile(taskId);
  const task = readJson(taskFile);

  if (task.status === "completed") {
    throw new Error(`Task ${taskId} is already completed.`);
  }

  if (task.status === "in_progress") {
    console.log(`Task ${taskId} is already in progress.`);
    return;
  }

  task.status = "in_progress";
  task.startedAt = new Date().toISOString();
  task.updatedAt = task.startedAt;
  delete task.completedAt;
  delete task.completionDetails;
  delete task.cancelledAt;
  delete task.cancellationReason;

  writeJson(taskFile, task);
  console.log(`Started ${task.id}: ${task.title}`);
}

function completeTask(taskId, details) {
  requireValue(taskId, 'Missing task ID. Usage: task-manager complete-task <task_id> "Description"');
  requireValue(details, 'Missing completion details. Usage: task-manager complete-task <task_id> "Description"');

  const taskFile = findTaskFile(taskId);
  const task = readJson(taskFile);
  const timestamp = new Date().toISOString();

  task.status = "completed";
  task.completedAt = timestamp;
  task.updatedAt = timestamp;
  task.completionDetails = details.trim();

  if (!task.startedAt) {
    task.startedAt = timestamp;
  }

  delete task.cancelledAt;
  delete task.cancellationReason;

  writeJson(taskFile, task);
  console.log(`Completed ${task.id}: ${task.title}`);
}

function cancelTask(taskId, reason) {
  requireValue(taskId, 'Missing task ID. Usage: task-manager cancel-task <task_id> "Reason"');
  requireValue(reason, 'Missing cancel reason. Usage: task-manager cancel-task <task_id> "Reason"');

  const taskFile = findTaskFile(taskId);
  const task = readJson(taskFile);
  const timestamp = new Date().toISOString();

  task.status = "cancelled";
  task.cancelledAt = timestamp;
  task.updatedAt = timestamp;
  task.cancellationReason = reason.trim();

  writeJson(taskFile, task);
  console.log(`Cancelled ${task.id}: ${task.title}`);
}

function readTasks() {
  const tasksDir = findTasksDir(process.cwd());
  const files = fs
    .readdirSync(tasksDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const task = readJson(path.join(tasksDir, file));

    if (!VALID_STATUSES.has(task.status)) {
      task.status = "pending";
    }

    return task;
  });
}

function findTaskFile(taskId) {
  const tasksDir = findTasksDir(process.cwd());
  const directPath = path.join(tasksDir, `${taskId}.json`);

  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const files = fs.readdirSync(tasksDir).filter((entry) => entry.endsWith(".json"));
  const match = files.find((file) => {
    const task = readJson(path.join(tasksDir, file));
    return task.id === taskId;
  });

  if (!match) {
    throw new Error(`Task ${taskId} was not found in documentation/tasks.`);
  }

  return path.join(tasksDir, match);
}

function findTasksDir(startDir) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, "documentation", "tasks");

    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("Could not find documentation/tasks from the current directory.");
    }

    currentDir = parentDir;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function requireValue(value, message) {
  if (!value || !value.trim()) {
    throw new Error(message);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();
