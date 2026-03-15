import { store } from './store.js';

let db = null;
let firebaseEnabled = false;
let unsubscribeSnapshot = null;
let syncId = null;

export function initFirebase() {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;

    syncId = import.meta.env.VITE_SYNC_ID;

    if (!apiKey) {
      console.log('Firebase not configured - using local storage only');
      store.setState({ syncStatus: { status: 'offline', text: 'Local Only' } });
      return;
    }

    // firebase is loaded via CDN <script> tags and available as a global
    firebase.initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });
    db = firebase.firestore();
    firebaseEnabled = true;

    console.log('Firebase connected, sync ID:', syncId);
    store.setState({ syncStatus: { status: 'synced', text: 'Synced' } });

    listenToTasks();
  } catch (error) {
    console.error('Firebase init error:', error);
    store.setState({ syncStatus: { status: 'offline', text: 'Local Only' } });
  }
}

export function destroyFirebase() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}

function listenToTasks() {
  if (!db || !syncId) return;

  unsubscribeSnapshot = db
    .collection('users')
    .doc(syncId)
    .collection('tasks')
    .onSnapshot(
      (snapshot) => {
        store.setState({ syncStatus: { status: 'synced', text: 'Synced' } });

        const firebaseTasks = [];
        snapshot.forEach((doc) => {
          firebaseTasks.push({ ...doc.data(), id: doc.id });
        });

        // Also save to localStorage as backup
        localStorage.setItem('today_tasks', JSON.stringify(firebaseTasks));

        store.setState({ tasks: firebaseTasks });
      },
      (error) => {
        console.error('Firestore listen error:', error);
        store.setState({ syncStatus: { status: 'error', text: 'Sync Error' } });
      },
    );
}

export async function saveTaskToFirebase(task) {
  if (!firebaseEnabled || !db || !syncId) return;

  store.setState({ syncStatus: { status: 'syncing', text: 'Syncing...' } });

  try {
    await db.collection('users').doc(syncId).collection('tasks').doc(String(task.id)).set(task);
  } catch (error) {
    console.error('Error saving task:', error);
    store.setState({ syncStatus: { status: 'error', text: 'Sync Error' } });
  }
}

export async function deleteTaskFromFirebase(taskId) {
  if (!firebaseEnabled || !db || !syncId) return;

  store.setState({ syncStatus: { status: 'syncing', text: 'Syncing...' } });

  try {
    await db.collection('users').doc(syncId).collection('tasks').doc(String(taskId)).delete();
  } catch (error) {
    console.error('Error deleting task:', error);
    store.setState({ syncStatus: { status: 'error', text: 'Sync Error' } });
  }
}

export async function updateTaskInFirebase(task) {
  if (!firebaseEnabled || !db || !syncId) return;

  store.setState({ syncStatus: { status: 'syncing', text: 'Syncing...' } });

  try {
    await db.collection('users').doc(syncId).collection('tasks').doc(String(task.id)).update(task);
  } catch (error) {
    console.error('Error updating task:', error);
    store.setState({ syncStatus: { status: 'error', text: 'Sync Error' } });
  }
}
