# Call Graph Output Format

````text
graph: <short title>

Production:
```ts
EntryPoint
  → ComponentA
    → ComponentA.method
      → [condition] ComponentB
        → {queue_or_store}
```

Tests:
```ts
TestEntryPoint
  → ComponentATestLayer
    → ComponentA.method
      → ComponentBTestLayer
```

src:
  EntryPoint → path/to/file.ts:LINE
  ComponentA → path/to/component.ts:LINE
  ComponentA.method → path/to/component.ts:LINE
  ComponentB → path/to/other.ts:LINE
````

## Rules

- Plain text only; no Mermaid, no rendered diagrams.
- `ts` fence, two-space-indented `→` children; root has no arrow.
- Real functions, methods, services, jobs, queues, stores — never invented names.
- Production always; Tests only when the graph differs — never invent a test graph.
- Verified `path:line` evidence for every unique node.
- Skip the graph for trivial single-fact questions.
- Mark planned nodes `[new]`; never invent future line numbers.
