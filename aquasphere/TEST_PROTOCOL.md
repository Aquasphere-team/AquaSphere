# Test Protocol - AquaSphere

## Test Run
- Date: 2026-04-08
- Environment: Windows, Angular/Karma, ChromeHeadless
- Executor role: Tester
- Source specification: TEST_SPECIFICATION.md

## Execution Notes
- Executed command: `npm test -- --watch=false --browsers=ChromeHeadless`
- The automated run executed existing unit tests from the repository.
- Browser instability occurred during run (Chrome disconnect/crash messages).
- In the latest run, all executable unit test assertions completed successfully: 20 of 20 tests passed.
- The overall command still ended with exit code 1 because Karma/Chrome disconnected and crashed after the successful assertions.

## Results per Test Case

| TC-ID | Result | If failed/blocked comment |
|---|---|---|
| APP01 | passed | App component created and title assertion passed. |
| APP02 | passed | App heading rendered successfully. |
| APP03 | passed | App title remained stable. |
| AQUA01 | passed | Aquarium component created successfully with mocked Supabase service. |
| ACH01 | passed | Achievement list contained all 11 defined achievements. |
| ACH02 | passed | First feeding achievement unlocked after one feed increment. |
| ACH03 | passed | One-hour play-time achievement unlocked. |
| ACH04 | passed | Reward theme list included the unlocked tropical theme. |
| ONB01 | passed | Onboarding started hidden by default. |
| ONB02 | passed | Onboarding became visible after start. |
| ONB03 | passed | Completing onboarding persisted the seen flag. |
| ONB04 | passed | Skipping onboarding hid the flow. |
| PART01 | passed | Particle initialization created the requested amount. |
| PART02 | passed | Feed burst added feed particles asynchronously. |
| PART03 | passed | Cleaning particles were spawned directly. |
| PART04 | passed | Cleaning removed feed particles and repopulated background particles. |
| FISH01 | passed | Starter fish creation produced the expected three fish. |
| FISH02 | passed | Adding a fish used the requested type and coordinates. |
| FISH03 | passed | Unknown fish types were ignored. |
| FISH04 | passed | Fish update increased hunger and applied movement. |
| UNIT01 | passed | Unit test suite completed successfully. Chrome/Karma still showed disconnect and crash warnings after the tests had already passed, so the process ended with exit code 1. |

## Run Summary
- Passed: 20
- Failed: 0
- Blocked: 0
- Total: 20

Pass rate in this run (passed/total): 20/20 = 100%
