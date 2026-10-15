---
type: llm
---

PASS if the agent saved the vision as an input, recorded it as the only source, and then either asked a single numbered batch of Constitution questions with suggested defaults or showed a Constitution draft and asked for approval.
FAIL if it wrote the Product Spec or any later document, treated anything as approved without the user saying so, or invented features the vision never mentions without marking them proposed.
