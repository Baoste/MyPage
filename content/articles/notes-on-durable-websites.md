---
id: notes-on-durable-websites
title: Notes on durable websites
summary: Structure, content boundaries, and small operational choices that make a personal site easier to keep.
tags:
  - Engineering
  - Maintenance
createdAt: 2025-12-03
---

A personal website is useful only if it remains easy to change. The initial launch matters, but the tenth small update is the better test of the system.

## Put changeable things in clear places

Profile details belong in configuration, long-form writing belongs in content files, and records that grow over time belong in a database. When these boundaries stay clear, routine edits stop feeling risky.

## Prefer boring foundations

Stable tools, explicit data shapes, and a small dependency surface are advantages. They make problems easier to diagnose and future redesigns easier to attempt.

## Leave instructions for later

Documentation is a note to your future self. Record the setup that cannot be inferred from source code, especially secrets, storage policies, and deployment settings.
