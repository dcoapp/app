# Probot: DCO

a GitHub Integration built with [probot](https://github.com/probot/probot) that enforces the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) on commits and pull requests. It requires all commit messages to contain the `Signed-Off-By` line with an email address that matches the commit author.

## Setup

```
# Install dependencies
npm install

# Run the bot
npm start
```

For more information, see the [documentation for probot](https://github.com/probot/probot).

## TODO

- [x] status for each commit
- [x] status for PRs
- [x] Deploy
- [ ] Check that signoff matches commit author
- [ ] Configurable description/url for commit & PR failure
- [ ] Recommend protected branches
