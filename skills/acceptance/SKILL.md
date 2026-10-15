---
name: acceptance
description: Stage 6 of Itqan. Verifies the built product against every acceptance criterion and NFR with evidence (fresh test runs, end-to-end runs, a UI scan for stray text, overflow and accessibility, screenshots against the wireframes) and writes the Acceptance Report (docs/05-acceptance.md). Use when the build is finished or the user asks whether the product is done.
---

# Stage 6: Acceptance

Run `itq.mjs start 6`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/acceptance.md`. Every claim follows `${CLAUDE_PLUGIN_ROOT}/vendor/superpowers/verification-before-completion.md`: run the command, read the output, then state the result with the evidence.

1. **Run everything fresh:** install, build, the full test suite and the end-to-end tests, in the browsers the Constitution lists. Keep the outputs.
2. **Start the app** with the Run command from `app/README.md` and confirm it answers.
3. **Reconnaissance, then action** (approach from Anthropic's webapp-testing skill, see NOTICES.md). For each story's main path: open the screen, wait for the network to settle, read the rendered page or take a screenshot to find the real controls, then act on them. Never act on guessed selectors. Compare key screens with the mockups in `docs/02-ux/mockups/`.
4. **UI scan of every screen:** sign in as each role through the UI, save the Playwright storage state, then run
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/ui-scan.mjs" --app app --url <base url> --routes "<every route, comma-separated>" --storage <state file>`
   once per role. It fails on stray "null", "undefined", "[object ...]" or "NaN" text, horizontal overflow at phone width, console errors, and serious axe violations (install `@axe-core/playwright` as a dev dependency for the accessibility part). Fix every FAIL in the build before writing the report. On Git Bash, the script repairs routes like `#/signin` that the shell rewrites.
5. **Screen rules from the UX Spec:** check them in the running app, including confirmation before destructive actions and all form errors shown at once next to their fields.
6. **Worst-case data pass** (`${CLAUDE_PLUGIN_ROOT}/vendor/break-ui/break-ui.md` with `CATALOG.md`, vendored from Emil Kowalski): map every value the screens render, seed realistic worst-case data through the app's real API or seed path into a scratch database (long and short names, unbreakable emails, counts of 0, 1 and 1,284, empty and 1,000-row lists, future and past dates, every status at once), then check the failure signatures at 320, 390 and 1440 px and at 200% zoom. Fix every Broken and Ugly finding in `app/` (test first) before the report; list Fragile ones as known gaps.
7. **Design critique of the built screens:** screenshot the P1 screens at 1440 and 390 px with realistic data and dispatch the `itqan:design-critic` agent with the screenshots, the matching mockups, the Visual direction and the tokens. Fix its top fixes in `app/`, re-run once, and record the final scores in the report.
8. **One line per AC:** `AC-n.m PASS. Evidence: <test name, file, command and result>` or `AC-n.m FAIL. Known gap: <what and why>`. One line per NFR with its measurement. Attach the UI scan output.
9. **Browser and device matrix** from the Constitution: tested or not tested, with the reason.
10. **No hidden problems.** List skipped, changed or flaky tests, and everything not verified.
11. **Close the build.** `itq.mjs check 5` must pass. Ask the user to confirm the build is complete, then `itq.mjs approve 5`.
12. Run `itq.mjs check 6`, fix the report until it passes, then ask the user to approve the Acceptance Report. On approval, `itq.mjs approve 6`.
