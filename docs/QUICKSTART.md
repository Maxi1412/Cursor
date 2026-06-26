# George Orchestra — Quick Start (minimal commands)

## One-time setup (run on Windows desktop)

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Cursor
copy .env.example .env
# Edit .env: set FIREBASE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS

npm install
npm run george:setup
```

This automatically:
- Copies orchestra module into `Personal_caledar\orchestra\`
- Patches George speech handler + App.tsx
- Merges Firestore rules
- Verifies Firebase project IDs match

## Desktop (every session)

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Cursor
npm run orchestra:start
```

## Build + deploy APK (after George changes)

```powershell
npm run george:build-deploy
```

Saves APK to:
- `Personal_caledar\builds\`
- Google Drive: `Application Projects\personal calendar\`
- Synology/NAS (auto-detected mapped drives)

## Firebase rules (one-time after integrate)

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Personal_caledar
firebase deploy --only firestore:rules
```

## Test Firebase end-to-end (optional)

```powershell
# Terminal 1:
npm run orchestra:start

# Terminal 2:
npm run orchestra:test-firebase
```

---

## Shortest test sequence

### Desktop first

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Cursor
npm run george:setup
npm run orchestra:start
```

Confirm in Firebase Console → Firestore → `orchestra_desktops` document updating every ~15s.

### Phone

1. Install APK from `Personal_caledar\builds\` (or rebuild with `npm run george:build-deploy`)
2. Say: **"Activate Project Management mode"**
   - Expect: *"Orchestra mode activated..."* + *"All systems online and ready"* + project choice question
3. Say: **"New project: English teaching app with native English and Spanish voices"**
   - Expect: routing summary + delegation confirmation
4. Say: **"Exit orchestra mode"**
5. Test calendar/expenses — must work normally

### If desktop offline

Stop coordinator, say activate on phone → expect *"Desktop is offline — limited mode only"*
