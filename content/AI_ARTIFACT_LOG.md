# AI Artifact Log

## Portfolio Site Build

| Field | Value |
| --- | --- |
| Date | 2026-04-18 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Build a polished static portfolio website for the public-facing identity Jazhikho |
| Input materials used | User brief, public-safe profile summary, supplied public links, local Jazhikho logo files, public project metadata gathered from provided itch.io links |
| What AI produced | `index.html`, `styles/site.css`, `scripts/site.js`, `content/site-data.json`, `content/site-data.schema.json`, `README.md`, `VERSION.md`, and site asset organization |
| What the user accepted | Pending user review |
| What the user rejected | None recorded yet |
| What the user changed | Not recorded yet |
| Final approval | Pending |

Use this document to record future revisions to significant AI-assisted artifacts in the repository.

## Portfolio Project Grid Follow-Up

| Field | Value |
| --- | --- |
| Date | 2026-05-05 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Compact the About focus-area presentation, convert Featured into a project filter, remove the separate project media section, and render all public itch-discovered projects in one grid |
| Input materials used | User feedback, screenshots, existing site files, public itch profile HTML, generated itch project metadata |
| What AI produced | Updates to `index.html`, `styles/site.css`, `scripts/site.js`, `scripts/sync_itch_devlogs.py`, `content/site-data.json`, `content/site-data.schema.json`, generated feed JSON, `README.md`, and `VERSION.md` |
| What the user accepted | Pending user review |
| What the user rejected | The tall technical-strengths display, split Featured/Additional project sections, and separate Project Media section |
| What the user changed | User requested one project bin with Featured as a manually curated filter and public itch discovery driving project availability |
| Final approval | Pending |

## Portfolio Refinement And Itch Metadata Sync

| Field | Value |
| --- | --- |
| Date | 2026-05-05 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Refine the static portfolio with project filtering, grouped skills, portfolio snapshot stats, contribution bullets, expandable details, media-ready project data, and synced public itch project metadata |
| Input materials used | Existing site files, existing public-safe project JSON, public itch project pages, existing feed sync workflow, user-approved implementation plan |
| What AI produced | Updates to `index.html`, `styles/site.css`, `scripts/site.js`, `scripts/sync_itch_devlogs.py`, `.github/workflows/sync-itch-devlogs.yml`, `content/site-data.json`, `content/site-data.schema.json`, generated `content/itch-projects.json`, regenerated `content/itch-devlog.json`, `README.md`, and `VERSION.md` |
| What the user accepted | Pending user review |
| What the user rejected | None recorded yet |
| What the user changed | User requested a hybrid approach: sync itch metadata dynamically, but keep specific contribution claims curated in local JSON |
| Final approval | Pending |

## Itch Devlog Sync

| Field | Value |
| --- | --- |
| Date | 2026-04-18 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Add automatic itch.io devlog discovery and a generated latest-news feed for the site |
| Input materials used | Existing site files, public itch profile HTML, public project devlog RSS feeds |
| What AI produced | `scripts/sync_itch_devlogs.py`, `.github/workflows/sync-itch-devlogs.yml`, `content/itch-devlog.json`, and site changes to render the generated feed |
| What the user accepted | Pending user review |
| What the user rejected | None recorded yet |
| What the user changed | Not recorded yet |
| Final approval | Pending |

## Patreon Feed And News List Refresh

| Field | Value |
| --- | --- |
| Date | 2026-04-18 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Add Patreon public-post syncing and change the latest-news presentation from a ticker to a scrollable one-line list |
| Input materials used | Existing site files, current itch feed integration, user-provided Patreon app credentials, Patreon API reference, and the public Patreon URL |
| What AI produced | `scripts/sync_patreon_posts.py`, workflow updates, `content/patreon-posts.json`, and site changes to merge itch and Patreon items into one fixed-height latest-news list |
| What the user accepted | Pending user review |
| What the user rejected | The initial card-like news presentation that still read as multi-line blocks |
| What the user changed | User requested that the news display as a true one-line list, five visible rows high, with newest items first; a follow-up fix added versioned asset URLs to break GitHub Pages cache staleness |
| Final approval | Pending |

## Public Contact Link Update

| Field | Value |
| --- | --- |
| Date | 2026-04-18 |
| Model / tool used | Codex (GPT-5-based coding agent) |
| Task purpose | Add a public Fiverr profile link for freelance work requests |
| Input materials used | Existing site content JSON and the user-provided Fiverr URL |
| What AI produced | Updated `content/site-data.json` to include a Fiverr link card in the public links section |
| What the user accepted | Pending user review |
| What the user rejected | None recorded yet |
| What the user changed | User supplied the Fiverr profile URL and requested that it be used for work requests |
| Final approval | Pending |
