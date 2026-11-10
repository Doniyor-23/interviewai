import mongoose from 'mongoose';
import { env } from './env.js';

export const DB_NAME = 'interviewai';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  mongoose.connection.on('error', (e) => console.error('[db] error:', e.message));
  try {
    // dbName guarantees the "interviewai" database even if the URI has no path.
    await mongoose.connect(env.mongoUri, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
    console.log(`[db] Connected to MongoDB (database: ${DB_NAME})`);
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    console.error('[db] Check MONGODB_URI, your Atlas IP allow-list (Network Access) and DB user credentials.');
    throw err;
  }
}
