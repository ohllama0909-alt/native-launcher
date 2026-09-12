#!/usr/bin/env bash
#
# Post-build release helper (local publish flow, mirrors the v3.9.x layout).
#
# electron-builder emits space-named artifacts ("Noctra Client-*") and yml feeds
# that reference them. This script, for the current package.json version:
#   1. makes URL-safe hyphenated copies ("Noctra-Client-*"),
#   2. rewrites latest.yml / latest-linux.yml to point at the hyphenated names,
#   3. uploads to every target repo both the space-named originals (GitHub stores
#      them as "Noctra.Client-*") and the hyphenated copies plus the two ymls,
#      producing the established 12-asset set per release.
#
# Requires: gh (authed, repo scope). Drafts must already exist (ensure-release.js).
#
#   bash scripts/mirror-release-assets.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
REPOS=(ohllama0909-alt/noctra-client ohllama0909-alt/native-launcher)
REL=release

echo "==> version ${VERSION} (${TAG})"

# 1. hyphenated copies of every space-named binary for this version
shopt -s nullglob
mapfile -t SPACED < <(ls "$REL"/"Noctra Client-${VERSION}"* "$REL"/"Noctra Client-Setup-${VERSION}"* "$REL"/"Noctra Client-Portable-${VERSION}"* 2>/dev/null | sort -u)
if [[ ${#SPACED[@]} -eq 0 ]]; then
  echo "error: no space-named artifacts for ${VERSION} in ${REL}/" >&2
  exit 1
fi
for f in "${SPACED[@]}"; do
  base="$(basename "$f")"
  hy="${base//Noctra Client-/Noctra-Client-}"
  if [[ ! -f "$REL/$hy" ]]; then
    cp -p "$f" "$REL/$hy"
    echo "   + $hy"
  fi
done

# 2. rewrite yml feeds to reference the hyphenated names (bytes unchanged -> sha/size stay)
for y in latest.yml latest-linux.yml; do
  [[ -f "$REL/$y" ]] || continue
  node -e '
    const fs=require("fs"); const p=process.argv[1];
    let t=fs.readFileSync(p,"utf8");
    t=t.replace(/Noctra Client-/g,"Noctra-Client-").replace(/Noctra%20Client-/g,"Noctra-Client-");
    fs.writeFileSync(p,t);
  ' "$REL/$y"
  echo "   ~ $y -> hyphenated refs"
done

# 3. build the upload list: hyphenated binaries + space-named originals + ymls
UPLOADS=()
for f in "${SPACED[@]}"; do
  base="$(basename "$f")"
  UPLOADS+=("$REL/$base")                                  # space-named -> stored as Noctra.Client-*
  UPLOADS+=("$REL/${base//Noctra Client-/Noctra-Client-}") # hyphenated
done
for y in latest.yml latest-linux.yml; do
  [[ -f "$REL/$y" ]] && UPLOADS+=("$REL/$y")
done

echo "==> uploading ${#UPLOADS[@]} assets to ${#REPOS[@]} repos"
for repo in "${REPOS[@]}"; do
  echo "   -> $repo"
  gh release upload "$TAG" "${UPLOADS[@]}" --repo "$repo" --clobber
done
echo "==> mirror complete"
