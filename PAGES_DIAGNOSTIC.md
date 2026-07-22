# GitHub Pages failure diagnostic

- Workflow run: https://github.com/dh73/MMMMmmmmmmmaincra/actions/runs/29957606076
- Commit: 067ccb79682b0de4cac42147cdd7e17d358d4899
- Conclusion: failure

## Pages API
```json
{
  "status": "404",
  "message": "Not Found",
  "build_type": null,
  "source": null,
  "html_url": null,
  "https_enforced": null,
  "protected_domain_state": null,
  "pending_domain_unverified_at": null
}
```

## Jobs and failing steps
### verify — success

### deploy — failure
- Step: Configure GitHub Pages (failure)

## Relevant log tail
```text
2026-07-22T21:02:33.5201176Z ##[group]GITHUB_TOKEN Permissions
2026-07-22T21:02:33.5207079Z Pages: write
2026-07-22T21:02:34.4227209Z Download action repository 'actions/configure-pages@v5' (SHA:983d7736d9b0ae728b81ab479565c72886d7745b)
2026-07-22T21:02:34.8369103Z Download action repository 'actions/upload-pages-artifact@v3' (SHA:56afc609e74202658d3ffba0e8f6dda462b719fa)
2026-07-22T21:02:35.0542018Z Download action repository 'actions/deploy-pages@v4' (SHA:d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e)
2026-07-22T21:02:36.4282777Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-07-22T21:02:37.4541080Z ##[group]Run actions/configure-pages@v5
2026-07-22T21:02:37.9111573Z ##[error]Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions, or consider exploring the `enablement` parameter for this action. Error: Not Found - https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
2026-07-22T21:02:37.9124753Z ##[error]HttpError: Not Found - https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
2026-07-22T21:02:38.2187503Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/configure-pages@v5. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-07-22T21:02:28.2430000Z Job defined at: dh73/MMMMmmmmmmmaincra/.github/workflows/pages.yml@refs/heads/main
2026-07-22T21:02:33.5201107Z ##[group]GITHUB_TOKEN Permissions
2026-07-22T21:02:33.5207057Z Pages: write
2026-07-22T21:02:34.4227181Z Download action repository 'actions/configure-pages@v5' (SHA:983d7736d9b0ae728b81ab479565c72886d7745b)
2026-07-22T21:02:34.8369045Z Download action repository 'actions/upload-pages-artifact@v3' (SHA:56afc609e74202658d3ffba0e8f6dda462b719fa)
2026-07-22T21:02:35.0541985Z Download action repository 'actions/deploy-pages@v4' (SHA:d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e)
2026-07-22T21:02:36.4282747Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-07-22T21:02:37.4541071Z ##[group]Run actions/configure-pages@v5
2026-07-22T21:02:37.9111510Z ##[error]Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions, or consider exploring the `enablement` parameter for this action. Error: Not Found - https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
2026-07-22T21:02:37.9124734Z ##[error]HttpError: Not Found - https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
2026-07-22T21:02:38.2187474Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/configure-pages@v5. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
2026-07-22T21:02:18.6813572Z ##[group]GITHUB_TOKEN Permissions
2026-07-22T21:02:18.6818093Z Pages: write
2026-07-22T21:02:19.9372169Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-07-22T21:02:14.4330000Z Job defined at: dh73/MMMMmmmmmmmaincra/.github/workflows/pages.yml@refs/heads/main
2026-07-22T21:02:18.6813564Z ##[group]GITHUB_TOKEN Permissions
2026-07-22T21:02:18.6818089Z Pages: write
2026-07-22T21:02:19.9372117Z hint: will change to "main" in Git 3.0. To configure the initial branch name
```
