# VocalX (Monorepo)

This repo is evolving into a full-stack VocalX platform:

- `apps/webapp`: Next.js 14 web app (Studio UI + API)
- `apps/mobile`: Expo / React Native app (light client)
- `packages/shared`: shared TypeScript types/utilities
- `infrastructure/paperspace`: job runner + model management for GPU processing

## Development (local)

Install dependencies at repo root:

```bash
npm install
```

Run all apps:

```bash
npm run dev
```

## Legacy (archived)

The previous native Android/Kotlin on-device prototype (Gradle project + models/docs) has been archived to:

- `legacy/android-native/`



