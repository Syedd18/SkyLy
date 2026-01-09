#!/usr/bin/env bash
set -euo pipefail

# Helper script to convert existing model files to Git LFS and push repository.
# Run this locally (your machine) — requires git and git-lfs installed.

echo "1/6: Ensure git-lfs is installed and enabled"
git lfs install --local

echo "2/6: Track model files"
git lfs track "Backend/models/*.pkl"
git add .gitattributes
git commit -m "chore: add .gitattributes to track model .pkl with Git LFS" || true

echo "3/6: Migrate existing history to Git LFS for model files (this rewrites history)"
echo "This may take time depending on repo size."
git lfs migrate import --include="Backend/models/*.pkl" --include-ref=refs/heads/*

echo "4/6: Verify large files are now LFS objects"
git lfs ls-files

echo "5/6: Push all branches and tags (force push may be required because history was rewritten)"
git push origin --all --force
git push origin --tags --force

echo "6/6: Done. Note: collaborators must re-clone the repository after history rewrite."

echo "If you prefer NOT to rewrite history, upload models to cloud storage and remove them from git instead. See docs/PUSH_FULL.md"
