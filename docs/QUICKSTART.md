# George Orchestra — Quick Start (minimal commands)

## One-time + full deploy (run on Windows desktop)

```powershell
cd C:\Users\acer\Documents\Claude\Projects\Cursor
copy .env.example .env
# Edit .env: set FIREBASE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS

npm install
npm run george:full-deploy
```

Or double-click `DEPLOY-GEORGE.bat` in the Cursor repo folder.

`george:full-deploy` automatically:
1. Checks all dependencies (Node, Java, Android SDK, George project, Google Drive)
2. Integrates orchestra into `Personal_caledar`
3. Runs 22 backend tests
4. Verifies Firebase config
5. Builds release APK
6. Copies APK to `Personal_caledar\builds\`, `K:\Application Projects\personal calendar\` (Google Drive maxscheurer85@gmail.com), and NAS if detected
7. Saves `George-orchestra-latest.apk` in each location

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
