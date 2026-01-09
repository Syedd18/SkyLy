<#
.SYNOPSIS
  Remove all model files (Backend/models) from git history and current tree.

.DESCRIPTION
  Uses git-filter-repo if available to delete the path `Backend/models` from history.
  After running this, the repo's history will be rewritten and collaborators MUST re-clone.

  This script will:
    - ensure working tree is clean
    - remove `Backend/models` from the current index and working tree
    - run git-filter-repo to strip the path from all history (if available)
    - expire reflog and run a gc
    - add `Backend/models/` to `.gitignore` and commit

.NOTES
  You must run this locally in a backup clone. This operation rewrites history.
#>

param(
    [switch]$DryRun
)

function ExitOnError($msg) {
    Write-Error $msg
    exit 1
}

# check clean
$status = git status --porcelain
if ($status) {
    ExitOnError "Working tree not clean. Commit or stash changes before running this script."
}

if ($DryRun) {
    Write-Output "DRY RUN: Would remove Backend/models from index and history (no changes committed)."
}

# Remove from current tree (safe step)
Write-Output "Removing Backend/models from current index and working tree..."
if (-not $DryRun) {
    git rm -rf --ignore-unmatch Backend/models || Write-Output "No Backend/models files staged/removed"
}

# Check for git-filter-repo
$filterRepo = Get-Command git-filter-repo -ErrorAction SilentlyContinue
if ($filterRepo) {
    Write-Output "Found git-filter-repo. Rewriting history to remove Backend/models..."
    if (-not $DryRun) {
        git filter-repo --path Backend/models --invert-paths --force
    }
} else {
    Write-Output "git-filter-repo not found. You can install it (https://github.com/newren/git-filter-repo) or run BFG."
    ExitOnError "git-filter-repo required to rewrite history automatically. Install it and re-run this script."
}

Write-Output "Expiring reflog and garbage collecting..."
if (-not $DryRun) {
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
}

Write-Output "Ensuring Backend/models is ignored"
if (-not $DryRun) {
    if (-not (Get-Content .gitignore | Select-String -Pattern "Backend/models" -SimpleMatch)) {
        Add-Content -Path .gitignore -Value "`n# Large model artifacts kept out of repo`nBackend/models/"
        git add .gitignore
        git commit -m "chore: ensure Backend/models is ignored"
    } else {
        Write-Output ".gitignore already contains Backend/models"
    }
}

Write-Output "Done. If you rewrote history, force-push to the remote of your choice and tell collaborators to re-clone."
