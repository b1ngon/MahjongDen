# Mahjong Den

Multiplayer mahjong — mobile app built with [Expo](https://expo.dev/) and React Native. This repository is a **pnpm monorepo**; the game lives in `artifacts/mahjong-den`.

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/installation) — the workspace enforces pnpm for installs

## Quick start

From the repository root:

```bash
pnpm install
cd artifacts/mahjong-den
pnpm exec expo start
```

Then choose **Android**, **iOS** (macOS + Xcode), or **web** from the Expo CLI / Dev Tools.

> The `dev` script in `artifacts/mahjong-den/package.json` is tailored for Replit. For local development, **`pnpm exec expo start`** (or `npx expo start` from that folder) is the usual entry point.

## Repository layout

| Path | Purpose |
|------|---------|
| `artifacts/mahjong-den/` | **Mahjong Den** Expo app (`app.json`, screens, assets) |
| `lib/` | Shared libraries (API client, DB helpers, etc.) |
| `artifacts/` | Other workspace apps and tooling |

## Android / iOS identifiers

- **Android:** `com.mahjongden.app`
- **iOS:** `com.mahjongden.app`

EAS builds and store submissions use the config under `artifacts/mahjong-den/app.json`.

## License

Workspace root `package.json` declares the project license (`MIT`).
