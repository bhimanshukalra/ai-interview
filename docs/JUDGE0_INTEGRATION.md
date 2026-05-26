# Judge0 Integration Plan

This document describes how to add sandboxed code execution to the AI interview app using Judge0.

The goal is to support a practical `Run code` workflow inside the existing code editor without turning this project into a full online judge.

## Recommendation

Use Judge0 as the first execution provider, but keep it behind a small provider interface.

Judge0 is a good fit because it is designed for online IDEs, coding assessments, and multi-language code execution. The app should not couple UI or API contracts directly to Judge0-specific request/response shapes.

## Product Scope

First version:

- Run the current editor code for supported languages.
- Show execution status, stdout, stderr, compile output, and runtime errors.
- Enforce input size, code size, timeout, and result size limits.
- Keep execution results ephemeral.
- Do not persist execution attempts yet.
- Do not use execution output directly as AI evaluation truth.

Out of scope for the first version:

- Custom test-case suites.
- Hidden tests.
- Scoring by execution result.
- Multi-file projects.
- Package installation.
- Terminal access.
- Long-running interactive programs.
- User-provided Docker images.

## Architecture

Add code execution as an API-owned capability.

```text
web CodeEditor
  -> API execute-code route
    -> CodeExecutionProvider
      -> Judge0
```

The frontend should never call Judge0 directly. The API owns:

- provider credentials
- language mapping
- input validation
- timeout policy
- response normalization
- error handling
- future audit/rate-limit hooks

## Provider Interface

Create a provider boundary in the API:

```text
apps/api/src/code-execution/
  index.ts
  types.ts
  language-map.ts
  providers/
    judge0.ts
```

Suggested interface:

```ts
export type CodeExecutionInput = {
  code: string;
  language: CodeEditorLanguage;
  stdin?: string;
};

export type CodeExecutionResult = {
  status: 'queued' | 'running' | 'completed' | 'failed';
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  message?: string;
  timeMs?: number;
  memoryKb?: number;
};

export type CodeExecutionProvider = {
  execute(input: CodeExecutionInput): Promise<CodeExecutionResult>;
};
```

Keep Judge0-specific fields inside the Judge0 provider.

## Shared Schemas

Add shared schemas under `packages/shared`, either in `schemas/interviews.ts` if small or a new `schemas/code-execution.ts` if it grows.

Recommended new file:

```text
packages/shared/src/schemas/code-execution.ts
```

Suggested schemas:

```ts
export const ExecuteCodeSchema = z.object({
  code: z.string().min(1).max(20000),
  language: CodeEditorLanguageSchema,
  stdin: z.string().max(4000).optional(),
});

export const CodeExecutionResultSchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  compileOutput: z.string().optional(),
  message: z.string().optional(),
  timeMs: z.number().optional(),
  memoryKb: z.number().optional(),
});
```

Export these from `packages/shared/src/index.ts`.

## API Route

Add a protected route:

```text
POST /interviews/:id/questions/:questionId/code/execute
```

Request:

```json
{
  "language": "typescript",
  "code": "console.log('hello');",
  "stdin": ""
}
```

Response:

```json
{
  "status": "completed",
  "stdout": "hello\n",
  "stderr": "",
  "compileOutput": "",
  "timeMs": 120,
  "memoryKb": 2048
}
```

Authorization:

- The user must be able to access the interview.
- Owners and candidates can execute code.
- Interviewers can observe code but should not execute in the first version.
- The question must belong to the interview.

This should reuse the same access rules used by answer submission and the collaborative code room.

## Judge0 Configuration

Add API environment variables:

```env
CODE_EXECUTION_PROVIDER=judge0
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=...
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

If self-hosting Judge0 later, `JUDGE0_API_KEY` and `JUDGE0_API_HOST` may not be needed.

Local fallback:

```env
CODE_EXECUTION_PROVIDER=mock
```

The mock provider should return deterministic output for development and tests.

## Language Mapping

Keep mapping in the API, not the client.

Initial supported languages:

```text
typescript -> Judge0 TypeScript language id
javascript -> Judge0 JavaScript language id
python     -> Judge0 Python language id
sql        -> defer or map only if Judge0 environment supports the chosen SQL engine
```

Important decision: SQL is different from normal program execution. For the first version, either:

- disable `Run code` for SQL, or
- support SQL only with a clearly defined sample database later.

Recommendation: disable execution for SQL in the first slice.

## Frontend UI

Add execution controls to:

```text
apps/web/src/features/interviews/code-room/code-editor.tsx
```

Controls:

- `Run` button
- optional stdin textarea collapsed under the editor
- execution status
- stdout/stderr/compile output panel

Button behavior:

- disabled when editor is read-only
- disabled while execution is running
- disabled for unsupported languages such as SQL in the first slice

Result panel:

```text
Output
  stdout
Errors
  stderr
Compile output
  compileOutput
```

Keep the panel compact. This is still an interview screen, not a full IDE.

## Safety Limits

Even with Judge0, enforce app-level limits before calling the provider:

- max code size: `20000` chars
- max stdin size: `4000` chars
- max output displayed: `8000` chars
- request timeout: short, for example `10-15s`
- no persistence in first version
- no retries for user code failures

Do not log full code, stdin, stdout, or stderr by default. Logs can include:

- interview id
- question id
- user id
- language
- provider status
- duration
- error category

## Phased Implementation

### Phase 1: Contracts And Provider Boundary

- Add shared execute-code request/response schemas.
- Add API provider interface and mock provider.
- Add Judge0 provider skeleton.
- Add language mapping.

Done when:

- API can execute through mock provider.
- Typecheck passes.

### Phase 2: API Route

- Add protected execute-code route.
- Validate request with shared schema.
- Reuse interview/question access checks.
- Return normalized execution result.
- Handle provider timeout/failure cleanly.

Done when:

- Authorized candidate can execute code.
- Unauthorized user cannot execute code.
- Interviewer is blocked from execution in first version.

### Phase 3: Judge0 Provider

- Implement Judge0 submission creation.
- Poll or wait for result according to selected Judge0 API mode.
- Normalize stdout/stderr/compile output/status.
- Add environment configuration.

Done when:

- JavaScript/Python execution works against Judge0.
- Provider errors return user-facing API errors without leaking internals.

### Phase 4: Code Editor UI

- Add `Run` button to the editor header.
- Add optional stdin input.
- Add output panel.
- Disable unsupported language execution.
- Show loading/error states.

Done when:

- User can run code from the collaborative editor.
- Output appears without disrupting answer saving.

### Phase 5: Hardening

- Add rate limiting or per-user throttling if needed.
- Add result truncation.
- Add focused tests for validation, auth, provider errors, and unsupported language.
- Add production runbook notes.

Done when:

- Execution failures are understandable.
- The app remains responsive when execution fails or times out.

## Testing Checklist

- Authorized owner can run supported code.
- Authorized candidate can run supported code.
- Interviewer cannot run code in first version.
- Unauthorized user cannot run code.
- SQL execution is disabled or explicitly supported.
- Empty code is rejected.
- Oversized code is rejected.
- Oversized stdin is rejected.
- Infinite loop times out.
- Syntax error shows compile/runtime output.
- Provider outage shows a clear error.
- Save answer still stores code independently of execution.
- Report and AI evaluation still use saved answer code, not transient execution output.

## Future Enhancements

- Persist execution attempts for interview playback.
- Add interviewer-visible execution history.
- Add test-case authoring.
- Add hidden tests for assessment-style interviews.
- Add SQL execution with a controlled sample database.
- Use execution output as supporting evaluation context after prompt design is updated.
