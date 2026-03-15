# Today - Your Daily Focus App

A beautiful, calming task management app for macOS with cloud sync.

## Features
- ✨ Gorgeous glassmorphic design
- 🎨 9 calming gradient themes
- 🔊 Satisfying sound effects
- 💾 Auto-saves your tasks locally
- ☁️ **Cloud sync with Firebase** (optional)
- 📊 Visual progress tracking

## Building the App

### Prerequisites
1. Install [Node.js](https://nodejs.org/) (v18 or later recommended)

### Steps

1. Open Terminal and navigate to this folder:
   ```bash
   cd /path/to/today-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the Mac app:
   ```bash
   npm run build
   ```

4. Find your app in the `dist` folder!

---

## Setting Up Cloud Sync (Firebase)

To sync tasks between your Mac app, website, and other devices:

### Step 1: Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it something like "today-tasks"
4. Disable Google Analytics (not needed) and click **Create**

### Step 2: Enable Firestore Database

1. In your Firebase project, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for now)
4. Select a location close to you
5. Click **Enable**

### Step 3: Enable Anonymous Authentication

1. Click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Under "Sign-in providers", click **"Anonymous"**
4. Toggle **Enable** and click **Save**

### Step 4: Get Your Config

1. Click the **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"** and click the **web icon** (</>)
3. Register your app (name it "today-web")
4. Copy the `firebaseConfig` object - it looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### Step 5: Add Config to Your App

1. Open `index.html` in a text editor
2. Find the `firebaseConfig` section near the top of the `<script>` tag
3. Replace the placeholder values with your real config
4. Save the file
5. Rebuild the app: `npm run build`

### Done! 🎉

Your tasks will now sync across all devices using the same Firebase project!

---

## Development

To run the app in development mode:
```bash
npm start
```

## Troubleshooting

**Sync shows "Local Only"**: Firebase config not set up yet - follow the steps above.

**Sync shows "Error"**: Check your Firebase console to make sure Firestore and Auth are enabled.

**Tasks not syncing**: Make sure you're connected to the internet and Firebase is configured correctly.

Enjoy your productive days! 🌟
