# Probot: DCO

a GitHub Integration built with [probot](https://github.com/probot/probot) that enforces the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) on Pull Requests. It requires all commit messages to contain the `Signed-off-by` line with an email address that matches the commit author.

## Usage

[Configure the integration](https://github.com/apps/dco) for your organization or repositories. Enable [required status checks](docs/required-statuses.md) if you want to enforce the DCO on all commits.

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this plugin.

## Modes of operations

### Default

By default, Probot DCO enforces the presence of [valid DCO signoffs](#how-it-works) on all commits (excluding bots and merges). If a PRs contains commits that lack a valid Signed-off-by line, they are blocked until a correctly signed-off revision of the commit is pushed. This closely mirrors the upstream Linux kernel process.

### Individual remediation commit support

Optionally, a project can allow individual remediation commit support, where the failing commit's author can push an additional properly signed-off commit with additional text in the commit log that indicates they apply their signoff retroactively.

To enable this, place the following configuration file in `.github/dco.yml` on the default branch:

```yaml
allowRemediationCommits:
  individual: true
```

### Third-party remediation support

Additionally, a project can allow third-parties to sign off on an author's behalf by pushing an additional properly signed-off commit with additional text in the commit log that indicates they sign off on behalf of the author. Third-party remediation requires individual remediation to be enabled.

To enable this, place the following configuration file in `.github/dco.yml` on the default branch:

```yaml
allowRemediationCommits:
  individual: true
  thirdParty: true
```

### Skipping sign-off for organization members

It is possible to disable the check for commits authored and [signed](https://help.github.com/articles/signing-commits-using-gpg/) by members of the organization the repository belongs to. To do this, place the following configuration file in `.github/dco.yml` on the default branch:

```yaml
require:
  members: false
```

When this setting is present on a repository that belongs to a GitHub user (instead of an organization), only the repository owner is allowed to push commits without sign-off.

## How it works

The Developer Certificate of Origin (DCO) is a lightweight way for contributors to certify that they wrote or otherwise have the right to submit the code they are contributing to the project. Here is the full [text of the DCO](https://developercertificate.org/), reformatted for readability:

> By making a contribution to this project, I certify that:
>
> a. The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> b. The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
>
> c. The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> d. I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

Contributors _sign-off_ that they adhere to these requirements by adding a `Signed-off-by` line to commit messages.

```
This is my commit message

Signed-off-by: Random J Developer <random@developer.example.org>
```

Git even has a `-s` command line option to append this automatically to your commit message:

```
$ git commit -s -m 'This is my commit message'
```

Once [installed](#usage), this integration will create a [check](https://developer.github.com/v3/checks/runs/) indicating whether or not commits in a Pull Request do not contain a valid `Signed-off-by` line.

![DCO success](https://user-images.githubusercontent.com/13410355/42352738-35f4e690-8071-11e8-9c8c-260e5868bfc8.png)
![DCO failure](https://user-images.githubusercontent.com/13410355/42352794-85fe1c9c-8071-11e8-834a-05a4aeb8cc90.png)

Additionally, the DCO creates an override button accessible to only those with write access to the repository to create a successful check.

![DCO button](https://user-images.githubusercontent.com/13410355/42353254-3bfa266a-8074-11e8-80b4-18760c5efeee.png)

## Further Reading

If you want to learn more about the DCO and why it might be necessary, here are some good resources:

- [Developer Certificate of Origin versus Contributor License Agreements](https://julien.ponge.org/blog/developer-certificate-of-origin-versus-contributor-license-agreements/)
- [The most powerful contributor agreement](https://lwn.net/Articles/592503/)
