# How to push the complete project to GitHub (including large model files)

This repository contains ML model artifacts in `Backend/models/` that exceed GitHub's 100MB single-file limit. There are two recommended ways to push the full project:

Option A — Recommended: Use Git LFS (rewrites history)
- Install `git-lfs` locally: https://git-lfs.github.com/
- From your local clone run:

```bash
# make script executable once
chmod +x ./scripts/push_with_git_lfs.sh
./scripts/push_with_git_lfs.sh
```

Notes:
- `git lfs migrate import` rewrites repository history. After this completes you will need to tell collaborators to re-clone the repo.
- This keeps model files in the repo but stored in LFS.

Option B — Safer for shared repos: Host models externally (S3/GCS) and remove them from git
1. Upload `Backend/models/*.pkl` to S3/GCS or other artifact store.
2. Add download code to `Backend` that fetches models at startup if not present (example in README or `Backend/model_loader.py`).
3. Remove model files from git and add an entry to `.gitignore`:

```bash
git rm --cached Backend/models/*.pkl
echo "Backend/models/*.pkl" >> .gitignore
git commit -m "chore: remove large model files from repo; host externally"
git push origin main
```

Option C — Use GitHub Releases (manual upload)
- Create a release and attach large model files; update deployment to download assets at startup.

Which option to pick?
- If you want the repo to contain models and are OK rewriting history, use Option A.
- If you prefer no history rewrite and want easier collaboration, use Option B.

Security note: store any cloud credentials in environment variables or your deployment secrets manager — never commit them.
