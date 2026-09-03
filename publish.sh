#!/usr/bin/env bash
# Create the public repo, push, and turn on GitHub Pages. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
REPO=vedant-zouk
USER=$(gh api user --jq .login)

if ! gh repo view "$USER/$REPO" >/dev/null 2>&1; then
  echo "Creating $USER/$REPO…"
  gh repo create "$REPO" --public --source=. --remote=origin \
    --description "Brazilian Zouk Munich — five website designs for Miriam & Pavan's Thursday classes"
else
  echo "Repo already exists."
  git remote get-url origin >/dev/null 2>&1 || \
    git remote add origin "https://github.com/$USER/$REPO.git"
fi

git branch -M main
git push -u origin main

if ! gh api "repos/$USER/$REPO/pages" >/dev/null 2>&1; then
  echo "Enabling GitHub Pages…"
  gh api -X POST "repos/$USER/$REPO/pages" \
    -f 'source[branch]=main' -f 'source[path]=/' >/dev/null
fi

BASE="https://$USER.github.io/$REPO"
echo
echo "Pages is building — usually ready in about a minute."
echo
echo "  $BASE/                 ← send this one"
echo "  $BASE/01-noir-gold/"
echo "  $BASE/02-editorial/"
echo "  $BASE/03-kinetic/"
echo "  $BASE/04-swiss/"
echo "  $BASE/05-immersive/"
