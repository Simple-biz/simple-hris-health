# Simple HQ Status

Public status page for Simple HQ, the HRIS: **https://status.simple.biz**

It runs entirely on GitHub, apart from the app, so it stays up when the app is down.
GitHub Actions check the app every 5 minutes and commit the results here. The page is
built to the `gh-pages` branch and served by GitHub Pages, and incidents are GitHub
issues. Built with [Upptime](https://upptime.js.org).

> **This repo is public.** Never put credentials, API keys or tokens in any file, issue
> or comment, and only monitor URLs that work without auth. The one secret, `GH_PAT`,
> is stored as an Actions secret.

<!--start: status pages-->
<!--end: status pages-->

## Working in this repo

- The Upptime bot commits to `main` on every status change and several times a day, so
  run `git pull --rebase` before you commit, or your push will be rejected.
- Don't edit `.github/workflows/*` by hand. Upptime regenerates them from
  `.upptimerc.yml`; change the config instead.
- Don't edit `history/`, `api/` or `graphs/`. The bot writes them.

| Path | What it is |
| --- | --- |
| `.upptimerc.yml` | Monitors and status page settings |
| `assets/` | Copied to the site root on every build |
| `assets/CNAME` | Custom domain; keep it equal to `status-website.cname` |
| `assets/status.css` | Status banner and uptime bar styles |
| `assets/uptime-bars.js` | Draws the 90-day uptime bars from `history/summary.json` |
| `assets/logo-192.png` | Logo and favicon (the app's chat-bubble icon) |
| `.github/ISSUE_TEMPLATE/` | Incident and scheduled maintenance templates |

## What's monitored

| Service | URL | Slug |
| --- | --- | --- |
| Simple HQ | https://hq.simple.biz/login | `simple-hq` |
| Simple HQ (legacy domain) | https://simple-hris.vercel.app/login | `simple-hq-legacy` |

A check passes on HTTP 200 after following up to 3 redirects. The legacy domain
redirects to the primary one, so its check covers the redirect plus the primary page.
No response within 60 s counts as down. Checks never report "degraded" unless you set
`maxResponseTime` (in ms) on a site; slower responses then count as degraded.

When a check fails, Upptime opens an issue such as `🛑 Simple HQ is down`, labelled
`status` and the service's slug. When the check passes again it comments and closes it.

GitHub runs scheduled workflows on a best-effort basis, so at busy times a check can be
late or skipped.

## Add a monitor

1. Add an entry under `sites` in `.upptimerc.yml`:

   ```yaml
   - name: Simple HQ API
     slug: simple-hq-api
     url: https://hq.simple.biz/api/health
     expectedStatusCodes:
       - 200
   ```

2. Commit and push. A push that changes `.upptimerc.yml` runs **Setup CI**, which
   regenerates the workflows and rebuilds the page. The service appears after its
   first check.

Rules:

- The URL must work without auth. Never put a token in a URL or header: this file is public.
- `slug` is permanent. It names the history files and the service's issue label.
  Renaming `name` is fine; changing `slug` starts a new history.
- To remove a monitor, delete its entry. Setup CI deletes its data on the next run.

The `/api/health` entry is already in the config, commented out. Uncomment it once the
endpoint exists and returns 200 without auth. Today the URL returns 401 because the
app's auth guard covers `/api/*`.

## Post an incident

Upptime handles outages its checks can see. For anything else, such as the login page
loading while payroll dispatch fails, post an incident by hand.

### Labels

| Label | Added by | Effect |
| --- | --- | --- |
| `status` | You, by hand | **Required.** Puts the issue on the page: under *Active Incidents* while it's open (replacing the "All Systems Operational" banner), then under *Past Incidents* once it's closed. |
| `simple-hq`, `simple-hq-legacy` | Upptime | Ties an incident to a monitored service. Leave these off manual incidents (see below). |
| `maintenance` | You, by hand | Scheduled maintenance (see below). |

Create `status` and `maintenance` once, before the first incident:

```sh
gh label create status --repo Simple-biz/simple-hris-health --color d73a4a --description "Shown on status.simple.biz" --force
gh label create maintenance --repo Simple-biz/simple-hris-health --color fbca04 --description "Scheduled maintenance on status.simple.biz" --force
```

**Why not add the service label?** Upptime treats any open issue labelled `status`
plus a slug as its own. It counts the whole time the issue is open as downtime in that
service's uptime and bars. And if that service goes down while your issue is open,
Upptime won't open its own issue, and it closes yours when the service recovers. Add
the slug only for a full outage the checks missed that you want counted as downtime.

**Why the templates don't apply labels.** GitHub applies a template's labels for anyone
who opens an issue, including strangers on this public repo. A template that applied
`status` would let anyone post an incident on the page. Only collaborators can add
labels by hand.

### Rules that affect what the page shows

- **Title** is what users see. Use plain words, e.g. `Payroll dispatch degraded`.
  A title containing the lowercase word `degraded` shows amber (partial); any other
  title shows red (outage).
- **Body** isn't shown on the page, but it is public on GitHub. It must not be empty,
  and if it contains an HTML comment, no line in that comment may end in a colon.
  Either mistake makes the incident's page show an error. The template is already safe.
- **Comments** are the public updates, shown newest first. Every comment appears,
  so **lock the conversation**; collaborators can still comment on a locked issue.
- **Duration** shown is from when the issue was opened to when it was closed, so open
  it as soon as you know.
- Visitors' browsers cache GitHub data for about 2 minutes, so changes show up within a
  couple of minutes.

### Open

Web: **Issues → New issue → Incident**, write the title, submit. Then add the `status`
label, click **Lock conversation**, and post the first update as a comment.

CLI:

```sh
R=Simple-biz/simple-hris-health
gh issue create --repo $R --label status --title "Payroll dispatch degraded" \
  --body "Internal notes (public on GitHub, not shown on the status page)"
gh issue lock <number> --repo $R
gh issue comment <number> --repo $R --body "**Investigating** - Payroll emails are delayed. Pay amounts are not affected. Next update by 15:00 UTC."
```

### Update

Add a comment. Start each update with its state, e.g. **Identified** or **Monitoring**:

```sh
gh issue comment <number> --repo $R --body "**Identified** - A stuck queue is delaying dispatch. A fix is rolling out."
```

### Resolve

Post a final comment and close the issue. It moves to *Past Incidents*, and the banner
returns once no `status` issues are open.

```sh
gh issue close <number> --repo $R --comment "**Resolved** - Payroll dispatch is back to normal. Delayed emails were sent at 15:20 UTC."
```

### Scheduled maintenance

**Issues → New issue → Scheduled maintenance**. Edit the `start`, `end` (UTC) and
`expectedDown` slugs in the first comment block, then submit, add the `maintenance`
label and lock the conversation. Checks of the listed services that fail during the
window don't open incidents. Upptime closes the issue after `end`.

## Custom domain

`status.simple.biz` is set in `status-website.cname` (Upptime writes a `CNAME` file into
the built site) and in `assets/CNAME` (copied to the same place). Keep them identical.

DNS record (Route 53, hosted zone `simple.biz`):

| Record name | Type | Value | TTL |
| --- | --- | --- | --- |
| `status.simple.biz` | CNAME | `simple-biz.github.io` | 300 |

The value is the org's GitHub Pages host, with no repo name, `https://` or path.
After it resolves, **Settings → Pages** shows the domain check passing. Once the
certificate is issued, tick **Enforce HTTPS**.

Optional hardening: verify `simple.biz` for the Simple-biz org under **Org settings →
Pages → Add a domain**. GitHub then shows a TXT record to add, which stops any other
GitHub account from serving a site on `status.simple.biz`.

## The `GH_PAT` secret

The workflows commit results, open issues and deploy the page with `GH_PAT`, a
fine-grained token limited to this repo. It needs **read and write** on **Actions,
Contents, Issues and Workflows**; Metadata (read) is added automatically. When the token
expires, every workflow fails and the page stops updating, so set a reminder to rotate it.

## Workflows

| Workflow | Runs | Does |
| --- | --- | --- |
| Uptime CI | Every 5 min | Checks each URL, commits `history/`, opens and closes incidents |
| Response Time CI | Daily | Updates response-time data |
| Graphs CI | Daily | Draws the response-time graphs |
| Static Site CI | Daily, and on pushes to `assets/` | Builds the page and deploys it to `gh-pages` |
| Summary CI | Daily | Updates the status table in this README |
| Setup CI | On pushes that change `.upptimerc.yml` | Regenerates the workflows and runs all of the above |
| Update Template CI, Updates CI | Daily | Pull in Upptime updates |

Any workflow can be run by hand from the **Actions** tab (**Run workflow**).
