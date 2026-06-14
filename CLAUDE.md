# Claude Code Task Management Guide

## Mandatory HERO Table, List, and Form Standards

When implementing any feature related to a table, list, CRUD page, admin data page, reporting table, or operational dataset, you MUST use or extend the reusable table/form components instead of building one-off UI.

### Required reusable components

- Use `MinimalTableShell` or `AdminTableCard` for table/list pages.
- Use `TableMultiFilter` for combobox-style multi filters.
- Use `AdminImportDialog` for Excel/CSV import with field mapping.
- Use `EnterpriseScorecards` via `scorecards` on `MinimalTableShell`/`AdminTableCard` for dynamic scorecards.
- Use `EnterpriseActionButtons` for view/edit/delete row actions with icons and RBAC gating.
- Use `EnterpriseColumnVisibility` when a feature needs user-controlled visible columns.
- Use `EnterpriseRecordDialog` for view/edit/delete/form popups.
- Use `EnterpriseFormGrid` inside dialogs for responsive form layout.

### Required table/list behavior

Every feature that uses a table/list MUST provide:

1. A clean, readable table layout with consistent spacing and sticky-friendly headers where appropriate.
2. Horizontal and vertical scrolling support for wide/long datasets.
3. Search and filter controls, including combobox/multi-select filters where relevant.
4. Excel/CSV import with mapping preview for data-entry or admin datasets.
5. Excel export with clean column labels and filtered row support.
6. Pagination with page size controls.
7. Dynamic scorecards summarizing the dataset when metrics are relevant.
8. Row action icons for view, edit, and delete.
9. RBAC integration so unauthorized users cannot edit/delete and view access is respected.
10. Column visibility controls when users may need to choose which columns are shown.

### Required form/dialog behavior

Every create/edit/view form for table-driven features MUST:

1. Open in a popup dialog unless the workflow clearly requires a dedicated page.
2. Use a polished, responsive layout with `EnterpriseRecordDialog` and `EnterpriseFormGrid`.
3. Be scrollable on small screens and long forms.
4. Keep headers, body, and footer visually separated.
5. Use clear action buttons and RBAC-aware disabled/hidden states.

## Memory Management

### Available Memory Files
- `CLAUDE.md` (mandatory) - Project-specific rules and workflows
- `MEMORY.md` (optional) - General project memory
- `.memory/` (optional) - Specialized memory files

### Memory Loading Protocol
1. Always load `CLAUDE.md` first (mandatory)
2. Load `MEMORY.md` if exists
3. Scan `.memory/` directory for additional context
4. Use `memory-manager` skill for complex memory operations

### Memory Updates
- Update relevant memory files after significant changes
- Add timestamps to memory updates
- Keep individual memory files under 2000 tokens
- Compress combined memory if total exceeds 4000 tokens

## Documentation Available

📚 **Project Documentation**: Check the documentation files in this directory for project-specific setup instructions and guides.
**Project Tasks**: Check the tasks directory in documentation/tasks for the list of tasks to be completed. Use the CLI commands below to interact with them.

## MANDATORY Task Management Workflow

🚨 **YOU MUST FOLLOW THIS EXACT WORKFLOW - NO EXCEPTIONS** 🚨

### **STEP 1: DISCOVER TASKS (MANDATORY)**
You MUST start by running this command to see all available tasks:
```bash
task-manager list-tasks
```

### **STEP 2: START EACH TASK (MANDATORY)**
Before working on any task, you MUST mark it as started:
```bash
task-manager start-task <task_id>
```

### **STEP 3: COMPLETE OR CANCEL EACH TASK (MANDATORY)**
After finishing implementation, you MUST mark the task as completed, or cancel if you cannot complete it:
```bash
task-manager complete-task <task_id> "Brief description of what was implemented"
# or
task-manager cancel-task <task_id> "Reason for cancellation"
```

## Task Files Location

📁 **Task Data**: Your tasks are organized in the `documentation/tasks/` directory:
- Task JSON files contain complete task information
- Use ONLY the `task-manager` commands listed above
- Follow the mandatory workflow sequence for each task

## MANDATORY Task Workflow Sequence

🔄 **For EACH individual task, you MUST follow this sequence:**

1. 📋 **DISCOVER**: `task-manager list-tasks` (first time only)
2. 🚀 **START**: `task-manager start-task <task_id>` (mark as in progress)
3. 💻 **IMPLEMENT**: Do the actual coding/implementation work
4. ✅ **COMPLETE**: `task-manager complete-task <task_id> "What was done"` (or cancel with `task-manager cancel-task <task_id> "Reason"`)
5. 🔁 **REPEAT**: Go to next task (start from step 2)

## Task Status Options

- `pending` - Ready to work on
- `in_progress` - Currently being worked on  
- `completed` - Successfully finished
- `blocked` - Cannot proceed (waiting for dependencies)
- `cancelled` - No longer needed

## CRITICAL WORKFLOW RULES

❌ **NEVER skip** the `task-manager start-task` command
❌ **NEVER skip** the `task-manager complete-task` command  (use `task-manager cancel-task` if a task is not planned, not required, or you must stop it)
❌ **NEVER work on multiple tasks simultaneously**
✅ **ALWAYS complete one task fully before starting the next**
✅ **ALWAYS provide completion details in the complete command**
✅ **ALWAYS follow the exact 3-step sequence: list → start → complete (or cancel if not required)**