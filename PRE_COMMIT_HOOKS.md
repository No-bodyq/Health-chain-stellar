# Pre-Commit Hooks

Automated code quality checks using Husky and lint-staged for fast contributor feedback.

## What Runs on Commit

For each staged `.ts` file:

1. **ESLint**: Lints and auto-fixes code issues
2. **Prettier**: Formats code consistently
3. **Jest**: Runs tests related to changed files only

All checks run in parallel for speed. If any check fails, the commit is blocked.

## Setup

### First Time Setup

```bash
cd backend
npm install
```

The `prepare` script automatically initializes Husky after `npm install`.

### Manual Initialization

If hooks aren't working:

```bash
cd backend
npx husky install
```

## Usage

### Normal Commit

```bash
git add src/auth/auth.service.ts
git commit -m "fix: improve login validation"
```

Hooks run automatically:
```
✔ Preparing lint-staged...
✔ Running tasks for staged files...
  ✔ src/auth/auth.service.ts
    ✔ eslint --fix
    ✔ prettier --write
    ✔ jest --bail --findRelatedTests --passWithNoTests
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
```

### Bypass Hooks (When Needed)

Use `--no-verify` flag to skip hooks:

```bash
git commit -m "wip: work in progress" --no-verify
```

**When to bypass:**
- Work-in-progress commits
- Emergency hotfixes
- Known failing tests (with plan to fix)
- Large refactors in progress

**Important:** Never bypass hooks for production/main branch commits.

## Configuration

### lint-staged (backend/package.json)

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests --passWithNoTests"
    ]
  }
}
```

### Customizing Checks

Edit `backend/package.json` to modify lint-staged configuration:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
      // Remove jest line to skip tests
    ]
  }
}
```

### Adding More Hooks

Create new hook files in `backend/.husky/`:

```bash
# Pre-push hook
npx husky add backend/.husky/pre-push "cd backend && npm run test:contracts"
```

## Performance

### Speed Optimizations

- **Incremental**: Only checks staged files
- **Parallel**: ESLint, Prettier, and Jest run concurrently
- **Smart Tests**: Jest only runs tests related to changed files
- **Bail Fast**: Stops on first test failure

### Typical Timing

- 1-2 files: ~2-5 seconds
- 5-10 files: ~5-15 seconds
- 20+ files: ~15-30 seconds

### Slow Commits?

If hooks are too slow:

1. **Skip tests temporarily:**
   ```json
   "*.ts": ["eslint --fix", "prettier --write"]
   ```

2. **Increase Jest timeout:**
   ```json
   "*.ts": ["jest --bail --findRelatedTests --passWithNoTests --maxWorkers=4"]
   ```

3. **Use bypass flag for WIP:**
   ```bash
   git commit --no-verify
   ```

## Troubleshooting

### Hooks Not Running

```bash
# Reinitialize Husky
cd backend
rm -rf .husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### Permission Denied

```bash
chmod +x backend/.husky/pre-commit
chmod +x backend/.husky/_/husky.sh
```

### ESLint Errors

Fix errors manually or bypass:
```bash
git commit --no-verify
```

Then fix issues:
```bash
npm run lint
```

### Jest Failures

Run tests manually to debug:
```bash
npm test -- --findRelatedTests src/auth/auth.service.ts
```

### Hooks Running in Wrong Directory

Ensure the pre-commit hook has `cd backend`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd backend && npx lint-staged
```

## CI/CD Integration

Pre-commit hooks complement CI checks:

- **Pre-commit**: Fast feedback on local machine (2-30s)
- **CI**: Comprehensive checks on all files (2-10min)

Both should pass before merging to main.

## Best Practices

- Commit frequently with small changes (faster hooks)
- Run full test suite before pushing: `npm test`
- Use `--no-verify` sparingly and intentionally
- Keep hook scripts fast (< 30s for typical commits)
- Document any custom hooks in this file
- Review hook output for warnings and errors

## Team Guidelines

### For Contributors

- Hooks are mandatory for all commits to main/develop
- Fix lint/format issues before committing
- Ensure tests pass locally
- Use `--no-verify` only for WIP branches
- Run `npm run lint` and `npm test` before creating PRs

### For Maintainers

- Keep hook configuration in sync with CI
- Monitor hook performance (should be < 30s)
- Update documentation when adding new hooks
- Consider team feedback on hook strictness
- Balance speed vs. thoroughness

## Disabling Hooks Globally

If you need to disable hooks temporarily:

```bash
# Disable for current shell session
export HUSKY=0

# Disable permanently (not recommended)
echo 'export HUSKY=0' >> ~/.bashrc
```

To re-enable:
```bash
unset HUSKY
```

## Advanced Configuration

### Conditional Hooks

Run different checks based on branch:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "main" ]; then
  echo "Committing to main - running full checks"
  cd backend && npm run lint && npm test
else
  cd backend && npx lint-staged
fi
```

### Skip Specific Files

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "!(**/migrations/*.ts)": [
      "jest --bail --findRelatedTests --passWithNoTests"
    ]
  }
}
```

## Migration from Other Tools

### From pre-commit (Python)

Replace `.pre-commit-config.yaml` with Husky setup:

```bash
rm .pre-commit-config.yaml
cd backend
npm install --save-dev husky lint-staged
npm run prepare
```

### From lefthook

Replace `lefthook.yml` with Husky:

```bash
rm lefthook.yml
cd backend
npm install --save-dev husky lint-staged
npm run prepare
```
