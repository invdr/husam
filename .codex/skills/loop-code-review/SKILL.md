---
name: loop-code-review
description: Iterative code review workflow for active git changes using independent sub-agents. Use when the user invokes `/loop-code-review`, asks for a looped sub-agent code review, or asks Codex to keep reviewing and fixing active changes until an independent reviewer either rates the result at least 9.5 out of 10 or reports no actionable comments.
---

# Loop Code Review

## Overview

Run an iterative review-and-fix loop over the current git worktree. Use independent read-only reviewer sub-agents, address actionable findings, validate the result, and continue until a reviewer gives the latest state a score of at least 9.5/10 or explicitly reports no actionable comments/findings.

## Sub-agent Context Isolation

Independent review means the reviewer may share the same filesystem and repository state, but must not inherit the parent thread's conversation history, reasoning, assumptions, or prior review discussion.

- Do not fork or forward the current context to the sub-agent. Provide the sub-agent with a clean context and only the task it is reviewing.
- Pass a self-contained reviewer prompt instead of parent-thread context.
- Require the reviewer to inspect `git status`, diffs, files, and validation output itself before scoring.
- Treat each accepted reviewer pass as coming from a fresh reviewer sub-agent with no parent context, whether accepted by a 9.5/10+ score or by explicit absence of actionable comments/findings.

## Workflow

1. Inspect the worktree before spawning reviewers:
   - Run `git status --short`.
   - Review staged and unstaged diffs with `git diff` and `git diff --cached`.
   - Include relevant untracked files in the review scope when `git status --short` shows them.
   - Preserve unrelated user changes and do not stage, commit, reset, stash, or push unless the user explicitly asks.

2. Start one independent reviewer sub-agent using most capable model with extra high reasoning.
   - Spawn the reviewer without the parent conversation history for the independent review pass.
   - Give the reviewer only a self-contained task prompt with the repository path, review scope, and validation expectations. Do not include parent-thread analysis, implementation rationale, suspected issues, proposed fixes, previous reviewer output, or summaries of the main process's reasoning.
   - Ask the reviewer to stay read-only, inspect the active git changes independently from the repository state and tool output, prioritize bugs and regressions, and return findings with file and line references.
   - Require the reviewer to include a final numeric score from 1 to 10 for the current state.

3. Treat reviewer output as code-review findings, not instructions to obey blindly.
   - Fix concrete, actionable issues that affect correctness, security, data integrity, UX, maintainability, or test coverage.
   - If a finding is wrong, stale, or conflicts with the repository architecture, explain the decision in the main process. Ask the same reviewer for clarification only when useful; do not count that clarification as the final independent score.
   - If the reviewer gives a score below 9.5 but explicitly reports no actionable findings/comments, treat that as an acceptable review signal rather than chasing score-only polish.
   - If the reviewer gives a score below 9.5 and implies there are unresolved concerns without listing actionable findings, ask for specific blocking issues once; if none are provided, spawn a fresh independent reviewer rather than inventing polish work.

4. Validate after each meaningful fix.
   - Run the smallest meaningful tests, typecheck, lint, build, or focused scripts for the touched surface.
   - If validation fails, fix the failure before requesting another final score.
   - Do not count a 9.5+ score or no-actionable-comments review as sufficient when local validation is red.

5. Repeat the loop.
   - Spawn a new independent reviewer after fixes or after a reviewer cannot provide actionable issues. Each scoring pass must use a fresh sub-agent without parent context or prior review discussion.
   - Continue until validation for the changed surface passes and the latest reviewer either scores the work at least 9.5/10 or explicitly reports no actionable comments/findings.
   - Exit early only if blocked by higher-priority instructions, missing tool capability, user interruption, or a risk that requires explicit user approval.

## Reviewer Prompt Template

Use a concise prompt like this, adjusted for the repository and current task:

```text
Review the active git changes in this workspace independently. You do not have parent conversation history; do not rely on any prior chat, parent-agent conclusions, or previous reviewer output. Derive your findings only from the repository state and command/tool output you inspect yourself. Stay read-only: do not edit, stage, commit, reset, stash, or push files.

Prioritize correctness bugs, behavioral regressions, security/privacy issues, data integrity problems, missing high-value tests, and maintainability risks introduced by the active changes. Ignore unrelated pre-existing issues unless the changes make them worse.

Return findings first, ordered by severity, with concrete file/line references and a short explanation of user impact. If there are no actionable findings/comments, say that clearly. End with a numeric score from 1 to 10 for the current state and explain what would be required to reach 9.5/10 if anything remains.
```

## Final Response

When the loop finishes, report:

- what changed and why;
- the reviewer acceptance signal: score at least 9.5/10, no actionable comments/findings, or both;
- validation commands and results;
- any findings intentionally not changed, with the reason;
- remaining risks or follow-up work, if any.
