# AI Interview Test Alignment Notes

This area is still in a log-heavy development phase.
The current goal is to keep runtime iteration fast while reducing confusion from stale tests and legacy contracts.

## Policy

- Do not redesign the live interview runtime just to satisfy older tests.
- Prefer backward-compatible defaults for dependency objects when that does not change runtime behavior.
- Mark or remove unused legacy hooks/protocols when they no longer represent the current implementation.

## Applied Baseline

- `RuntimeExecutorDeps` keeps a backward-compatible default for `request_live_spoken_text_turn`.
- `ClientMessageRouterDeps` keeps backward-compatible defaults for the live-input wiring fields added after the original test contract.
- `web/hooks/use-interview-session.ts` was removed because it was unused and described an outdated websocket contract.
- `ai-interview/tests/test_voice_runtime.py` only injects the interview-service stub when the real module is not already loaded, so combined runs do not break backend patch targets.

## Remaining Triage Rule

If a test still fails after interface compatibility is restored, classify it as one of:

1. intended runtime behavior changed, so the expectation must move;
2. the runtime has a real regression;
3. the test still depends on an older contract and should be updated or retired.
