#!/usr/bin/env python3
"""Download Lantern daily CSV and emit unique developer/listUrl JSON to stdout."""
from __future__ import annotations

import csv
import json
import sys
import urllib.request
from collections import defaultdict

URL = "https://lantern.healthit.gov/api/daily/download"


def main() -> int:
    with urllib.request.urlopen(URL, timeout=180) as resp:
        text = resp.read().decode("utf-8", errors="replace")

    reader = csv.DictReader(text.splitlines())
    counts: dict[tuple[str, str], int] = defaultdict(int)
    for row in reader:
        developer = (row.get("api_developer_name") or "").strip()
        list_url = (row.get("list_source") or "").strip()
        if not list_url.startswith("http"):
            continue
        counts[(developer, list_url)] += 1

    out = [
        {
            "developer": developer,
            "listUrl": list_url,
            "endpointCount": count,
        }
        for (developer, list_url), count in counts.items()
    ]
    out.sort(key=lambda r: (-r["endpointCount"], r["developer"], r["listUrl"]))
    json.dump(out, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
