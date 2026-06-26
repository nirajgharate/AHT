import { MongoClient } from "mongodb";
import { MONGODB_URI, MONGODB_DB } from "./env.js";

let client;
let db;

export async function connectDatabase() {
  if (db) return db;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();

  db = client.db(MONGODB_DB);
  await db.collection("documents").createIndex({ createdAt: -1 });
  await db.collection("chunks").createIndex({ documentId: 1 });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  try {
    const indexes = await db.collection("chunks").listSearchIndexes().toArray();
    const hasVectorIndex = indexes.some((idx) => idx.name === "vector_index");
    if (!hasVectorIndex) {
      await db.collection("chunks").createSearchIndex({
        name: "vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 768,
              similarity: "cosine",
            },
            {
              type: "filter",
              path: "documentId",
            },
            {
              type: "filter",
              path: "userId",
            },
          ],
        },
      });
      console.log("MongoDB Atlas vector search index ('vector_index') creation requested.");
    }
  } catch (error) {
    console.warn(
      "Atlas Search Index auto-creation skipped or unsupported. This is expected if you are running a local database or your user has restricted permissions. Details:",
      error.message
    );
  }

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
