# Push project to new GitHub repo: SkyLy

Steps to push the complete project (including large model files) to a new repo named `SkyLy`.

1) Create the new repository on GitHub (e.g. https://github.com/youruser/SkyLy). Do NOT initialize with a README.

2) Choose whether to migrate history to Git LFS (recommended if you want models in the repo):

  - If you want to keep models inside the repo (history rewrite) use the PowerShell helper and pass `-MigrateHistory`:

  ```powershell
  # from repo root
  ./scripts/push_to_new_repo.ps1 -RemoteUrl "https://github.com/youruser/SkyLy.git" -MigrateHistory
  ```

  - If you prefer NOT to rewrite history and instead host models externally, upload `Backend/models/*.pkl` to S3/GCS and follow the instructions in `docs/PUSH_FULL.md` (Option B). Then push normally:

  ```powershell
  git remote add skyly https://github.com/youruser/SkyLy.git
  git push skyly --all
  git push skyly --tags
  ```

3) After the push (if you migrated history), collaborators must re-clone the repository. Example (POSIX):

```bash
# remove local clone and re-clone
cd ..
rm -rf "Air Pollution"
git clone https://github.com/youruser/SkyLy.git
```

Windows PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force "Air Pollution"
git clone https://github.com/youruser/SkyLy.git
```

4) If you use external hosting for models, add download logic to `Backend` and store URLs in environment variables `MODEL_URL` etc.

If you want, I can add a `Backend/model_loader.py` that downloads models from env-provided URLs at startup, and update `Backend/main.py` to call it on startup.
