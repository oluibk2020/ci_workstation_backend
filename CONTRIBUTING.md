# Contributing & Code Review Guide

Welcome to the project! 👋

This document explains how we work with Git, GitHub, branches, Pull Requests, and code reviews.

Our goal is simple:

> **No code should be added directly to the `master` branch without review.**

---

## 1. Branch Structure

The `master` branch is our main and protected branch.

```text
master
  │
  ├── feature/login
  ├── feature/job-search
  ├── fix/authentication-error
  └── fix/job-filter
```

### `master`

The `master` branch contains the approved and stable version of the project.

**Do not push directly to `master`.**

All changes must go through a Pull Request (PR).

---

# 2. Before You Start Working

Always make sure your local `master` branch is up to date.

```bash
git checkout master
git pull origin master
```

Then create a new branch for your work.

For example:

```bash
git checkout -b feature/job-search
```

Or:

```bash
git checkout -b fix/login-error
```

---

# 3. Branch Naming Convention

Please use clear branch names.

### New features

```text
feature/feature-name
```

Example:

```text
feature/job-search
feature/user-profile
feature/payment-integration
```

### Bug fixes

```text
fix/bug-name
```

Example:

```text
fix/login-error
fix/job-filter
fix/payment-error
```

### Refactoring

```text
refactor/area-name
```

Example:

```text
refactor/auth-service
refactor/job-service
```

### Documentation

```text
docs/documentation-name
```

Example:

```text
docs/api-documentation
```

Keep branch names short and descriptive.

---

# 4. Work on Your Branch

Once your branch has been created, do your work there.

Example:

```bash
git checkout -b feature/job-search
```

Make your changes and test them locally.

Before committing, check your changes:

```bash
git status
```

You can also review the exact changes:

```bash
git diff
```

---

# 5. Commit Your Changes

Make commits that clearly describe what you changed.

Good:

```bash
git commit -m "Add job search filters"
```

```bash
git commit -m "Fix subscription validation"
```

```bash
git commit -m "Add verified jobs endpoint"
```

Avoid vague messages such as:

```bash
git commit -m "Update"
```

```bash
git commit -m "Changes"
```

```bash
git commit -m "Fix stuff"
```

A commit message should tell another developer what the commit actually did.

---

# 6. Push Your Branch

Push your feature/fix branch to GitHub.

```bash
git push -u origin feature/job-search
```

For subsequent changes, you can simply use:

```bash
git push
```

Remember:

```text
✅ git push origin feature/job-search

❌ git push origin master
```

---

# 7. Create a Pull Request

After pushing your branch to GitHub:

1. Open the repository on GitHub.
2. Click **Compare & pull request**.
3. Make sure the target branch is:

```text
master
```

4. Make sure your branch is the source branch.

For example:

```text
base: master
compare: feature/job-search
```

5. Create the Pull Request.

---

# 8. Pull Request Title

Use a clear title that describes the change.

Good examples:

```text
Add job search filters
```

```text
Fix authentication token validation
```

```text
Add seat allocation to admin
```


Avoid:

```text
Update
```

```text
Changes
```

```text
New stuff
```

---

# 9. Pull Request Description

Explain what you changed and anything the reviewer should know.

Use the following format:

## What changed?

Briefly explain what you implemented or fixed.

## Why?

Explain the reason for the change.

## How was it tested?

Explain how you tested the changes.

Example:

```markdown
## What changed?

- Added job search filtering by location
- Added category filtering
- Added salary range filtering

## Why?

Users need to be able to narrow down available jobs.

## How was it tested?

- Tested locally
- Tested API responses
- Tested frontend filtering
- Ran the production build
```

---

# 10. Code Review Process

Once you create a Pull Request, the code will be reviewed before it is merged into `master`.

The reviewer may:

* Approve the Pull Request
* Leave comments
* Ask questions
* Request changes
* Ask for additional tests
* Ask for code improvements

Do not merge your own Pull Request unless explicitly agreed upon.

---

# 11. What Happens If Changes Are Requested?

Don't create another Pull Request.

Simply make the requested changes on the same branch.

For example:

```bash
git checkout feature/job-search
```

Make the changes:

```bash
git add .
git commit -m "Address PR review comments"
```

Then push:

```bash
git push
```

The existing Pull Request will automatically update.

The reviewer can then review the new changes.

---

# 12. Responding to Review Comments

Please treat code review as collaboration, not criticism.

If a reviewer asks:

> Why are we making this database query inside the controller?

Explain your reasoning or make the requested change.

If you disagree with a suggestion, discuss it in the Pull Request.

For example:

```text
I placed this here because the endpoint requires the
result before calling the service. However, I agree that
moving this logic into the service would make it cleaner.
I'll refactor it.
```

The objective is to produce better code, not to "win" a review.

---

# 13. Before Requesting Review

Before creating a Pull Request, make sure:

* [ ] The application runs locally
* [ ] Your changes work as expected
* [ ] Existing functionality still works
* [ ] No unnecessary files were added
* [ ] No `.env` files or secrets were committed
* [ ] No passwords/API keys/tokens were committed
* [ ] Code is formatted
* [ ] ESLint passes (if applicable)
* [ ] Tests pass (if applicable)
* [ ] Production build succeeds (if applicable)
* [ ] Your branch is up to date with `master`

---

# 14. Keep Pull Requests Small

Avoid putting many unrelated changes into one Pull Request.

### Good

```text
PR: Add job search filters
```

Contains only changes related to job search.

### Not recommended

```text
PR: Add job search + redesign homepage + fix login +
update database + change payment system
```

Smaller Pull Requests are easier and faster to review.

---

# 15. Keep Your Branch Updated

If `master` has received new changes while you are working, update your branch before merging.

First:

```bash
git checkout master
git pull origin master
```

Then return to your branch:

```bash
git checkout feature/job-search
```

Then update it from `master`:

```bash
git merge master
```

If there are conflicts, resolve them locally, test the application, and push the changes:

```bash
git push
```

---

# 16. Never Commit Secrets

**Never commit sensitive information to GitHub.**

Do not commit:

```text
.env
.env.local
.env.production
```

API keys, passwords, private keys, database credentials, JWT secrets, payment credentials, and other sensitive information must never be committed.

Use environment variables instead.

Example:

```env
DATABASE_URL=...
JWT_SECRET=...
API_KEY=...
```

Make sure the appropriate environment files are included in `.gitignore`.

---

# 17. Do Not Rewrite Shared History

Avoid commands such as:

```bash
git push --force
```

especially against shared branches.

Never force-push to:

```text
master
```

If you are unsure about a Git operation, ask before doing it.

---

# 18. Merging a Pull Request

Only merge after the review requirements have been satisfied.

The normal process is:

```text
Developer
    ↓
Create branch
    ↓
Write code
    ↓
Test locally
    ↓
Push branch
    ↓
Create Pull Request
    ↓
Code Review
    ↓
Changes requested?
    │
    ├── YES → Make changes → Push again
    │
    └── NO
          ↓
       Approval
          ↓
     Merge into master
```

---

# 19. After Your Pull Request Is Merged

Once your Pull Request has been merged, you can delete your feature branch.

On your computer:

```bash
git checkout master
git pull origin master
```

Then delete the local branch:

```bash
git branch -d feature/job-search
```

You can also delete the remote branch through GitHub.

---

# 20. Quick Workflow

For everyday development, this is the workflow to remember:

### Step 1 — Update master

```bash
git checkout master
git pull origin master
```

### Step 2 — Create a branch

```bash
git checkout -b feature/my-feature
```

### Step 3 — Develop

Make your changes and test them.

### Step 4 — Commit

```bash
git add .
git commit -m "Describe what you changed"
```

### Step 5 — Push

```bash
git push -u origin feature/my-feature
```

### Step 6 — Create Pull Request

```text
feature/my-feature → master
```

### Step 7 — Wait for review

The reviewer checks the code.

### Step 8 — Fix review comments if necessary

```bash
git add .
git commit -m "Address review comments"
git push
```

### Step 9 — Get approval

Once approved, the Pull Request can be merged.

### Step 10 — Update your local master

```bash
git checkout master
git pull origin master
```

---

# 21. Golden Rules

### 🔒 Rule 1

**Never push directly to `master`.**

### 🌿 Rule 2

**Always work on a feature/fix branch.**

### 🔍 Rule 3

**Every change should go through a Pull Request.**

### 👀 Rule 4

**Code should be reviewed before it enters `master`.**

### 🧪 Rule 5

**Test your code before requesting a review.**

### 🔐 Rule 6

**Never commit secrets or credentials.**

### 💬 Rule 7

**Keep Pull Requests small and focused.**

### 🤝 Rule 8

**Code reviews are collaborative. Be respectful and explain your decisions.**

---

# Our Standard Git Workflow

```text
                 ┌─────────────────┐
                 │      MASTER     │
                 │    🔒 Protected │
                 └────────┬────────┘
                          ▲
                          │
                       APPROVE
                          │
                   ┌──────┴──────┐
                   │ Pull Request│
                   │   👀 Review │
                   └──────┬──────┘
                          ▲
                          │
                       PUSH
                          │
              ┌───────────┴───────────┐
              │                       │
       feature/login          feature/job-search
              │                       │
              └───────────┬───────────┘
                          │
                       DEVELOP
                          │
                       DEVELOPER
```

## Final Reminder

**`master` is protected.**

If you have code to contribute:

```text
Create branch
     ↓
Write code
     ↓
Test
     ↓
Push branch
     ↓
Create Pull Request
     ↓
Get reviewed
     ↓
Fix requested changes
     ↓
Get approval
     ↓
Merge
```

**If it isn't reviewed, it doesn't go into `master`.**

I recommend saving this specifically as **`CONTRIBUTING.md`** in the root of the repository. That way, every collaborator can see it directly on GitHub and understand the workflow before contributing.
