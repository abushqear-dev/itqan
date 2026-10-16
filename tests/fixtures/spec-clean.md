---
id: product-spec
---

# Product Spec: Shift Board

## Glossary
| Term | Meaning |
|------|---------|
| Volunteer | A person who signs up for shifts. |
| Shift | A time slot with a start, an end and a number of places. |
| Shift lead | A volunteer who runs one shift on the day. |

## Roles and permissions
- **Volunteer:** signs up for shifts.
- **Coordinator:** creates shifts.

## Features

### FEAT-01 Sign-up
Volunteers take places on shifts. Source: BRD paragraph 2.

#### US-01 Take a place
As a volunteer, I want to take a place on a shift so that the coordinator knows I am coming.
Priority: P1. Source: BRD paragraph 2.
Independent test: sign up for a shift with free places and see it on the My shifts page.

##### AC-01.1 Take a free place
WHEN a volunteer selects a shift with a free place, THE SYSTEM SHALL add the volunteer to the shift.
Example: Ana selects "Soup kitchen, Sat 9:00" with 2 free places -> the shift shows 1 free place (MSG.SIGNUP_DONE).

##### AC-01.2 Full shift
IF a shift has no free places, THEN THE SYSTEM SHALL reject the sign-up with MSG.SHIFT_FULL.
Example: a shift with 0 free places -> Ana sees MSG.SHIFT_FULL and is not added.

##### AC-01.3 Response time
WHEN a volunteer submits a sign-up, THE SYSTEM SHALL confirm it within 2 seconds.
Example: sign-up submitted at 9:00:00 -> confirmation shown by 9:00:02.

#### US-02 Leave a shift
As a volunteer, I want to leave a shift so that I can free my place when plans change.
Priority: P2. Source: A-1.
Independent test: leave a shift and see the free place count rise by 1.

##### AC-02.1 Leave
WHEN a volunteer leaves a shift, THE SYSTEM SHALL remove the volunteer from the shift.
Example: Ana leaves the shift -> free places go from 1 to 2.

##### AC-02.2 Late leave
IF a volunteer leaves less than 24 hours before the start, THEN THE SYSTEM SHALL show MSG.LATE_LEAVE.
Example: leave at 8:00 for a 9:00 shift the next day, 25 hours -> no warning; at 20 hours -> warning.

##### AC-02.3 Names
THE SYSTEM SHALL show at most 40 characters of a shift name.
Example: a 45-character name -> the first 40 characters are shown.

## Non-functional requirements

### NFR-01 Page load
THE SYSTEM SHALL load the shift list within 2 seconds on a 4G connection.
Measure: 95th percentile under 2 seconds.
Verify: Lighthouse CI.
