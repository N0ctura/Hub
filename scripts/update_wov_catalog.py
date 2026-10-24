#!/usr/bin/env python3
"""Fetch and serialize the public Wolvesville catalog for the static site."""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "wov-catalog.json"
API_BASE = "https://api.wolvesville.com"
COLOR_TAGS = (
    "black",
    "blue",
    "brown",
    "gray",
    "green",
    "multicolor",
    "orange",
    "pink",
    "purple",
    "red",
    "white",
    "yellow",
)
REQUIRED_ENDPOINTS = {
    "items": "/items/avatarItems",
    "bodyPaints": "/items/bodyPaints",
    "itemTags": "/items/tags",
}
OPTIONAL_ENDPOINTS = {
    "sets": "/items/avatarItemSets",
    "collections": "/items/avatarItemCollections",
    "roleCards": "/items/advancedRoleCardOffers",
}


def read_api_key() -> str:
    for name in ("WOV_API_KEY", "NEXT_PUBLIC_WOV_API_KEY"):
        value = os.environ.get(name, "").strip()
        if value:
            return value.strip("\"'")

    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            match = re.match(
                r"^\s*(?:export\s+)?(?:WOV_API_KEY|NEXT_PUBLIC_WOV_API_KEY)\s*=\s*(.*?)\s*$",
                line,
            )
            if match and match.group(1):
                return match.group(1).strip("\"'")

    raise RuntimeError(
        "API key not found. Set WOV_API_KEY or NEXT_PUBLIC_WOV_API_KEY."
    )


def fetch_json(path: str, api_key: str, required: bool) -> list[dict]:
    request = Request(
        f"{API_BASE}{path}",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bot {api_key}",
            "User-Agent": "CelestialHubCatalogUpdater/1.0",
        },
    )
    try:
        with urlopen(request, timeout=90) as response:
            data = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        if not required:
            print(f"Optional endpoint unavailable ({path}): {error}", file=sys.stderr)
            return []
        raise RuntimeError(f"Required endpoint failed ({path}): {error}") from error

    if not isinstance(data, list):
        if required:
            raise RuntimeError(f"Expected a JSON array from {path}.")
        print(f"Optional endpoint returned a non-array ({path}).", file=sys.stderr)
        return []

    return [entry for entry in data if isinstance(entry, dict)]


def build_tag_map(rows: list[dict]) -> dict[str, list[str]]:
    tags_by_id: dict[str, set[str]] = {}
    for row in rows:
        item_id = row.get("avatarItemId")
        tags = row.get("tags")
        if not isinstance(item_id, str) or not isinstance(tags, list):
            continue

        normalized = {
            tag.strip().lower()
            for tag in tags
            if isinstance(tag, str) and tag.strip()
        }
        tags_by_id.setdefault(item_id, set()).update(normalized)

    return {
        item_id: sorted(tags)
        for item_id, tags in sorted(tags_by_id.items())
    }


def write_catalog(catalog: dict) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=OUTPUT.parent,
            prefix=".wov-catalog-",
            suffix=".tmp",
            delete=False,
        ) as temp_file:
            temp_name = temp_file.name
            json.dump(
                catalog,
                temp_file,
                ensure_ascii=False,
                separators=(",", ":"),
            )
            temp_file.write("\n")
        os.replace(temp_name, OUTPUT)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> int:
    api_key = read_api_key()
    results: dict[str, list[dict]] = {}
    endpoints = {
        **REQUIRED_ENDPOINTS,
        **OPTIONAL_ENDPOINTS,
    }

    with ThreadPoolExecutor(max_workers=len(endpoints)) as executor:
        futures = {
            executor.submit(
                fetch_json,
                path,
                api_key,
                name in REQUIRED_ENDPOINTS,
            ): name
            for name, path in endpoints.items()
        }
        for future in as_completed(futures):
            results[futures[future]] = future.result()

    tags = build_tag_map(results["itemTags"])
    color_index = {
        color: sorted(
            item_id
            for item_id, item_tags in tags.items()
            if f"color:{color}" in item_tags
        )
        for color in COLOR_TAGS
    }
    packs = {
        "sets": results["sets"],
        "collections": results["collections"],
        "roleCards": results["roleCards"],
    }
    catalog = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "items": results["items"],
        "bodyPaints": results["bodyPaints"],
        "tags": tags,
        "colorIndex": color_index,
        "packs": packs,
    }
    write_catalog(catalog)

    color_count = sum(len(item_ids) for item_ids in color_index.values())
    print(
        f"Catalog written: {len(results['items'])} avatar items, "
        f"{len(results['bodyPaints'])} body paints, {len(tags)} tagged IDs, "
        f"{color_count} color assignments, "
        f"{sum(len(results[name]) for name in OPTIONAL_ENDPOINTS)} skin packs."
    )
    print(f"Output: {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
