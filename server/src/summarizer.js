import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ObjectId } from "mongodb";
import { getDatabase } from "./db.js";
import { cosineSimilarity } from "./vector.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 180,
});

const invalidModelHints = new Map([
  ["gemini-3.0-flash", "gemini-3.5-flash"],
]);

function getGeminiModelName() {
  const configuredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const suggestedModel = invalidModelHints.get(configuredModel);

  if (suggestedModel) {
    throw new Error(
      `${configuredModel} is not a valid Gemini API model name. Use ${suggestedModel}, or run npm run models --prefix server to list models available for your API key.`,
    );
  }

  return configuredModel;
}

function getModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: getGeminiModelName(),
    temperature: 0.2,
  });
}

function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  });
}

function buildPrompt({ mode, question, context, text }) {
  const style =
    mode === "bullets"
      ? "Return crisp bullet points with the most important facts."
      : mode === "brief"
        ? "Return a short executive summary in one compact paragraph."
        : "Return a structured summary with headings, key points, and action items if present.";

  const task = question?.trim()
    ? `Answer this user focus while summarizing: ${question.trim()}`
    : "Summarize the document faithfully.";

  return [
    {
      role: "system",
      content:
        "You are a careful text summarizer. Use only the supplied text and retrieved context. Do not invent facts.",
    },
    {
      role: "user",
      content: `${task}\n\nStyle: ${style}\n\nRetrieved context:\n${context}\n\nFull text:\n${text}`,
    },
  ];
}

export async function summarizeAndStore({ title, text, question, mode }) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();

  const cleanTitle = title?.trim() || "Untitled text";
  const cleanText = text.trim();
  const chunks = await splitter.splitText(cleanText);
  const vectors = await embeddings.embedDocuments(chunks);

  const documentResult = await db.collection("documents").insertOne({
    title: cleanTitle,
    text: cleanText,
    question: question?.trim() || "",
    mode,
    createdAt: new Date(),
  });

  const chunkDocs = chunks.map((chunk, index) => ({
    documentId: documentResult.insertedId,
    index,
    text: chunk,
    embedding: vectors[index],
    createdAt: new Date(),
  }));

  if (chunkDocs.length) {
    await db.collection("chunks").insertMany(chunkDocs);
  }

  const context = chunks.slice(0, 5).join("\n\n---\n\n");
  const response = await model.invoke(
    buildPrompt({ mode, question, context, text: cleanText.slice(0, 12000) }),
  );

  const summary = response.content.toString();

  await db.collection("documents").updateOne(
    { _id: documentResult.insertedId },
    {
      $set: {
        summary,
        chunkCount: chunkDocs.length,
        updatedAt: new Date(),
      },
    },
  );

  return {
    id: documentResult.insertedId.toString(),
    title: cleanTitle,
    summary,
    chunkCount: chunkDocs.length,
  };
}

export async function askDocument({ documentId, question }) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();
  const _id = new ObjectId(documentId);

  const document = await db.collection("documents").findOne({ _id });
  if (!document) {
    const error = new Error("Document not found");
    error.status = 404;
    throw error;
  }

  const queryEmbedding = await embeddings.embedQuery(question);
  const chunks = await db.collection("chunks").find({ documentId: _id }).toArray();
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const context = ranked.map((chunk) => chunk.text).join("\n\n---\n\n");
  const response = await model.invoke([
    {
      role: "system",
      content:
        "Answer from the retrieved context. If the context is insufficient, say what is missing.",
    },
    {
      role: "user",
      content: `Question: ${question}\n\nRetrieved context:\n${context}`,
    },
  ]);

  return {
    answer: response.content.toString(),
    sources: ranked.map((chunk) => ({
      index: chunk.index,
      score: Number(chunk.score.toFixed(4)),
      preview: chunk.text.slice(0, 180),
    })),
  };
}

export async function listDocuments() {
  const db = getDatabase();
  const documents = await db
    .collection("documents")
    .find(
      {},
      {
        projection: {
          text: 0,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return documents.map((document) => ({
    ...document,
    _id: document._id.toString(),
  }));
}
