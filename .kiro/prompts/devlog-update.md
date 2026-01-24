# Devlog Update Prompt

When invoked, append a new entry to DEVLOG.md with the following format:

## Entry Format
```markdown
## [DATE]
- **Goal**: [What was being worked on]
- **Kiro commands used**: [List of @commands and /commands used]
- **Outputs produced**: [Files created/modified]
- **Manual edits (and why)**: [Any manual changes made outside Kiro]
- **Result**: [Outcome - success/partial/blocked]
- **Notes**: [Optional observations, decisions, or learnings]
```

## Usage
After completing a work session or feature, run this prompt to document:
1. What Kiro commands were used
2. What files were created or changed
3. Any manual interventions needed
4. The outcome of the session

## Example Entry
```markdown
## 2026-01-24 (afternoon)
- **Goal**: Set up SEO and performance steering docs
- **Kiro commands used**: @quickstart, direct file creation requests
- **Outputs produced**: 
  - .kiro/steering/seo.md
  - .kiro/steering/rich-links.md
  - .kiro/steering/performance.md
  - .kiro/steering/seo-page-spec.md
  - .kiro/steering/rich-link-pack.md
  - .kiro/steering/perf-budget.md
- **Manual edits (and why)**: None
- **Result**: Success - all steering docs committed
- **Notes**: Steering docs now cover SEO, rich links, and performance requirements in detail
```

## Automation
This prompt can be used to:
1. Review recent git commits
2. Summarize changes made
3. Generate and append the devlog entry
4. Optionally commit the updated DEVLOG.md
