# Fermentation CFD Studio — Public Demonstration

This is the **public, static-browser-only showcase** of Fermentation CFD Studio. It contains the spatial explorer, 3 L / 5 L configurable reactor designer, compatible CFD field comparison, and scientific multi-panel visualization. Demonstration fields are analytical and **are not CFD solutions or validated fermentation physics**.

The full scientific research and server repository remains private. Do not copy experimental data, secret keys, solver inputs or unpublished research into this public site.

## Open the website

After enabling Pages, visit:

**https://xuyuchen231-stack.github.io/-Fermentation-CFD-demo/**

The repository name starts with a hyphen. This is intentional and is part of the URL.

## Enable publishing once

Open [Settings → Pages](https://github.com/xuyuchen231-stack/-Fermentation-CFD-demo/settings/pages), select **Build and deployment → Source → GitHub Actions**. The automatic deployment workflow will publish browser assets on pushes to `main`. If a previous attempt failed because Pages was disabled, open [Actions → Publish public CFD Studio demo](https://github.com/xuyuchen231-stack/-Fermentation-CFD-demo/actions/workflows/pages.yml) and use **Run workflow** to retry.

Only an allowlist of frontend assets is included in the published website. CFD JSON files imported through the browser are processed client-side, not uploaded to a backend.
