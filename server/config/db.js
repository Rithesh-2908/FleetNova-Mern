
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let isMongooseConnected = false;

const DATA_FILE = path.join(
  process.cwd(),
  'server',
  'data',
  'fleetnova_store.json'
);

// Ensure local data directory exists
const dataDir = path.dirname(DATA_FILE);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Local JSON fallback store
let localStore = {
  users: [],
  vehicles: [],
  drivers: [],
  trips: [],
  fuels: [],
  maintenances: [],
  expenses: [],
  notifications: [],
};

// Load saved local data
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    localStore = JSON.parse(raw);
  } catch (error) {
    console.warn(
      '[DATABASE] Could not read local data store:',
      error.message
    );
  }
}

export function saveLocalStore() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(localStore, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error(
      '[DATABASE] Failed to save local store:',
      error.message
    );
  }
}

export function getLocalStore() {
  return localStore;
}

// Fail quickly if Mongoose is not connected
mongoose.set('bufferCommands', false);

// Track real MongoDB connection changes
mongoose.connection.on('connected', () => {
  isMongooseConnected = true;
  console.log('[DATABASE] MongoDB Status: CONNECTED');
});

mongoose.connection.on('disconnected', () => {
  isMongooseConnected = false;
  console.warn('[DATABASE] MongoDB Status: DISCONNECTED');
});

mongoose.connection.on('error', (error) => {
  isMongooseConnected = false;
  console.error('[DATABASE] MongoDB connection error:', error.message);
});

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI?.trim();

  if (
    !mongoURI ||
    !mongoURI.startsWith('mongodb') ||
    mongoURI.includes('YOUR_MONGODB_URI')
  ) {
    isMongooseConnected = false;

    console.warn('[DATABASE] MongoDB Status: NOT CONFIGURED');
    console.log('[DATABASE] Storage mode: Local JSON fallback');
    console.log(`[DATABASE] Local data file: ${DATA_FILE}`);

    return null;
  }

  try {
    console.log('[DATABASE] Connecting to MongoDB...');

    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    isMongooseConnected =
      mongoose.connection.readyState === 1;

    console.log(
      `[DATABASE] Connected host: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    isMongooseConnected = false;

    console.error('[DATABASE] MongoDB connection failed.');
    console.error('[DATABASE] Reason:', error.message);
    console.warn('[DATABASE] Storage mode: Local JSON fallback');

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore cleanup errors
    }

    return null;
  }
}

export function isDBConnected() {
  return (
    isMongooseConnected &&
    mongoose.connection.readyState === 1
  );
}
