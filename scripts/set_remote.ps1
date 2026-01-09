param(
    [Parameter(Mandatory=$true)]
    [string]$RemoteUrl
)

function ExitOnError($msg) {
    Write-Error $msg
    exit 1
}

# If remote 'skyly' exists, set its URL; otherwise add it
$existing = git remote | Select-String -Pattern "^skyly$" -Quiet
if ($existing) {
    Write-Output "Updating existing remote 'skyly' to $RemoteUrl"
    git remote set-url skyly $RemoteUrl
} else {
    Write-Output "Adding remote 'skyly' -> $RemoteUrl"
    git remote add skyly $RemoteUrl
}

Write-Output "You can now push: git push skyly --all && git push skyly --tags"
