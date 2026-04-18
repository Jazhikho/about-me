# AGENTS.md

This repository contains a static public-facing portfolio site for the game developer identity `Jazhikho`.

## Core rules

- Treat this as a public portfolio site, not an internal tool.
- Do not add personally identifying information unless the user explicitly asks for it and confirms it is public-safe.
- Do not surface a legal name, phone number, street address, private resume details, or non-public work details.
- Use the alias/brand name `Jazhikho` for public-facing copy unless the user explicitly requests otherwise.
- Keep the tone professional, concise, thoughtful, and industry-facing.
- Avoid user-facing implementation commentary such as notes about the site being lightweight, static, easy to deploy, or similar internal/owner-facing remarks unless the user specifically wants that copy on the page.

## Technical rules

- This site must remain compatible with GitHub Pages.
- Use plain HTML, CSS, and minimal vanilla JavaScript only unless the user explicitly approves something else.
- Do not introduce a build step.
- Keep paths relative so the site works when hosted from a static root.
- Keep content data in JSON where practical so updates do not require large HTML rewrites.
- Preserve semantic HTML, accessibility, responsive behavior, and readable contrast.

## Content rules

- Only use public-safe information for portfolio content.
- Prefer grounded, supportable descriptions over hype.
- If content is missing, use restrained placeholders and make it easy for the user to replace them.
- Keep branding imagery proportional and intentional; do not stretch the logo.

## Workflow rules

- Before making broad design or content changes, inspect the existing files and work with the current structure.
- After making changes, run a reasonable verification step for the type of edit made.
- Every change should be committed and pushed before the task is considered complete.
- If committing or pushing cannot be done because the repository is not initialized, the branch is missing, or no remote is configured, state that blocker clearly.

## Files of interest

- `index.html` for page structure
- `styles/site.css` for presentation
- `scripts/site.js` for behavior
- `content/site-data.json` for editable site content
- `README.md` for maintenance and deployment notes
