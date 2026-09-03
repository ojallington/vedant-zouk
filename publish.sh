#!/usr/bin/env bash
# Publish the five designs to GitHub Pages. Safe to re-run at any point.
#
#   ./publish.sh            create repo (if needed), push, enable Pages, verify
#   ./publish.sh --verify   just re-check that the live URLs are up
set -euo pipefail
cd "$(dirname "$0")"

REPO=vedant-zouk
PAGES=(01-noir-gold 02-editorial 03-kinetic 04-swiss 05-immersive)

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

command -v gh  >/dev/null || die "gh is not installed."
command -v git >/dev/null || die "git is not installed."
gh auth status >/dev/null 2>&1 || die "Not logged in. Run: gh auth login"

USER=$(gh api user --jq .login)
BASE="https://$USER.github.io/$REPO"

verify() {
  bold "Checking the live pages…"
  local all_ok=1
  for p in "" "${PAGES[@]}"; do
    local url="$BASE/$p" code
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)
    if [ "$code" = 200 ]; then printf '  \033[32m%s\033[0m  %s\n' "$code" "$url"
    else                       printf '  \033[31m%s\033[0m  %s\n' "$code" "$url"; all_ok=0; fi
  done
  return $(( all_ok ? 0 : 1 ))
}

if [ "${1:-}" = "--verify" ]; then verify; exit $?; fi

# 1. repo
if gh repo view "$USER/$REPO" >/dev/null 2>&1; then
  bold "Repo already exists."
  git remote get-url origin >/dev/null 2>&1 || \
    git remote add origin "https://github.com/$USER/$REPO.git"
else
  bold "Creating $USER/$REPO…"
  gh repo create "$REPO" --public --source=. --remote=origin \
    --description "Brazilian Zouk Munich — five website designs for Miriam & Pavan's Thursday classes"
fi

# 2. push
bold "Pushing…"
git branch -M main
git push -u origin main

# 3. pages
if gh api "repos/$USER/$REPO/pages" >/dev/null 2>&1; then
  bold "Pages already enabled."
else
  bold "Enabling GitHub Pages…"
  gh api -X POST "repos/$USER/$REPO/pages" \
    -f 'source[branch]=main' -f 'source[path]=/' >/dev/null
fi

# 4. wait for the build, then verify
bold "Waiting for the first build (up to ~3 minutes)…"
for i in $(seq 1 36); do
  status=$(gh api "repos/$USER/$REPO/pages" --jq .status 2>/dev/null || echo null)
  [ "$status" = "built" ] && break
  printf '  %s… ' "$status"; sleep 5
done
echo

if verify; then
  echo
  bold "Live. Send Vedant this one:"
  echo "  $BASE/"
else
  echo
  echo "Some pages are not answering yet — GitHub can take a few extra minutes"
  echo "on a first deploy. Re-run:  ./publish.sh --verify"
fi
