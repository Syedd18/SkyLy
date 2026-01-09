# Remove model artifacts from repository

This project previously included large model artifacts in `Backend/models/`. You requested the repository *not* contain model files. This page describes what I did and how to finish pushing a clean repo to your new `SkyLy` repository.

What I implemented for you:

- Removed LFS tracking entries from `.gitattributes` (models are intentionally NOT tracked).
- Created `scripts/remove_models_history.ps1` (PowerShell) and `scripts/remove_models_history.sh` (POSIX) to safely remove `Backend/models/` from current index and history using `git-filter-repo`.
- Added `scripts/set_remote.ps1` to set or update the `skyly` remote URL.
- Ensured `.gitignore` contains `Backend/models/`.

Important notes and recommended flow (one-time, local operations):

1) Backup your repository (make a copy of the folder) before rewriting history.

2) Run the history-removal script (choose the appropriate one):

POSIX (Linux/macOS/Git Bash/WSL):

```bash
# from repo root
./scripts/remove_models_history.sh
# After it finishes, force push to the new remote (see step 4)
```

Windows PowerShell:

```powershell
# from repo root
.
\scripts\remove_models_history.ps1
# After it finishes, force push to the new remote
```

3) Create the new GitHub repo `SkyLy` (do not initialize with README) and set the remote:

```powershell
# example using PowerShell helper
.
\scripts\set_remote.ps1 -RemoteUrl "https://github.com/Syedd18/SkyLy.git"
```

or manually:

```bash
git remote remove skyly || true
git remote add skyly https://github.com/Syedd18/SkyLy.git
```

4) Force-push the cleaned history to `skyly`:

```bash
git push skyly --all --force
git push skyly --tags --force
```

5) Tell collaborators to re-clone the repo once push completes.

If you prefer *not* to rewrite history, you can instead remove the current model files from the index (not history) and keep them hosted externally; see `docs/PUSH_FULL.md` (Option B).

If you'd like, I can also:
- open a branch with the cleaned history and prepare the push commands in the repo, or
- create a PR containing the scripts and documentation you can run locally.

Tell me if you want me to proceed to create the cleaned branch and attempt to remove the model files locally in this workspace (I can run git commands here), or if you'd like to run the scripts locally yourself.