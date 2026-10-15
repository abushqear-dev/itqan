# Clarifying the inputs

Adapted from Spec Kit's `clarify` command (MIT, see NOTICES.md). Itqan asks one batch per stage, not one question at a time.

## 1. Scan
Mark each category Clear, Partial or Missing against the inputs and the Constitution:

1. **Functional scope and behaviour:** core goals, what is out of scope, the roles and what each may do.
2. **Domain and data:** entities, attributes, relationships (who belongs to what), identity and uniqueness, lifecycle and state transitions, data volume.
3. **Interaction and flow:** critical journeys, empty, loading and error states, accessibility or language needs.
4. **Quality attributes:** performance, reliability, security and privacy, compliance.
5. **Integrations:** external services and their failure modes, import and export formats.
6. **Edge cases and failure handling:** negative scenarios, limits, concurrent changes by two users.
7. **Constraints and trade-offs:** platform, hosting, explicit rejected options.
8. **Terminology:** the canonical term for each concept; synonyms to avoid.
9. **Completion signals:** can each behaviour be tested; what "done" means.
10. **Placeholders:** vague words ("manage", "a few", "fair", "robust") without a measure.

## 2. Choose questions
- Only Partial or Missing items whose answer would change behaviour, data, the UI or the tests. Never ask what the inputs already answer, and never ask about technology or task breakdown here.
- Rank by impact times uncertainty. At most **eight** questions, in **one numbered batch**, highest impact first.

## 2b. Choose the recommended answer
- Recommend what **comparable, well-regarded products** do for this situation, for these users. Never recommend the cheapest option by default.
- If an option would remove or omit a capability that users of comparable products expect (fixing a mistake, being told about a change that affects them, reversing an action, seeing complete data), tag the question **[scope-cut]** and recommend keeping the capability.
- A [scope-cut] question is never settled by "use defaults" or "you decide": only the user's own words can cut the capability. Without them, keep the capability (as a P2 story) and record it.

## 3. Write each question
```
1. **Question:** <a full question ending with "?">
   Why it matters: <one plain sentence: what goes wrong if this is guessed>
   **Recommended:** <option letter> - <one or two sentences why>
   | Option | Meaning |
   |--------|---------|
   | A | ... |
   | B | ... |
   | Short | your own answer (5 words or fewer) |
```
Use a short-answer form ("**Suggested:** <answer> - <why>") when there are no natural options. Everyday words; no IDs or section names as the question itself. Tell the user they can answer with letters, "recommended" for all, or their own words.

## 4. Write the answers back
- Add one line per answer under `## Clarifications` in the Product Spec: `- Q: <question> -> A: <answer> (<date>)`.
- Apply each answer to the right place: a story or criterion, the permissions table, the glossary, an NFR measure, or the edge cases. Replace any statement the answer contradicts; never leave both.
- An unanswered question, or "you decide": use the recommendation, record it as assumption A-n with its consequence, and mark the stories that rest only on it `proposed`. For a [scope-cut] question, the recommendation is to keep the capability; never cut it on a default.
- Record who decided: `(user)` or `(default A-n)`.
- A reading of an input phrase that is now settled also goes in `## Interpretations`.
