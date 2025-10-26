# Slack Clone (Vite + React + Firebase)

A lightweight Slack-style chat client built with React 19, TypeScript, and Vite. It uses
Firebase for persistence and real-time updates (channels + messages) and keeps everything
client-side so you can drop in your Firebase project keys to get moving quickly.

## Features

- Channel list with live updates powered by Firestore listeners
- Create new channels with optional topics
- Real-time message stream with avatars, timestamps, and optimistic loading
- Local display-name capture (stored in localStorage) for simple identity
- Graceful fallback UI when Firebase credentials are missing

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Provide Firebase credentials**

   - Open `src/firebaseConfig.ts` and replace the placeholder strings with the config
     from your Firebase console (Project Settings → General → Your apps → Web app).
   - Ensure Cloud Firestore is enabled in your Firebase project.

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app will load at the URL printed in the console. You are prompted to choose a
   display name the first time you open it.

## Firebase Data Model

```text
channels (collection)
  └── {channelId}
        • name        string
        • topic       string | null
        • createdBy   string
        • createdAt   serverTimestamp
        └── messages (sub-collection)
              └── {messageId}
                    • text       string
                    • author     string
                    • createdAt  serverTimestamp
```

The UI listens to both collections with `onSnapshot`, so creating channels or sending
messages reflects instantly across connected clients.

## Scripts

- `npm run dev` – start Vite in development mode
- `npm run build` – type-check and build for production
- `npm run preview` – run the built app locally
- `npm run lint` – run ESLint on the project

## Next Steps

- Wire up Firebase Authentication if you need stronger identity guarantees
- Add reactions / thread support by extending the Firestore schema
- Deploy behind Firebase Hosting, Vercel, or Netlify once you are happy with the UX
