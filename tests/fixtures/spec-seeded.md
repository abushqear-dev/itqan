---
id: product-spec
---

# Product Spec: Shift Board (seeded defects)

## Glossary
| Term | Meaning |
|------|---------|
| Volunteer | A person who signs up for shifts. |
| Shift | A time slot with a start, an end and a number of places. |

## Roles and permissions
- **Volunteer:** signs up for shifts.
- **Coordinator:** creates shifts.

## Features

### FEAT-01 Sign-up

#### US-01 Take a place
As a volunteer, I want to take a place on a shift so that the coordinator knows I am coming.
Priority: P1. Source: BRD paragraph 2.
Independent test: sign up for a shift with free places.

##### AC-01.1 D1 subjective
WHEN a volunteer selects a shift, THE SYSTEM SHALL respond quickly.
Example: select a shift -> response.

##### AC-01.2 D2 ambiguous
WHEN a volunteer selects a shift, THE SYSTEM SHALL show a reasonable number of places.

##### AC-01.3 D3 loophole
WHEN a volunteer signs up, THE SYSTEM SHALL send a confirmation if necessary.

##### AC-01.4 D4 open-ended
THE SYSTEM SHALL show the shift name, time, place, etc.

##### AC-01.5 D5 superlative
THE SYSTEM SHALL list the best shifts first.

##### AC-01.6 D6 comparative
WHEN the list loads, THE SYSTEM SHALL be faster.

#### US-02 Leave a shift
As a volunteer, I want to leave a shift so that I can free my place.
Priority: P2. Source: A-1.

##### AC-02.1 D7 negative
WHEN a volunteer leaves, THE SYSTEM SHALL not keep the volunteer on the shift.

##### AC-02.2 D8 pronoun
WHEN a volunteer leaves a shift, it SHALL free the place.

##### AC-02.3 D9 reference
WHEN a volunteer leaves late, THE SYSTEM SHALL warn the same as AC-02.1.

##### AC-02.4 D10 compound
WHEN a volunteer leaves a shift, THE SYSTEM SHALL free the place and notify the coordinator.

##### AC-02.5 D11 double shall
THE SYSTEM SHALL free the place. THE SYSTEM SHALL log the change.

##### AC-02.6 D12 drift
WHEN a member leaves a shift, THE SYSTEM SHALL free the place.
