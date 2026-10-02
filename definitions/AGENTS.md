Always start the session by saying "Using Agent HAnS."

## If, AND ONLY IF, you are a primary agent

### Before you begin

At the start of every session, perform these checks before doing any work:

- **Git repository check**: Check whether the project directory is a git repository. If it is not, ask the user if they would like you to initialize one with `git init`. Explain that git is required for the Agent HAnS to track file changes and build summaries. Only run `git init` if the user agrees.

On EVERY user prompt that results in — or could possibly result in — code changes (no matter how small), the primary agent MUST follow this checklist in order. **Do not skip any step, do not reorder steps, do not combine steps.**

**What counts as "code changes"**: Any edit to any file in the project — including CSS-only changes, visual redesigns, configuration updates, dependency changes, file renames, comment edits, and any file tracked by `.feature-to-file` or `.feature-to-folder` or containing feature annotations. If in doubt, treat it as a code change.

1. **Read the feature model**: Use the `agent-hans_get-feature-model` MCP tool to retrieve the current feature model. This ensures you are working with the latest state of all features before making any decisions.
2. **Feature model first**: Load the `feature-model-skill` and determine which features in the .feature-model are affected (added, modified, or removed). **Reload this skill on every prompt, even if it was loaded earlier in this session** — context compression may have removed the instructions.
3. **Load the annotation skill**: Load the `embedded-feature-annotation-skill`. **Reload it on every prompt, even if it was loaded earlier in this session**, same reason as above.

> **STOP — do not write or edit any file until steps 0–3 above are complete.** If you find yourself editing code without having completed the worktree check, read the feature model via MCP, and loaded both skills on this prompt, you are violating the workflow.

4. **Write and verify code with annotations**: Annotate changed implementation code according to the annotation skill. Before finishing, verify annotation coverage and scope according to that skill, and confirm that every referenced feature exists in .feature-model.

Annotations describe implemented features, not session ownership. Preserve valid existing `.feature-to-file`, `.feature-to-folder`, fragment, and line annotations if their features were not deleted. When adding a mapping pair, append it without deleting or replacing still-valid pairs. If changed code implements multiple features, retain coverage for all of them at the appropriate scopes. Never label a shared snippet solely with the current feature just because it was edited in this session.

For UI composition and constructor calls, follow the annotation skill's **UI composition and feature-specific arguments** guidance. Adding a child, argument, property, style, or callback does not mean that its feature owns the entire statement. Keep the existing coverage for the component or object’s main responsibility, and annotate only the feature-specific contribution at the smallest meaningful scope.

Shared layout and later uses should not inherit a feature just because they reference that feature’s component.

5. **Display summary**: After all changes are complete, ALWAYS display a summary using the MCP server (`agent-hans_summary-gui`), including all features that were added, modified, or removed.

There are NO exceptions to this workflow. It applies to new features, bug fixes, refactors, configuration changes, and even single-line edits — as long as the change touches code related to a feature in the model.

Instruct agents you delegate to to NOT use the MCP server to display summaries, as the primary agent will handle this.

## If you are a subagent

Act as usual.
Do NOT use the MCP server to display summaries.
