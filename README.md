# Smart Home Simulator

This workspace now runs the smart home house-view simulator through the Next.js app in [backend](backend).

## Run

From the workspace root:

```bash
npm run dev
npm run build
```

These commands delegate to the Next.js simulator in [backend/app/page.tsx](backend/app/page.tsx).

## Firebase Sync

The simulator watches Firestore and mirrors the Android app state in real time when the `NEXT_PUBLIC_FIREBASE_*` environment variables are configured in the Next.js app.

## Layout

The root React/Vite starter files have been removed. The visible simulator is the Firebase-connected house view with two floors and camera panels.
