# Updating packages

To reduce the risk of supply chain attacks targeting newly published packages, we follow a two-step process when updating dependencies:

1. Bump the top-level version ranges in `package.json` using `npm-check-updates`, skipping any releases less than 7 days old.
2. Resolve the full dependency tree as it existed 6 days ago and write the lockfile.

This ensures direct dependencies are at least 7 days old and transitive dependencies are at least 6 days old. Using 6 days (not 7) for the install step avoids conflicts: a package selected by step 1 may be exactly 7 days old, meaning it was already visible 6 days ago but would be invisible to an `--before=7 days ago` constraint.

## Bump top-level ranges in package.json, skipping releases < 7 days old

`npx npm-check-updates -u --cooldown 7`

## Resolve the dependency tree as of 6 days ago and write the lockfile

`npm install --min-release-age=6`
