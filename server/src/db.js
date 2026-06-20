import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDatabase() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(process.env.MONGODB_DB || "aht_summarizer");
  await db.collection("documents").createIndex({ createdAt: -1 });
  await db.collection("chunks").createIndex({ documentId: 1 });

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database is not connected");
  }

  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
