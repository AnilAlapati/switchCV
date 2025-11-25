# Feature #6 - Recruiter Dashboard React Hooks

## Overview

Complete set of React hooks for managing recruiter dashboard state and operations with zero external dependencies beyond React.

## Hooks Created

### 1. **useRecruiterPipeline** (217 lines)

State management for the recruitment pipeline, candidate lifecycle, and pipeline queries.

#### Features

- **Pipeline Initialization**: Create empty pipeline for new jobs
- **Candidate Management**: Add, move, and update candidates through pipeline stages
- **Priority Management**: Update candidate priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Notes System**: Add categorized notes to candidates
- **Querying**: Get candidates by stage or priority, search by name/email
- **Analytics**: Calculate pipeline metrics (conversion rate, time-to-hire, etc.)

#### API

```typescript
useRecruiterPipeline(): UseRecruiterPipelineReturn

Return Type:
{
  pipeline: RecruitmentPipeline | null
  loading: boolean
  error: string | null

  // Operations
  initialize(jobId: string, jobTitle: string): void
  addCandidate(name, email, position, phone?): void
  moveCandidate(candidateId, newStage): void
  updatePriority(candidateId, priority): void
  addNote(candidateId, content, category): void

  // Queries
  getCandidates(stage): Candidate[]
  searchCandidates(query): Candidate[]
  getMetrics(): PipelineMetrics
}
```

#### Usage Example

```typescript
function CandidateBoard() {
  const { pipeline, addCandidate, moveCandidate, getMetrics } =
    useRecruiterPipeline();

  // Initialize pipeline
  useEffect(() => {
    if (!pipeline) {
      initialize("job_123", "Senior Engineer");
    }
  }, []);

  // Add new candidate
  const handleAddCandidate = (name, email) => {
    addCandidate(name, email, "Senior Engineer");
  };

  // Move to next stage
  const handleMoveStage = (candidateId) => {
    moveCandidate(candidateId, PipelineStage.SCREENED);
  };
}
```

### 2. **useInterviewScheduling** (219 lines)

State management for interview scheduling, rescheduling, and feedback collection.

#### Features

- **Interview Scheduling**: Create interview records with type, time, duration, interviewers
- **Status Management**: Track interview status (SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW)
- **Feedback Collection**: Record interview feedback and ratings
- **Rescheduling**: Update interview times
- **Cancellation**: Cancel interviews with optional reasons
- **Upcoming Interviews**: Query upcoming interviews within specified days

#### API

```typescript
useInterviewScheduling(): UseInterviewSchedulingReturn

Return Type:
{
  interviews: Interview[]
  upcomingInterviews: Interview[]
  loading: boolean
  error: string | null

  // Operations
  scheduleNewInterview(candidateId, jobId, type, time, duration, interviewers): void
  updateInterviewStatus(interviewId, status): void
  addFeedback(interviewId, feedback): void
  rescheduleInterview(interviewId, newTime): void
  cancelInterview(interviewId, reason?): void

  // Queries
  getUpcoming(days?): void
}
```

#### Interview Types

- PHONE: Phone screening
- VIDEO: Video interview
- IN_PERSON: In-person interview
- CODING: Technical/coding interview
- PANEL: Panel interview with multiple interviewers

#### Usage Example

```typescript
function InterviewCalendar() {
  const {
    upcomingInterviews,
    scheduleNewInterview,
    addFeedback,
    rescheduleInterview,
  } = useInterviewScheduling();

  // Schedule interview
  const handleSchedule = (candidateId, interviewType) => {
    scheduleNewInterview(
      candidateId,
      "job_123",
      InterviewType.VIDEO,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      60,
      ["interviewer@company.com"]
    );
  };

  // Add interview feedback
  const handleAddFeedback = (interviewId, feedback) => {
    addFeedback(interviewId, {
      rating: FeedbackRating.GOOD,
      strengths: ["Problem-solving", "Communication"],
      weaknesses: ["Experience with React"],
      recommendation: "Move to next round",
      comments: "Strong candidate overall",
    });
  };

  // Get upcoming interviews
  useEffect(() => {
    getUpcoming(7); // Next 7 days
  }, []);

  return (
    <div>
      {upcomingInterviews.map((interview) => (
        <InterviewCard
          key={interview.id}
          interview={interview}
          onReschedule={() => rescheduleInterview(interview.id, newDate)}
        />
      ))}
    </div>
  );
}
```

### 3. **useBulkActions** (132 lines)

State management for batch operations on multiple candidates.

#### Features

- **Action Creation**: Create bulk actions for multiple candidates
- **Execution**: Execute pending actions asynchronously
- **Cancellation**: Cancel pending actions before execution
- **Status Tracking**: Track action status (pending, completed, failed)
- **History**: View completed and failed actions
- **Cleanup**: Clear completed actions from history

#### API

```typescript
useBulkActions(): UseBulkActionsReturn

Return Type:
{
  pendingActions: BulkAction[]
  completedActions: BulkAction[]
  loading: boolean
  error: string | null

  // Operations
  createAction(action: string, candidateIds: string[]): void
  executeAction(actionId: string): Promise<void>
  cancelAction(actionId: string): void
  clearCompleted(): void

  // Queries
  getActionStatus(actionId): "pending" | "completed" | "failed" | null
}
```

#### Usage Example

```typescript
function BulkOperations() {
  const {
    pendingActions,
    completedActions,
    createAction,
    executeAction,
    cancelAction,
  } = useBulkActions();

  // Create bulk action to move candidates
  const handleBulkMove = (candidateIds, newStage) => {
    createAction(`move-to-${newStage}`, candidateIds);
  };

  // Execute bulk action
  const handleExecute = async (actionId) => {
    try {
      await executeAction(actionId);
      toast.success("Bulk action completed");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Cancel pending action
  const handleCancel = (actionId) => {
    cancelAction(actionId);
  };

  return (
    <div>
      <h3>Pending Actions: {pendingActions.length}</h3>
      {pendingActions.map((action) => (
        <div key={action.id}>
          <p>
            {action.actionType} - {action.candidateIds.length} candidates
          </p>
          <button onClick={() => handleExecute(action.id)}>Execute</button>
          <button onClick={() => handleCancel(action.id)}>Cancel</button>
        </div>
      ))}

      <h3>Completed Actions: {completedActions.length}</h3>
      {completedActions.map((action) => (
        <p key={action.id}>{action.actionType} ✓</p>
      ))}
    </div>
  );
}
```

## Hook Design Patterns

### 1. **Error Handling**

All hooks include error states and try-catch blocks:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  // operation
  setError(null);
} catch (err) {
  setError(err instanceof Error ? err.message : "Operation failed");
}
```

### 2. **Loading States**

Loading indicators for async operations:

```typescript
const [loading, setLoading] = useState(false);
setLoading(true);
// async operation
setLoading(false);
```

### 3. **Immutable Updates**

State updates using spread operators to maintain immutability:

```typescript
setInterviews((prev) => [
  ...prev.map((i) => (i.id === interviewId ? { ...i, status: newStatus } : i)),
]);
```

### 4. **useCallback for Performance**

All callbacks memoized to prevent unnecessary re-renders:

```typescript
const updateCandidate = useCallback(
  (id, updates) => {
    // implementation
  },
  [pipeline]
); // dependencies listed
```

## Integration with Core Modules

### From recruiterPipeline.ts

```typescript
-createCandidate() -
  updateCandidatePriority() -
  addCandidateNote() -
  getCandidatesByStage() -
  searchCandidatesInPipeline() -
  scheduleInterview() -
  getUpcomingInterviews() -
  calculatePipelineMetrics();
```

### From recruiterPipelineHelpers.ts

```typescript
-initializePipeline() -
  addCandidateToPipeline() -
  moveCandidateInPipeline() -
  createBulkAction();
```

## Testing Strategy (TBD)

### Unit Tests

- [ ] Hook initialization
- [ ] State updates
- [ ] Error handling
- [ ] Callback memoization
- [ ] Edge cases (empty arrays, null values)

### Integration Tests

- [ ] Hook combinations (pipeline + interviews)
- [ ] State synchronization
- [ ] Async operations
- [ ] Real-world workflows

## Performance Considerations

### Optimizations Applied

1. **useCallback memoization**: Prevents recreating functions on every render
2. **Conditional state updates**: Only update when necessary
3. **Immutable patterns**: Enables React's optimization
4. **Separated concerns**: Each hook handles single responsibility

### Potential Enhancements

- Add useRef for tracking previous values
- Implement debouncing for search operations
- Add caching layer for queries
- Batch updates for better performance

## Code Quality Metrics

### Hook Statistics

- **Total Lines**: 568 lines
- **Files**: 3 hooks
- **Average Size**: 189 lines per hook
- **All under limit**: ✅ Yes (300-line recommended)
- **TypeScript**: ✅ Strict mode
- **Error Handling**: ✅ Comprehensive
- **Documentation**: ✅ Complete

### Coverage Status

✅ Complete state management for:

- Candidate lifecycle (add, move, update)
- Interview scheduling (schedule, reschedule, feedback)
- Bulk operations (create, execute, track)

## Next Steps

### Immediate

1. Create API routes (`/api/recruiter/*`)
2. Integrate hooks with React components
3. Build comprehensive test suite

### Future Enhancements

- Advanced filtering and sorting
- Multi-user collaboration support
- Real-time updates via WebSocket
- Analytics visualization
- Export to CSV/Excel
- Custom pipeline configurations

---

**Status**: React Hooks complete ✅
**Test Coverage**: 0% (pending test implementation)
**API Integration**: Ready for API routes (TBD)
**Component Integration**: Ready for UI components (TBD)
