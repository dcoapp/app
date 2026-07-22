<!--
SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
SPDX-License-Identifier: ISC
-->

# Administration

Use this guide when you run your own DCO GitHub App instance or administer the
GitHub App that serves it. The [`app.yml`](../app.yml) manifest remains the
source of truth for required permissions and event subscriptions, but GitHub
reads it when someone creates a new app from the manifest. Later manifest edits
do not change existing app settings.

## Required permissions

Configure these permissions for the GitHub App. GitHub lists repository-scoped
entries under **Repository permissions** and lists **Members** under
**Organization permissions**.

<!-- markdownlint-disable MD013 -->

| Permission | Scope | Access | Why it's needed |
| --- | --- | --- | --- |
| Checks | Repository | Write | Creates the `DCO` check run and handles the manual "Set DCO to pass" check-run action. |
| Contents | Repository | Read | Reads commits with `compareCommits` so the app can check sign-offs. |
| Metadata | Repository | Read | Required baseline permission for all GitHub Apps. |
| Pull requests | Repository | Read | Reads pull request details and handles pull-request, review, review-comment, and merge-queue events. |
| Members | Organization | Read | Checks organization membership when a repository sets `require.members: false` to skip sign-off for organization members. |

<!-- markdownlint-enable MD013 -->

## Required event subscriptions

In GitHub's "Subscribe to events" list, use the display label shown in the
second column. The technical event name appears in webhook deliveries and in
`app.yml`.

<!-- markdownlint-disable MD013 -->

| Webhook event | GitHub UI label | Gating permission | Purpose |
| --- | --- | --- | --- |
| `check_run` | Check run | Checks | Handles re-runs and the manual check-run action. |
| `pull_request` | Pull request | Pull requests | Runs the DCO check when a pull request opens or synchronizes. |
| `pull_request_review` | Pull request review | Pull requests | Re-runs DCO when a review summary contains `@dcoapp recheck` on its own line. |
| `pull_request_review_comment` | Pull request review comment | Pull requests | Re-runs DCO when an inline review comment contains `@dcoapp recheck` on its own line. |
| `push` | Push | Contents | Listed in the manifest; the current code has no dedicated `push` handler. |
| `merge_group` | Merge queue entry | Pull requests | Runs DCO on merge-queue entries. GitHub shows this event as "Merge queue entry", not `merge_group`. |

<!-- markdownlint-enable MD013 -->

## Applying changes to an already-running app

Changing [`app.yml`](../app.yml) does not update existing app settings. For an
existing deployment, update the GitHub App settings manually:

1. Sign in as the GitHub App owner.
1. Open the app's **Permissions & events** page:
   - Personal account: **Settings** > **Developer settings** >
     **GitHub Apps** > **[app]** > **Permissions & events**
   - Organization: **Your organizations** > **[org]** > **Settings** >
     **Developer settings** > **GitHub Apps** > **[app]** >
     **Permissions & events**
1. Update **Repository permissions**, **Organization permissions**, and the
   **Subscribe to events** list.
1. Save the app.

Permission changes and event subscription changes have different operational
effects:

- Adding a permission prompts each installation's admin to approve the change.
  The app keeps working, but GitHub holds the change for that installation
  until an admin accepts it. GitHub also sends a notification.
- GitHub applies a removed permission as soon as you save it, with no
  installation re-approval.
- Adding or removing an event subscription does not require installation
  re-approval when the app already has the event's gating permission.
- GitHub hides an event checkbox until the app has the event's gating
  permission. For example, `issue_comment` needs the **Issues** permission;
  **Pull requests** alone does not expose that checkbox. Enabling
  issue-comment-based commands needs a permission change and installation
  re-approval.

## Post-change verification

After saving the app, trigger the relevant event. Then open the app's
**Advanced** settings and review **Recent Deliveries**. Confirm that GitHub sent
the expected event and that the app returned a `2xx` response.
