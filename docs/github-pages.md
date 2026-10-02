# Hosting Monitor X-Ray on GitHub Pages

The intended website address is https://monitor.dej.app/.

The Pages workflow builds the static React app from the same monitor component and stylesheet as the original Sites version. Every push to `main` publishes an update. No backend or API keys are needed.

## Repository settings

In **Settings → Pages**, choose **GitHub Actions** as the source and save `monitor.dej.app` as the custom domain. For Actions deployments, `public/CNAME` records the intended domain but does not replace this setting.

## DNS

At the DNS provider for `dej.app`, add this record:

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `monitor` | `bigcub.github.io` |

The target has no repository path. Remove conflicting records for `monitor`. Once DNS resolves and GitHub issues its certificate, enable **Enforce HTTPS** in Pages settings. `.app` domains require HTTPS.

[GitHub custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## Build locally

Use Node.js 22.13 or later:

```sh
npm ci
npm run build:pages
npm run preview:pages
```

The output is `dist-pages/`. The static entry `pages/main.tsx` renders `app/page.tsx` and `app/globals.css`. The original Sites commands remain available.
