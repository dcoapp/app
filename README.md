# Probot: DCO

a GitHub Integration built with [probot](https://github.com/probot/probot) that enforces the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) on commits and pull requests. It requires all commit messages to contain the `Signed-Off-By` line with an email address that matches the commit author.

## Usage

[Configure the integration](https://github.com/integration/dco) for your organization or repositories.

Enable [required status checks](https://help.github.com/articles/about-required-status-checks/) if you want to enforce the DCO on all commits (you will need to open at least one Pull Request after configuring the integration before you can set this up).

![](https://cloud.githubusercontent.com/assets/173/24323001/7013b7c0-113c-11e7-8ef6-8f6cb7539f33.png)

![](https://cloud.githubusercontent.com/assets/173/24323183/3281121e-1140-11e7-91fe-b2d9452dd3ba.png)

Now pushes to `master` will not be allowed, and all pull requests must pass the DCO checks before being merged.

## TODO

- [x] status for each commit
- [x] status for PRs
- [x] Deploy
- [x] Check that signoff matches commit author
- [ ] Configurable description/url for commit & PR failure
- [ ] Recommend protected branches
