#!/usr/bin/env python3
"""Fetch and serialize the public Wolvesville catalog for the static site."""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "wov-catalog.json"
API_BASE = "https://api.wolvesville.com"
CDN_BASE = "https://cdn2.wolvesville.com"
ASSET_WORKERS = 32
ASSET_BATCH_SIZE = 512
IMAGE_KEYS = (
    "previewImageUrl",
    "previewUrl",
    "imageUrl",
    "image",
    "iconUrl",
    "thumbnailUrl",
    "avatarImageUrl",
)
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


def store_slug(image_url: str) -> str:
    filename = urlparse(image_url).path.rsplit("/", 1)[-1]
    slug, count = re.subn(r"\.store(?:@\dx)?\.png$", "", filename, flags=re.IGNORECASE)
    if count != 1:
        raise RuntimeError(f"Unrecognized Wolvesville store image URL: {image_url}")
    return slug


def cdn_url(path: str) -> str:
    return f"{CDN_BASE}/{path.lstrip('/')}"


def add_asset_plan(
    plans: dict[str, dict],
    key_url: str,
    candidates: list[tuple[str, int]],
    required: bool = True,
) -> None:
    parsed = urlparse(key_url)
    if parsed.scheme != "https" or not parsed.hostname:
        return
    if parsed.hostname != "wolvesville.com" and not parsed.hostname.endswith(
        ".wolvesville.com"
    ):
        return
    if key_url not in plans:
        plans[key_url] = {
            "candidates": candidates,
            "required": required,
        }
    elif required:
        plans[key_url]["required"] = True


def build_asset_plans(
    items: list[dict],
    body_paints: list[dict],
    packs: dict[str, list[dict]],
) -> dict[str, dict]:
    plans: dict[str, dict] = {}

    for item in items:
        image_url = item.get("imageUrl")
        if not isinstance(image_url, str):
            raise RuntimeError(f"Avatar item {item.get('id', '(unknown)')} has no image URL.")
        slug = store_slug(image_url)
        store_url = cdn_url(f"avatarItems/{slug}.store@2x.png")
        layer_url = cdn_url(f"avatarItems/{slug}.avatar-large@2x.png")
        add_asset_plan(
            plans,
            store_url,
            [(store_url, 2), (image_url, 1)],
        )
        add_asset_plan(
            plans,
            layer_url,
            [
                (layer_url, 2),
                (cdn_url(f"avatarItems/{slug}.avatar-large.png"), 1),
            ],
        )

    for paint in body_paints:
        image_url = paint.get("imageUrl")
        if not isinstance(image_url, str):
            raise RuntimeError(f"Body paint {paint.get('id', '(unknown)')} has no image URL.")
        slug = store_slug(image_url)
        store_url = cdn_url(f"bodyPaints/{slug}.store@2x.png")
        add_asset_plan(plans, store_url, [(store_url, 2), (image_url, 1)])
        for part in ("body", "head", "mouth"):
            layer_url = cdn_url(f"bodyPaints/{part}-{slug}.avatar-large@3x.png")
            add_asset_plan(
                plans,
                layer_url,
                [
                    (layer_url, 3),
                    (cdn_url(f"bodyPaints/{part}-{slug}.avatar-large@2x.png"), 2),
                    (cdn_url(f"bodyPaints/{part}-{slug}.avatar-large.png"), 1),
                ],
            )

    for rows in packs.values():
        for pack in rows:
            for key in IMAGE_KEYS:
                image_url = pack.get(key)
                if isinstance(image_url, str) and image_url.startswith(("https://", "http://")):
                    add_asset_plan(plans, image_url, [(image_url, 1)], required=False)
                    break

    return plans


def fetch_image(url: str) -> tuple[str, str] | None:
    request = Request(
        url,
        headers={
            "Accept": "image/*",
            "User-Agent": "CelestialHubCatalogUpdater/1.0",
        },
    )
    for attempt in range(4):
        try:
            with urlopen(request, timeout=45) as response:
                mime_type = response.headers.get_content_type()
                if not mime_type.startswith("image/"):
                    raise RuntimeError(
                        f"Expected an image from {url}, got {mime_type}."
                    )
                data = response.read(25 * 1024 * 1024 + 1)
                if len(data) > 25 * 1024 * 1024:
                    raise RuntimeError(f"Image exceeds the 25 MiB safety limit: {url}")
                return mime_type, base64.b64encode(data).decode("ascii")
        except HTTPError as error:
            if error.code == 404:
                return None
            if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise RuntimeError(f"Image download failed ({error.code}): {url}") from error
        except (URLError, TimeoutError) as error:
            if attempt == 3:
                raise RuntimeError(f"Image download failed: {url}") from error
        time.sleep(2**attempt)
    return None


def fetch_asset_batch(urls: list[str]) -> dict[str, tuple[str, str] | None]:
    with ThreadPoolExecutor(max_workers=ASSET_WORKERS) as executor:
        futures = {executor.submit(fetch_image, url): url for url in urls}
        return {url: future.result() for future, url in futures.items()}


def download_assets(plans: dict[str, dict]) -> dict[str, dict[str, str | int]]:
    pending = set(plans)
    assets: dict[str, dict[str, str | int]] = {}
    max_candidates = max(
        (len(plan["candidates"]) for plan in plans.values()),
        default=0,
    )

    for candidate_index in range(max_candidates):
        if not pending:
            break
        keys = [
            key
            for key in pending
            if candidate_index < len(plans[key]["candidates"])
        ]
        urls = list(
            dict.fromkeys(plans[key]["candidates"][candidate_index][0] for key in keys)
        )
        fetched: dict[str, tuple[str, str] | None] = {}
        for start in range(0, len(urls), ASSET_BATCH_SIZE):
            fetched.update(fetch_asset_batch(urls[start : start + ASSET_BATCH_SIZE]))

        for key in keys:
            candidate_url, density = plans[key]["candidates"][candidate_index]
            result = fetched[candidate_url]
            if result is None:
                continue
            mime_type, encoded = result
            assets[key] = {
                "src": f"data:{mime_type};base64,{encoded}",
                "density": density,
            }
            pending.remove(key)

        print(
            f"Local images: {len(assets)}/{len(plans)} ready "
            f"(fallback pass {candidate_index + 1})."
        )

    required_missing = [url for url in pending if plans[url]["required"]]
    if required_missing:
        examples = ", ".join(required_missing[:5])
        raise RuntimeError(
            f"Could not download {len(required_missing)} required local images. "
            f"Examples: {examples}"
        )
    if pending:
        print(
            f"Optional preview images unavailable: {len(pending)}.",
            file=sys.stderr,
        )

    return assets


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
    assets = download_assets(
        build_asset_plans(
            results["items"],
            results["bodyPaints"],
            packs,
        )
    )
    catalog = {
        "version": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "items": results["items"],
        "bodyPaints": results["bodyPaints"],
        "tags": tags,
        "colorIndex": color_index,
        "packs": packs,
        "assets": assets,
    }
    write_catalog(catalog)

    color_count = sum(len(item_ids) for item_ids in color_index.values())
    print(
        f"Catalog written: {len(results['items'])} avatar items, "
        f"{len(results['bodyPaints'])} body paints, {len(tags)} tagged IDs, "
        f"{color_count} color assignments, "
        f"{sum(len(results[name]) for name in OPTIONAL_ENDPOINTS)} skin packs, "
        f"{len(assets)} local images."
    )
    print(f"Output: {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
