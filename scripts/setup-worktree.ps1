# setup-worktree.ps1
# Creates a symlink to .env from the main worktree into this worktree.
# Run once after a new worktree is created:  .\scripts\setup-worktree.ps1

$repoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not inside a git repository."
    exit 1
}

if (Test-Path "$repoRoot\.env") {
    Write-Host ".env already exists in this worktree - nothing to do."
    exit 0
}

# Find the main worktree (first entry from git worktree list)
$mainWorktreePath = (git worktree list --porcelain |
    Where-Object { $_ -match "^worktree " } |
    Select-Object -First 1).Replace("worktree ", "").Trim()

$envSource = Join-Path $mainWorktreePath ".env"

if (!(Test-Path $envSource)) {
    Write-Warning "No .env found in main worktree ($mainWorktreePath). Copy one manually."
    exit 1
}

New-Item -ItemType SymbolicLink -Path "$repoRoot\.env" -Target $envSource -ErrorAction SilentlyContinue | Out-Null
if (Test-Path "$repoRoot\.env") {
    Write-Host "Linked .env -> $envSource"
} else {
    Copy-Item $envSource "$repoRoot\.env"
    Write-Host "Copied .env from $envSource (symlink requires Developer Mode or admin)"
}
