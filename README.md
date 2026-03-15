# Today

Your Daily Focus — A beautiful task management app with glassmorphic design, 9 gradient themes, satisfying sound effects, and optional Firebase cloud sync.

## Features

- 9 calming gradient themes with smooth transitions
- Satisfying audio feedback (Web Audio API)
- Subtask support with progress tracking
- SVG progress ring with real-time updates
- Optional Firebase Firestore cloud sync across devices
- Daily auto-reset (completed tasks clear on new day)
- Keyboard accessible (Tab, Enter, Space navigation)
- Screen reader announcements for all actions

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

### Setup

```bash
# Install dependencies
npm install

# Start the Vite dev server (browser only)
npm run dev

# Start with Electron (full desktop app)
npm run dev:electron
```

### Firebase Setup (Optional)

Cloud sync is optional. Without it, the app works in local-only mode using localStorage.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in production mode with proper security rules)
3. Enable **Anonymous Authentication** in the Authentication section
4. Get your config from Project Settings > General > Your Apps > Web App
5. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_SYNC_ID=your-unique-sync-id
VITE_USERNAME=YourName
```

**Important:** Never commit your `.env` file. It is already in `.gitignore`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (browser) |
| `npm run dev:electron` | Start Vite + Electron together |
| `npm start` | Build + launch Electron |
| `npm run build` | Vite production build to `dist/` |
| `npm run build:mac` | Build macOS `.app` (dmg + zip) |
| `npm run build:all` | Build for macOS, Windows, Linux |
| `npm run lint` | Run ESLint on `src/` |
| `npm run format` | Format code with Prettier |

## Project Structure

```
today-app/
├── index.html              # Shell HTML (loads modules via Vite)
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── vite.config.mjs         # Vite build configuration
├── eslint.config.mjs       # ESLint configuration
├── src/
│   ├── index.js            # Entry point
│   ├── styles/
│   │   ├── index.css       # CSS entry (imports all below)
│   │   ├── variables.css   # CSS custom properties
│   │   ├── base.css        # Reset, layout, accessibility
│   │   ├── layout.css      # Header, content, quotes, animations
│   │   ├── components.css  # Top bar, buttons, theme modal
│   │   ├── tasks.css       # Task items, subtasks, inputs
│   │   └── progress.css    # Progress ring, stats
│   └── modules/
│       ├── app.js          # Orchestrator (initializes everything)
│       ├── store.js        # Pub/sub state management
│       ├── tasks.js        # Task CRUD, rendering, event delegation
│       ├── sounds.js       # Web Audio API sound system
│       ├── themes.js       # 9 gradient themes + modal
│       ├── firebase.js     # Firebase Firestore integration
│       ├── progress.js     # Progress ring updates
│       ├── time.js         # Clock, date, greeting
│       ├── quotes.js       # Motivational quotes
│       └── utils.js        # Shared utilities + constants
└── assets/
    ├── icon.svg
    ├── icon.png
    └── icon.icns           # macOS app icon (generated)
```

## Architecture

- **Vanilla JS** with ES modules — no framework overhead
- **Vite** for bundling, HMR, and environment variable support
- **Pub/sub store** replaces global variables — modules subscribe to state changes
- **Event delegation** on the task list — single listener handles all task/subtask interactions
- **Firebase credentials** loaded from `.env` via `import.meta.env` — never in source code

## License

MIT
