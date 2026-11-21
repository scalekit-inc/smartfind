#!/usr/bin/env python3
"""Parse a large FHIR Bundle URL into Smartfind catalog entry JSON (stdout)."""
from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.request

ADVANCEDMD_SKIP = {"DEV", "STAGE", "PROD", "Invalid"}


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return (s[:80] or "unknown")


def id_for(vendor: str, name: str, fhir: str) -> str:
    digest = hashlib.sha1(fhir.encode()).hexdigest()[:8]
    return f"{vendor}-{slugify(name)}-{digest}"


def normalize_base(address: str) -> str:
    return (address or "").strip().rstrip("/")


def parse(bundle: dict, vendor: str, source: str, persona: str) -> list[dict]:
    resources = []
    for e in bundle.get("entry") or []:
        r = e.get("resource")
        if r:
            resources.append((e.get("fullUrl"), r))

    orgs: dict[str, dict] = {}
    endpoints: dict[str, dict] = {}
    for full_url, r in resources:
        rid = str(r.get("id") or "")
        if not rid:
            continue
        if r.get("resourceType") == "Organization":
            orgs[rid] = r
            if full_url:
                orgs[full_url] = r
        if r.get("resourceType") == "Endpoint":
            endpoints[rid] = r
            if full_url:
                endpoints[full_url] = r

    def resolve_ep(ref: str | None):
        if not ref:
            return None
        s = str(ref)
        return (
            endpoints.get(s)
            or endpoints.get(s.replace("Endpoint/", ""))
            or endpoints.get(s.split("/")[-1])
        )

    seen: set[tuple[str, str]] = set()
    out: list[dict] = []

    def push(name: str, fhir_base: str, org: dict | None, aliases: list[str] | None = None):
        base = normalize_base(fhir_base)
        if not base.startswith("https://"):
            return
        clean = (name or "").strip() or base
        if vendor == "advancedmd" and clean in ADVANCEDMD_SKIP:
            return
        key = (base.lower(), clean.lower())
        if key in seen:
            return
        seen.add(key)
        addr = ((org or {}).get("address") or [{}])[0] or {}
        alias = list(aliases or [])
        if vendor == "advancedmd":
            office = base.split("/")[-1]
            if office and office != "r4":
                alias.append(f"office:{office}")
        out.append(
            {
                "id": id_for(vendor, clean, base),
                "name": clean,
                "aliases": list(dict.fromkeys([a for a in alias if a]))[:12],
                "vendor": vendor,
                "persona": persona,
                "fhirBase": base,
                "state": addr.get("state"),
                "city": addr.get("city"),
                "source": source,
            }
        )

    for org in {id(o): o for o in orgs.values()}.values():
        for ref in org.get("endpoint") or []:
            ep = resolve_ep(ref.get("reference") if isinstance(ref, dict) else ref)
            if not ep or not ep.get("address"):
                continue
            push(org.get("name") or ep.get("address"), ep["address"], org, org.get("alias") or [])

    for ep in {id(e): e for e in endpoints.values()}.values():
        if not ep.get("address"):
            continue
        org_ref = ((ep.get("managingOrganization") or {}).get("reference")) or ""
        org = (
            orgs.get(org_ref)
            or orgs.get(org_ref.replace("Organization/", ""))
            or orgs.get(org_ref.split("/")[-1])
            if org_ref
            else None
        )
        push(org.get("name") if org else ep.get("name") or ep["address"], ep["address"], org, (org or {}).get("alias") or [])

    return out


def collapse_by_fhir_base(entries: list[dict], *, skip_bases: set[str] | None = None) -> list[dict]:
    """One catalog row per FHIR base; extra org names become aliases (capped)."""
    skip = {b.rstrip("/").lower() for b in (skip_bases or set())}
    by_base: dict[str, dict] = {}
    for e in entries:
        base = e["fhirBase"].rstrip("/")
        if base.lower() in skip:
            continue
        cur = by_base.get(base.lower())
        if not cur:
            by_base[base.lower()] = {**e, "aliases": list(e.get("aliases") or [])}
            continue
        extras = []
        if e.get("name") and e["name"] != cur["name"]:
            extras.append(e["name"])
        extras.extend(e.get("aliases") or [])
        cur["aliases"] = list(dict.fromkeys([*(cur.get("aliases") or []), *extras]))[:12]
        if not cur.get("city") and e.get("city"):
            cur["city"] = e.get("city")
        if not cur.get("state") and e.get("state"):
            cur["state"] = e.get("state")
    return list(by_base.values())


def main() -> int:
    if len(sys.argv) < 4:
        print("usage: parse-vendor-bundle.py <url> <vendor> <persona>", file=sys.stderr)
        return 2
    url, vendor, persona = sys.argv[1], sys.argv[2], sys.argv[3]
    with urllib.request.urlopen(url, timeout=300) as resp:
        bundle = json.load(resp)
    entries = parse(bundle, vendor, url, persona)
    # athena: ~112k orgs share the platform /fhir/r4 root; keep practice-specific bases only.
    if vendor == "athena":
        entries = collapse_by_fhir_base(
            entries,
            skip_bases={"https://api.platform.athenahealth.com/fhir/r4"},
        )
    json.dump(entries, sys.stdout)
    sys.stdout.write("\n")
    print(f"# parsed {len(entries)} entries from {url}", file=sys.stderr)
    return 0



if __name__ == "__main__":
    raise SystemExit(main())
