#!/usr/bin/env bash
set -euo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash changes before running this script." >&2
  exit 1
fi

echo "Removing Backend/models from current index and working tree..."
git rm -rf --ignore-unmatch Backend/models || true

if command -v git-filter-repo >/dev/null 2>&1; then
  echo "Found git-filter-repo. Rewriting history to remove Backend/models..."
  git filter-repo --path Backend/models --invert-paths --force
else
  echo "ERROR: git-filter-repo not found. Install it: https://github.com/newren/git-filter-repo" >&2
  exit 1
fi

echo "Expiring reflog and garbage collecting..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

if ! grep -q "Backend/models/" .gitignore 2>/dev/null; then
  echo "# Large model artifacts kept out of repo" >> .gitignore
  echo "Backend/models/" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore Backend/models" || true
fi

echo "Done. If you rewrote history, force-push to the remote of your choice and tell collaborators to re-clone."
