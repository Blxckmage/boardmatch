---
name: call-graph
description: Use when answering flow, path, trace, caller, architecture, or how-it-works questions ("How does X work?", "What calls X?", request paths, upstream/downstream traces, production vs test flows). Builds a plain-text hierarchical call graph with verified path:line evidence. Do not trigger for trivial facts, port/version questions, simple definitions, or text edits.
---

# Call Graph

Answer flow questions with a graph, not prose. Read the code first, draw the execution path, verify every node.

## Workflow

1. Determine requested scope — which flow, which entry point, production only or tests too.
2. Read repository instructions (`AGENTS.md`, `.docs/`).
3. Find the real entry point, callers, and callees with focused navigation: `fff_grep` for bare identifiers, `Read` the top hit after 2 greps max.
4. Inspect production wiring first — the graph clients actually execute.
5. Inspect tests only when the test graph may differ from production.
6. Build the hierarchical graph using real symbol names (functions, methods, services, jobs, queues, stores).
7. Verify every node resolves to a real `path:line` — never guess paths, symbols, callers, or line numbers.
8. Explain only what the graph cannot show: conditions, retries, errors, gotchas.
9. Stop when the requested scope is covered.

## Output

Follow `references/output-format.md` exactly: plain-text `ts` fence, two-space-indented `→` children, Production always, Tests only when different, `src:` evidence block. Skip the graph for trivial single-fact questions. Mark planned nodes `[new]`; never invent future line numbers.
