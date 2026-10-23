---
id: product-spec
version: 1
status: draft
approved_at:
depends_on: docs/input
---

# Brief: <product name>

> **Approve this if:** these are the stories to build first, the "Later" list is fine to leave out, and the stack is acceptable. The scale you chose decides everything else.

## Summary
<Three sentences: who it is for, the one problem, and the main path from start to finish.>

## Scale
<Prototype | Demo>. Not included at this scale: <the "excludes" list from `itq.mjs scale show`>. Ask for a larger scale to get them.

## Roles and permissions
<Demo: one row per action, one column per role. Prototype with one role: write "Everyone can do everything.">
| Action | <Role A> | <Role B> |
|--------|----------|----------|
| <verb + object> | yes | no |

## Stack
<Runtime, framework, store, UI approach and test runner, each with a pinned version (e.g. "Node 24.1", "SQLite 3.45"). Prefer the fewest parts that start with two commands.>
Run: `<install>`, then `<start>`. Port <n>.

## Look
<Prototype: one line, e.g. "server-rendered pages, one stylesheet, system fonts, works on a phone". Demo: "see the UX Spec".>

## Seed data
<Demo: the realistic data the app starts with so every screen is full when shown: names, counts, one example of each state. Prototype: optional.>

## Features

### FEAT-01 <Feature name>

#### US-01 <Story title>
Priority: P1. Source: <an input sentence, or assumption A-n>.
Independent test: <how this story can be checked on its own>.

##### AC-01.1 <Short title>
WHEN <event>, THE SYSTEM SHALL <observable response>.
Example: <input> -> <result>

## Later
<Everything worth having that the scale's story cap leaves out, one line each, no IDs. Nothing is dropped silently; the user can promote an item by raising the scale or asking.>
- <e.g. Editing a published shift>

## Assumptions
<Assumption ids only; each is in `.itqan/ASSUMPTIONS.md` with its consequence for users.>
