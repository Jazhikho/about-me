from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


PROFILE_URL = "https://jazhikho.itch.io/"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "content" / "itch-devlog.json"
PROJECTS_OUTPUT_PATH = Path(__file__).resolve().parents[1] / "content" / "itch-projects.json"
USER_AGENT = "JazhikhoPortfolioSync/1.0 (+https://github.com/Jazhikho/about-me)"
MAX_ITEMS = 12
MAX_SUMMARY_LENGTH = 180


@dataclass(frozen=True)
class Project:
    title: str
    url: str

    @property
    def slug(self) -> str:
        return urlparse(self.url).path.strip("/")

    @property
    def feed_url(self) -> str:
        return f"{self.url.rstrip('/')}/devlog.rss"


class ProjectLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._current_href: str | None = None
        self._current_chunks: list[str] = []
        self.projects: list[Project] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return

        attrs_dict = dict(attrs)
        css_class = attrs_dict.get("class", "")
        href = attrs_dict.get("href", "")

        if "title" in css_class.split() and "game_link" in css_class.split() and href.startswith(PROFILE_URL):
            self._current_href = href.rstrip("/")
            self._current_chunks = []

    def handle_data(self, data: str) -> None:
        if self._current_href is not None:
            self._current_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or self._current_href is None:
            return

        title = normalize_space("".join(self._current_chunks))

        if title:
          self.projects.append(Project(title=title, url=self._current_href))

        self._current_href = None
        self._current_chunks = []


class HTMLTextStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def get_text(self) -> str:
        return normalize_space(" ".join(self.parts))


class ProjectMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_info_panel = False
        self.panel_depth = 0
        self.in_row = False
        self.in_cell = False
        self.cell_chunks: list[str] = []
        self.current_row: list[str] = []
        self.rows: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)

        if tag == "div":
            css_class = attrs_dict.get("class", "")

            if "game_info_panel_widget" in css_class.split():
                self.in_info_panel = True
                self.panel_depth = 1
                return

            if self.in_info_panel:
                self.panel_depth += 1

        if not self.in_info_panel:
            return

        if tag == "tr":
            self.in_row = True
            self.current_row = []

        if tag == "td" and self.in_row:
            self.in_cell = True
            self.cell_chunks = []

        if tag == "abbr" and self.in_cell:
            title = attrs_dict.get("title")

            if title:
                self.cell_chunks.append(title)

    def handle_data(self, data: str) -> None:
        if self.in_info_panel and self.in_cell:
            self.cell_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self.in_info_panel:
            return

        if tag == "td" and self.in_cell:
            self.current_row.append(normalize_space(" ".join(self.cell_chunks)))
            self.in_cell = False
            self.cell_chunks = []
            return

        if tag == "tr" and self.in_row:
            if len(self.current_row) >= 2:
                label = normalize_space(self.current_row[0])
                value = normalize_space(" ".join(self.current_row[1:]))

                if label and value:
                    self.rows[label] = value

            self.in_row = False
            self.current_row = []
            return

        if tag == "div":
            self.panel_depth -= 1

            if self.panel_depth <= 0:
                self.in_info_panel = False
                self.panel_depth = 0


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})

    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def discover_projects(profile_url: str) -> list[Project]:
    parser = ProjectLinkParser()
    parser.feed(fetch_text(profile_url))

    unique: dict[str, Project] = {}

    for project in parser.projects:
        unique[project.url] = project

    return list(unique.values())


def parse_feed(project: Project) -> list[dict[str, str]]:
    try:
        xml_text = fetch_text(project.feed_url)
    except HTTPError as error:
        if error.code == 404:
            return []
        raise
    except URLError:
        return []

    root = ET.fromstring(xml_text)
    channel = root.find("channel")

    if channel is None:
        return []

    items: list[dict[str, str]] = []

    for item in channel.findall("item"):
        title = get_text(item.findtext("title"))
        link = get_text(item.findtext("link"))
        published = parse_pub_date(item.findtext("pubDate"))
        description = truncate_summary(strip_html(item.findtext("description") or ""))

        if not title or not link or not published:
            continue

        items.append(
            {
                "project_title": project.title,
                "project_slug": project.slug,
                "project_url": project.url,
                "title": title,
                "link": link,
                "published_at": published,
                "summary": description,
            }
        )

    return items


def parse_project_metadata(project: Project) -> dict[str, object]:
    parser = ProjectMetadataParser()
    parser.feed(fetch_text(project.url))
    rows = parser.rows

    return {
        "title": project.title,
        "slug": project.slug,
        "url": project.url,
        "status": rows.get("Status", ""),
        "category": rows.get("Category", ""),
        "genre": rows.get("Genre", ""),
        "made_with": split_metadata_list(rows.get("Made with", "")),
        "tags": split_metadata_list(rows.get("Tags", "")),
        "ai_disclosure": split_metadata_list(rows.get("AI Disclosure", "")),
        "updated_at": parse_itch_updated_at(rows.get("Updated", "")),
        "updated_text": rows.get("Updated", ""),
    }


def split_metadata_list(value: str) -> list[str]:
    return [
        item.strip()
        for item in re.split(r"\s*,\s*", value)
        if item.strip()
    ]


def parse_itch_updated_at(value: str) -> str:
    match = re.search(r"\b\d{2} [A-Za-z]+ \d{4} @ \d{2}:\d{2} UTC\b", value)

    if not match:
        return ""

    try:
        parsed = datetime.strptime(match.group(0), "%d %B %Y @ %H:%M UTC")
    except ValueError:
        return ""

    return parsed.replace(tzinfo=UTC).isoformat()


def parse_pub_date(value: str | None) -> str:
    if not value:
        return ""

    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return ""

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC).isoformat()


def strip_html(value: str) -> str:
    stripper = HTMLTextStripper()
    stripper.feed(value)
    return stripper.get_text()


def truncate_summary(value: str) -> str:
    if len(value) <= MAX_SUMMARY_LENGTH:
        return value

    shortened = value[: MAX_SUMMARY_LENGTH - 1].rsplit(" ", 1)[0]
    return f"{shortened}…"


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def get_text(value: str | None) -> str:
    return normalize_space(value or "")


def sort_items(items: Iterable[dict[str, str]]) -> list[dict[str, str]]:
    return sorted(items, key=lambda item: item["published_at"], reverse=True)


def build_output(projects: list[Project], items: list[dict[str, str]]) -> dict[str, object]:
    sorted_items = sort_items(items)[:MAX_ITEMS]

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_profile_url": PROFILE_URL,
        "discovered_projects": [
            {
                "title": project.title,
                "slug": project.slug,
                "url": project.url,
                "feed_url": project.feed_url,
            }
            for project in projects
        ],
        "items": sorted_items,
    }


def build_project_output(project_metadata: list[dict[str, object]]) -> dict[str, object]:
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_profile_url": PROFILE_URL,
        "projects": project_metadata,
    }


def main() -> int:
    projects = discover_projects(PROFILE_URL)
    items: list[dict[str, str]] = []
    project_metadata: list[dict[str, object]] = []

    for project in projects:
        try:
            items.extend(parse_feed(project))
        except Exception as error:  # noqa: BLE001
            print(f"Skipping feed for {project.url}: {error}", file=sys.stderr)

        try:
            project_metadata.append(parse_project_metadata(project))
        except Exception as error:  # noqa: BLE001
            print(f"Skipping metadata for {project.url}: {error}", file=sys.stderr)

    output = build_output(projects, items)
    OUTPUT_PATH.write_text(f"{json.dumps(output, indent=2)}\n", encoding="utf-8")

    project_output = build_project_output(project_metadata)
    PROJECTS_OUTPUT_PATH.write_text(f"{json.dumps(project_output, indent=2)}\n", encoding="utf-8")

    print(f"Discovered {len(projects)} projects")
    print(f"Collected {len(output['items'])} recent devlog posts")
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Collected metadata for {len(project_output['projects'])} projects")
    print(f"Wrote {PROJECTS_OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
