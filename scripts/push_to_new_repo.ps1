<#
.SYNOPSIS
  Push repository to a new remote (e.g. GitHub repo "SkyLy"), migrating large model files to Git LFS first.

.DESCRIPTION
  Run this on Windows PowerShell from the repository root. Provide the remote URL as parameter.
  The script will:
    - ensure git-lfs is enabled
    - track Backend/models/*.pkl with LFS
    - (optionally) migrate history to LFS for those files
    - add the new remote and push all branches and tags (force if history rewritten)

.PARAMETER RemoteUrl
  The git remote URL for the new repository, e.g. https://github.com/youruser/SkyLy.git

EXAMPLE
  .\scripts\push_to_new_repo.ps1 -RemoteUrl "https://github.com/youruser/SkyLy.git"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$RemoteUrl,

    [switch]$MigrateHistory
)

function ExitOnError($msg) {
    Write-Error $msg
    exit 1
}

Write-Output "1/6: Ensure git is available"
git --version 2>$null || ExitOnError "git not found in PATH"

Write-Output "2/6: Ensure git-lfs is available and enabled"
git lfs --version 2>$null || ExitOnError "git-lfs not found. Install from https://git-lfs.github.com/"
git lfs install --local

Write-Output "3/6: Track model .pkl files with LFS"
git lfs track "Backend/models/*.pkl"
git add .gitattributes || Write-Output ".gitattributes already staged or absent"
try { git commit -m "chore: track Backend/models/*.pkl with git-lfs" } catch { Write-Output "no commit needed" }

if ($MigrateHistory) {
    Write-Output "4/6: Migrate history to Git LFS for model files (this rewrites history)"
    Write-Output "This can take a while."
    git lfs migrate import --include="Backend/models/*.pkl" --include-ref=refs/heads/* || ExitOnError "git lfs migrate failed"
} else {
    Write-Output "4/6: Skipping history migration (use -MigrateHistory to enable)"
}

Write-Output "5/6: Add new remote as 'skyly' and push"
if (git remote | Select-String -Pattern "skyly") {
    git remote remove skyly
}
git remote add skyly $RemoteUrl

Write-Output "6/6: Push branches and tags (force if history was migrated)"
if ($MigrateHistory) {
    git push skyly --all --force
    git push skyly --tags --force
} else {
    git push skyly --all
    git push skyly --tags
}

Write-Output "Done. If you migrated history, collaborators must re-clone the repository."
