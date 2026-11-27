import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/truyen_vui";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
  uri: null,
};

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

export function getMongoUri(): string {
  return process.env.MONGODB_URI?.trim() || DEFAULT_URI;
}

export async function connectDB(): Promise<typeof mongoose> {
  const currentUri = getMongoUri();

  if (
    cached.conn &&
    cached.uri === currentUri &&
    mongoose.connection.readyState === 1
  ) {
    return cached.conn;
  }

  if (!cached.promise || cached.uri !== currentUri) {
    cached.uri = currentUri;
    cached.promise = mongoose
      .connect(currentUri, {
        bufferCommands: false,
        maxPoolSize: 12,
        minPoolSize: 2,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 6000,
        socketTimeoutMS: 30000,
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function checkDBHealth(): Promise<{
  connected: boolean;
  uriMasked: string;
  error?: string;
}> {
  const uri = getMongoUri();
  const uriMasked = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");

  if (
    cached.conn &&
    cached.uri === uri &&
    mongoose.connection.readyState === 1
  ) {
    return { connected: true, uriMasked };
  }

  try {
    await connectDB();
    return { connected: true, uriMasked };
  } catch (err) {
    return {
      connected: false,
      uriMasked,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
