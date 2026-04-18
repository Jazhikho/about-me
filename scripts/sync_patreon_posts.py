from __future__ import annotations

import json
import os
import re
import sys
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


API_BASE_URL = "https://www.patreon.com/api/oauth2/v2"
DEFAULT_CAMPAIGN_URL = "https://www.patreon.com/c/forgewalkerstudios"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "content" / "patreon-posts.json"
USER_AGENT = "JazhikhoPortfolioSync/1.0 (+https://github.com/Jazhikho/about-me)"
MAX_ITEMS = 12
MAX_SUMMARY_LENGTH = 180


class HTMLTextStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def get_text(self) -> str:
        return normalize_space(" ".join(self.parts))


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def strip_html(value: str) -> str:
    stripper = HTMLTextStripper()
    stripper.feed(value)
    return stripper.get_text()


def truncate_summary(value: str) -> str:
    clean_value = normalize_space(value)

    if len(clean_value) <= MAX_SUMMARY_LENGTH:
        return clean_value

    shortened = clean_value[: MAX_SUMMARY_LENGTH - 1].rsplit(" ", 1)[0]
    return f"{shortened}..."


def read_access_token() -> str:
    access_token = os.environ.get("PATREON_CREATOR_ACCESS_TOKEN", "").strip()

    if not access_token:
        raise RuntimeError("PATREON_CREATOR_ACCESS_TOKEN is required to sync Patreon posts.")

    return access_token


def fetch_json(url: str, access_token: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )

    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def build_url(path: str, params: dict[str, str]) -> str:
    return f"{API_BASE_URL}{path}?{urlencode(params)}"


def fetch_campaign(access_token: str) -> dict[str, str]:
    url = build_url(
        "/identity",
        {
            "include": "campaign",
            "fields[campaign]": "creation_name,url,patron_count",
        },
    )
    payload = fetch_json(url, access_token)

    for item in payload.get("included", []):
        if item.get("type") != "campaign":
            continue

        attributes = item.get("attributes", {})
        return {
            "id": item.get("id", ""),
            "name": attributes.get("creation_name") or "ForgeWalker Studios",
            "url": attributes.get("url") or DEFAULT_CAMPAIGN_URL,
        }

    raise RuntimeError("Patreon campaign could not be resolved from the authenticated identity.")


def fetch_posts(access_token: str, campaign: dict[str, str]) -> list[dict[str, str]]:
    next_url = build_url(
        f"/campaigns/{campaign['id']}/posts",
        {
            "fields[post]": "title,url,published_at,is_public,content",
            "page[count]": "20",
        },
    )
    items: list[dict[str, str]] = []

    while next_url and len(items) < MAX_ITEMS * 2:
        payload = fetch_json(next_url, access_token)

        for post in payload.get("data", []):
            attributes = post.get("attributes", {})

            if not attributes.get("is_public"):
                continue

            title = normalize_space(attributes.get("title") or "")
            url = urljoin("https://www.patreon.com", normalize_space(attributes.get("url") or ""))
            published_at = normalize_space(attributes.get("published_at") or "")
            content = attributes.get("content") or ""

            if not title or not url or not published_at:
                continue

            items.append(
                {
                    "id": post.get("id", ""),
                    "campaign_name": campaign["name"],
                    "campaign_url": campaign["url"],
                    "title": title,
                    "url": url,
                    "published_at": published_at,
                    "summary": truncate_summary(strip_html(content)),
                }
            )

        next_link = payload.get("links", {}).get("next")
        next_url = next_link if isinstance(next_link, str) and next_link else ""

    items.sort(key=lambda item: item["published_at"], reverse=True)
    return items[:MAX_ITEMS]


def build_output(campaign: dict[str, str], items: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "campaign": campaign,
        "items": items,
    }


def main() -> int:
    access_token = read_access_token()

    try:
        campaign = fetch_campaign(access_token)
        items = fetch_posts(access_token, campaign)
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        print(f"Patreon API request failed with HTTP {error.code}: {message}", file=sys.stderr)
        return 1
    except URLError as error:
        print(f"Patreon API request failed: {error}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"Patreon sync failed: {error}", file=sys.stderr)
        return 1

    output = build_output(campaign, items)
    OUTPUT_PATH.write_text(f"{json.dumps(output, indent=2)}\n", encoding="utf-8")

    print(f"Fetched {len(items)} public Patreon posts")
    print(f"Wrote {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
