---
name: acceptance
description: Stage 6 of Itqan. Verifies the built product against every acceptance criterion and NFR with evidence (tests, end-to-end runs, accessibility scan, screenshots against the wireframes) and writes the Acceptance Report (docs/05-acceptance.md). Use when the build is finished or the user asks whether the product is done.
---

# Stage 6: Acceptance

Run `itq.mjs start 6`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/acceptance.md`.

1. **Run everything fresh:** install, build, the full test suite, end-to-end tests, the accessibility scan, in the browsers the Constitution lists. Save the outputs.
2. **Use the app.** Start it with the Run command, walk the main path of every story in a real browser (Playwright or the built-in browser), and compare key screens to the wireframes with screenshots.
3. **One line per AC:** `AC-n.m PASS. Evidence: <test name, file, command and result>` or `AC-n.m FAIL. Known gap: <what and why>`. One line per NFR with its measurement.
4. **Browser and device matrix** from the Constitution: tested or not tested, with the reason.
5. **No hidden problems.** List skipped, changed or flaky tests, and everything not verified.
6. **Close the build.** `itq.mjs check 5` must pass (every task done in `.itqan/build-log.md`, every AC named by a test). Ask the user to confirm the build is complete, then `itq.mjs approve 5`.
7. Run `itq.mjs check 6`, fix the report until it passes, then ask the user to approve the Acceptance Report. On approval, `itq.mjs approve 6`.
