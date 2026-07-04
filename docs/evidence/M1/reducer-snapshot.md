# M1 S06 Reducer Snapshot

Snapshot target: `replay(mockFailureRun, mockFailureRun.length - 1)`

## Result

```plain text
runId: run-failure-agent-town-001
cursor: 29
currentEventId: failure-029
selectedEventId: failure-029
selectedAgentId: agent-planner
warnings: 0
quarantinedEvents: 0
```

## Run Summary

```plain text
totalEvents: 30
handoffCount: 3
toolCallCount: 8
memoryActionCount: 3
blockedCount: 2
errorCount: 1
```

## Agent Projection

```plain text
agent-planner     Planner     planner     done      square
agent-researcher  Researcher  researcher  talking   library
agent-coder       Coder       coder       working   workshop
agent-reviewer    Reviewer    reviewer    talking   review_room
agent-memory      Memory      memory      working   archive
```

## Edge And Bubble Projection

```plain text
edges: 10
visibleBubbles: 5
blockedEvents(selectBlockedEvents): 2
errorEvents(selectErrorEvents): 1
```

## Interpretation

This snapshot demonstrates the M1 invariant: given only an ordered AgentEvent fixture, the event engine reconstructs who is active, where each agent is located, what the current event is, what bubbles/edges are visible, and whether blocked/error states occurred. No renderer is involved.
