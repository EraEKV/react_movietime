# Workflow and Conventions

## Branches

`main` is production: every push is deployed (and `vercel.json` allows deployments from `main` only) to https://react-movietime.vercel.app by Vercel.

| Change                                                | Where                         |
| ----------------------------------------------------- | ----------------------------- |
| Small: docs, typos, config tweaks, a one-file bug fix | Commit straight to `main`     |
| Feature or anything that touches several modules      | Branch → pull request → merge |

Branch names: `<type>/<short-kebab-description>`

```
feat/firebase-auth
feat/planner
fix/catalog-page-size
docs/final-readme
chore/upgrade-vite
```

Pull requests:

- Title in Conventional Commits format (it becomes the squash-merge commit):
  `feat(auth): email and google sign-in`.
- Description: what changed, how to test, screenshots for UI changes.
- Before merging: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`
  (once tests exist) and `npm run build` pass and the Vercel
  preview works.
- Merge with **squash**, then delete the branch.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary in imperative mood, lowercase, no period>

<optional body: why, not what>
```

| Type       | When                                                    |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature for the user                              |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no code change                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Tests                                                   |
| `build`    | Build system, dependencies                              |
| `ci`       | CI configuration                                        |
| `chore`    | Anything else (tooling, configs)                        |

Scopes used in this project: `auth`, `catalog`, `movies`, `series`, `library`, `lists`,
`sharing`, `planner`, `dashboard`, `profile`, `theme`, `i18n`, `pwa`, `firebase`, `store`,
`types`, `ui`, `deps`.

Examples:

```
feat(auth): add google sign-in with popup
feat(planner): generate sessions from episode list
fix(catalog): keep page size when changing filters
refactor(library): move watchlist storage behind libraryService
docs: add data model and firebase setup
build(deps): add firebase
```

Breaking changes: add `!` after the type (`feat(library)!: …`) and a `BREAKING CHANGE:` footer.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and on pull requests to `main` (Node 24 from
`.nvmrc`, no secrets needed). It runs the same checks you run before a pull request, in this
order: `npm ci`, `npm run typecheck`, `npm run lint`, Prettier over tracked files,
`npm run check:locales`, `npm run test:coverage`, `npm run build`. The coverage report is kept
as a run artifact; `npm audit --audit-level=high` is informational only. A newer push to the
same branch cancels the older run.

Run the same checks locally:

```bash
npm run typecheck && npm run lint && npx prettier --check --ignore-unknown $(git ls-files) \
  && npm run check:locales && npm test && npm run build
```

Dependencies are updated by hand; there is no Dependabot. Vercel stays responsible for
deployment.
