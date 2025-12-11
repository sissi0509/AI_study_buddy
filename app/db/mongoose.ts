import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_CONNECTION_STRING as string;

if (!MONGODB_URI) {
  throw new Error("DATABASE_CONNECTION_STRING is missing in .env file");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDb() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
