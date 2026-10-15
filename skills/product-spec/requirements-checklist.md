# Requirements self-check ("unit tests for English")

Adapted from Spec Kit's `checklist` command (MIT, see NOTICES.md). Run this on your own draft before the independent review. Each item tests the **writing of the requirements**, not the future implementation. Answer each one for the draft; fix every "no" before review.

## Completeness
- Does every role in the permissions table have at least one story?
- Does every relationship between entities in the inputs (who belongs to what) have an owner and an action?
- Does every feature have its unwanted-behaviour criteria (IF ... THEN), not only the happy path?
- Is every edge-case category answered with AC ids or a reasoned n/a?

## Clarity
- Is every vague word ("manage", "quickly", "a few", "fair") replaced by a rule or a number?
- Does every criterion describe one observable behaviour with one concrete example?
- Is every glossary term used verbatim, with no synonyms?

## Consistency
- Do any two criteria contradict each other (limits, states, who may act)?
- Does any criterion contradict the Constitution or a clarification answer?

## Measurability
- Can a tester decide pass or fail for every criterion from its text and example alone?
- Does every NFR have a number, a unit and a verification method?

## Coverage
- Are primary, alternate, error and recovery flows covered for each P1 story?
- Are notifications covered for every party affected by a change?
- Are time-based rules covered (deadlines, past and future dates, the exact boundary)?

## Traceability
- Does every story name its source (input sentence, clarification, or assumption)?
- Is everything that rests only on an assumption marked `proposed`?

Bad item (tests the implementation): "Verify the sign-up button works."
Good item (tests the requirement): "Is it specified what happens when the last spot is taken by someone else while the form is open?"
