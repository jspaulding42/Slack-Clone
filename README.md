# Slack Clone (Vite + React + Firebase)

A lightweight Slack-style chat client built with React 19, TypeScript, and Vite. The app now
uses Firebase Authentication for email/password login plus Firestore for realtime channels,
messages, users, and organizations.

## Features

- Email/password authentication with Firebase Auth and profile bootstrap in Firestore
- Organization-aware workspace switching with automatic selection + manual switcher
- Create new organizations and channels from the UI
- Real-time channel list and message stream powered by Firestore listeners
- Graceful fallback UI when Firebase credentials are missing

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Provide Firebase credentials**

   - Open `src/firebaseConfig.ts` and replace the placeholder strings with the config
     from your Firebase console (Project Settings → General → Your apps → Web app).
   - Enable **Cloud Firestore** and the **Email/Password** provider under Firebase Auth.

3. **(Recommended) Configure indexes & rules**

   - Add a composite index on the `channels` collection for `organizationId ASC, createdAt ASC`
     to support the scoped query in `listenToChannels`.
   - Ensure the Firestore rules for `users` allow storing the `email`, `emailLower`,
     `displayName`, and a placeholder `passwordHash` (set to `firebase-auth-managed`).

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app opens at the URL printed in the console.

## User & Organization Flow

- New visitors create an account or log in through the modal that appears automatically.
- After authentication, the app loads all organizations that list the user in `memberIds`.
- If only one organization exists, it is auto-selected; if multiple exist, a picker lets the
  user choose and they can switch later from the sidebar.
- Users can create additional organizations at any time; the creator is stored as the sole
  initial member to satisfy the Firestore rules included above.

## Firebase Data Model

```text
users (collection)
  └── {userId}
        • email             string
        • emailLower        string
        • displayName       string
        • passwordHash      string ('firebase-auth-managed')
        • createdAt         serverTimestamp

organizations (collection)
  └── {orgId}
        • name              string
        • memberIds         string[] (creator id as first entry)
        • createdBy         string (user id)
        • createdByDisplayName string
        • createdAt         serverTimestamp

channels (collection)
  └── {channelId}
        • name              string
        • topic             string | null
        • organizationId    string
        • createdBy         string
        • createdAt         serverTimestamp
        └── messages (sub-collection)
              └── {messageId}
                    • text       string
                    • author     string
                    • createdAt  serverTimestamp
```

The UI listens to both channels and messages with `onSnapshot`, so any change reflects
instantly across connected clients.

## Scripts

- `npm run dev` – start Vite in development mode
- `npm run build` – type-check and build for production
- `npm run preview` – run the built app locally
- `npm run lint` – run ESLint on the project

## Next Steps

- Replace the placeholder `passwordHash` field once Firestore rules are updated for Auth-only
  profiles
- Expand membership management (invites, multi-member organizations) once the backend rules
  allow updating `memberIds`
- Add Vitest + React Testing Library coverage for the auth and organization flows
- Deploy behind Firebase Hosting, Vercel, or Netlify once you are happy with the UX
