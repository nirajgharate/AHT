import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ObjectId } from "mongodb";
import { getDatabase } from "./config/db.js";
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

export async function summarizeAndStore({ title, text, question, mode }, userId) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();

  const cleanTitle = title?.trim() || "Untitled text";
  const cleanText = text.trim();
  const chunks = await splitter.splitText(cleanText);
  const vectors = await embeddings.embedDocuments(chunks);

  const documentResult = await db.collection("documents").insertOne({
    userId,
    title: cleanTitle,
    text: cleanText,
    question: question?.trim() || "",
    mode,
    createdAt: new Date(),
  });

  const chunkDocs = chunks.map((chunk, index) => ({
    documentId: documentResult.insertedId,
    userId,
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
    { _id: documentResult.insertedId, userId },
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

export async function askDocument({ documentId, question }, userId) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();

  let document = null;
  if (documentId && documentId !== "global") {
    const _id = new ObjectId(documentId);
    document = await db.collection("documents").findOne({ _id, userId });
    if (!document) {
      const error = new Error("Document not found");
      error.status = 404;
      throw error;
    }
  }

  const queryEmbedding = await embeddings.embedQuery(question);
  let ranked = [];
  let atlasSearchSucceeded = false;

  // 1. Attempt Atlas Vector Search
  try {
    const searchStage = {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: 5,
        filter: {
          userId: userId,
        },
      },
    };

    if (documentId && documentId !== "global") {
      searchStage.$vectorSearch.filter.documentId = new ObjectId(documentId);
    }

    const pipeline = [
      searchStage,
      {
        $lookup: {
          from: "documents",
          localField: "documentId",
          foreignField: "_id",
          as: "doc",
        },
      },
      {
        $unwind: "$doc",
      },
      {
        $project: {
          text: 1,
          index: 1,
          documentId: 1,
          documentTitle: "$doc.title",
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    ranked = await db.collection("chunks").aggregate(pipeline).toArray();
    atlasSearchSucceeded = true;
    console.log(`RAG: Atlas Vector Search succeeded. Retrieved ${ranked.length} chunks.`);
  } catch (error) {
    console.warn("RAG: Atlas Vector Search failed, using in-memory fallback:", error.message);
  }

  // 2. Fallback to in-memory cosine similarity ranking
  if (!atlasSearchSucceeded) {
    const queryFilter = { userId };
    if (documentId && documentId !== "global") {
      queryFilter.documentId = new ObjectId(documentId);
    }

    const chunks = await db.collection("chunks").find(queryFilter).toArray();
    const matched = chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const uniqueDocIds = [...new Set(matched.map((chunk) => chunk.documentId.toString()))];
    const docs = await db
      .collection("documents")
      .find({ _id: { $in: uniqueDocIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const docMap = new Map(docs.map((doc) => [doc._id.toString(), doc.title]));

    ranked = matched.map((chunk) => ({
      text: chunk.text,
      index: chunk.index,
      documentId: chunk.documentId,
      documentTitle: docMap.get(chunk.documentId.toString()) || "Untitled document",
      score: chunk.score,
    }));
    console.log(`RAG: In-memory cosine similarity fallback retrieved ${ranked.length} chunks.`);
  }

  // Generate response
  const context = ranked
    .map((chunk) => `[Source Document: ${chunk.documentTitle}] ${chunk.text}`)
    .join("\n\n---\n\n");

  const messages = [
    {
      role: "system",
      content:
        "Answer the question using ONLY the retrieved context. If the context is insufficient, state what is missing. Mention the source documents when referencing facts.",
    },
  ];

  if (document && document.chatHistory) {
    for (const msg of document.chatHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: `Retrieved context:\n${context}\n\nQuestion: ${question}`,
  });

  const response = await model.invoke(messages);
  const answer = response.content.toString();

  // If a specific document is active, save message pair to history
  if (documentId && documentId !== "global") {
    const newUserMsg = { role: "user", content: question, createdAt: new Date() };
    const newAssistantMsg = { role: "assistant", content: answer, createdAt: new Date() };

    await db.collection("documents").updateOne(
      { _id: new ObjectId(documentId), userId },
      {
        $push: {
          chatHistory: { $each: [newUserMsg, newAssistantMsg] },
        },
      }
    );
  }

  return {
    answer,
    sources: ranked.map((chunk) => ({
      index: chunk.index,
      documentTitle: chunk.documentTitle,
      score: Number(chunk.score.toFixed(4)),
      preview: chunk.text.slice(0, 180),
    })),
    chatHistory: documentId && documentId !== "global"
      ? [...(document.chatHistory || []), { role: "user", content: question }, { role: "assistant", content: answer }]
      : [],
  };
}

export async function listDocuments(userId) {
  const db = getDatabase();
  const documents = await db
    .collection("documents")
    .find(
      { userId },
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

export async function deleteDocument(id, userId) {
  const db = getDatabase();
  const _id = new ObjectId(id);

  // Verify document ownership
  const document = await db.collection("documents").findOne({ _id, userId });
  if (!document) {
    const error = new Error("Document not found or unauthorized");
    error.status = 404;
    throw error;
  }

  // Delete matching vector chunks
  await db.collection("chunks").deleteMany({ documentId: _id, userId });

  // Delete main document
  const result = await db.collection("documents").deleteOne({ _id, userId });

  if (result.deletedCount === 0) {
    const error = new Error("Document not found");
    error.status = 404;
    throw error;
  }

  return { ok: true };
}

export async function summarizeAndStoreStream({ title, text, question, mode }, res, userId) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();

  const cleanTitle = title?.trim() || "Untitled text";
  const cleanText = text.trim();
  const chunks = await splitter.splitText(cleanText);
  const vectors = await embeddings.embedDocuments(chunks);

  const documentResult = await db.collection("documents").insertOne({
    userId,
    title: cleanTitle,
    text: cleanText,
    question: question?.trim() || "",
    mode,
    createdAt: new Date(),
  });

  const chunkDocs = chunks.map((chunk, index) => ({
    documentId: documentResult.insertedId,
    userId,
    index,
    text: chunk,
    embedding: vectors[index],
    createdAt: new Date(),
  }));

  if (chunkDocs.length) {
    await db.collection("chunks").insertMany(chunkDocs);
  }

  // Send metadata event first
  res.write(`data: ${JSON.stringify({ id: documentResult.insertedId.toString(), title: cleanTitle, chunkCount: chunkDocs.length })}\n\n`);

  const context = chunks.slice(0, 5).join("\n\n---\n\n");
  const prompt = buildPrompt({ mode, question, context, text: cleanText.slice(0, 12000) });
  
  const stream = await model.stream(prompt);
  let summaryBuffer = "";

  for await (const chunk of stream) {
    const content = chunk.content.toString();
    summaryBuffer += content;
    res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
  }

  await db.collection("documents").updateOne(
    { _id: documentResult.insertedId, userId },
    {
      $set: {
        summary: summaryBuffer,
        chunkCount: chunkDocs.length,
        updatedAt: new Date(),
      },
    }
  );

  res.write("data: [DONE]\n\n");
  res.end();
}

export async function askDocumentStream({ documentId, question }, res, userId) {
  const db = getDatabase();
  const model = getModel();
  const embeddings = getEmbeddings();

  let document = null;
  if (documentId && documentId !== "global") {
    const _id = new ObjectId(documentId);
    document = await db.collection("documents").findOne({ _id, userId });
    if (!document) {
      const error = new Error("Document not found");
      error.status = 404;
      throw error;
    }
  }

  const queryEmbedding = await embeddings.embedQuery(question);
  let ranked = [];
  let atlasSearchSucceeded = false;

  // 1. Attempt Atlas Vector Search
  try {
    const searchStage = {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: 5,
        filter: {
          userId: userId,
        },
      },
    };

    if (documentId && documentId !== "global") {
      searchStage.$vectorSearch.filter.documentId = new ObjectId(documentId);
    }

    const pipeline = [
      searchStage,
      {
        $lookup: {
          from: "documents",
          localField: "documentId",
          foreignField: "_id",
          as: "doc",
        },
      },
      {
        $unwind: "$doc",
      },
      {
        $project: {
          text: 1,
          index: 1,
          documentId: 1,
          documentTitle: "$doc.title",
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    ranked = await db.collection("chunks").aggregate(pipeline).toArray();
    atlasSearchSucceeded = true;
    console.log(`RAG Stream: Atlas Vector Search succeeded. Retrieved ${ranked.length} chunks.`);
  } catch (error) {
    console.warn("RAG Stream: Atlas Vector Search failed, using in-memory fallback:", error.message);
  }

  // 2. Fallback to in-memory cosine similarity ranking
  if (!atlasSearchSucceeded) {
    const queryFilter = { userId };
    if (documentId && documentId !== "global") {
      queryFilter.documentId = new ObjectId(documentId);
    }

    const chunks = await db.collection("chunks").find(queryFilter).toArray();
    const matched = chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const uniqueDocIds = [...new Set(matched.map((chunk) => chunk.documentId.toString()))];
    const docs = await db
      .collection("documents")
      .find({ _id: { $in: uniqueDocIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const docMap = new Map(docs.map((doc) => [doc._id.toString(), doc.title]));

    ranked = matched.map((chunk) => ({
      text: chunk.text,
      index: chunk.index,
      documentId: chunk.documentId,
      documentTitle: docMap.get(chunk.documentId.toString()) || "Untitled document",
      score: chunk.score,
    }));
    console.log(`RAG Stream: In-memory cosine similarity fallback retrieved ${ranked.length} chunks.`);
  }

  // Send sources event first
  const sources = ranked.map((chunk) => ({
    index: chunk.index,
    documentTitle: chunk.documentTitle,
    score: Number(chunk.score.toFixed(4)),
    preview: chunk.text.slice(0, 180),
  }));
  res.write(`data: ${JSON.stringify({ sources })}\n\n`);

  // Generate response
  const context = ranked
    .map((chunk) => `[Source Document: ${chunk.documentTitle}] ${chunk.text}`)
    .join("\n\n---\n\n");

  const messages = [
    {
      role: "system",
      content:
        "Answer the question using ONLY the retrieved context. If the context is insufficient, state what is missing. Mention the source documents when referencing facts.",
    },
  ];

  if (document && document.chatHistory) {
    for (const msg of document.chatHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: `Retrieved context:\n${context}\n\nQuestion: ${question}`,
  });

  const stream = await model.stream(messages);
  let answerBuffer = "";

  for await (const chunk of stream) {
    const content = chunk.content.toString();
    answerBuffer += content;
    res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
  }

  let finalChatHistory = [];
  if (documentId && documentId !== "global") {
    const newUserMsg = { role: "user", content: question, createdAt: new Date() };
    const newAssistantMsg = { role: "assistant", content: answerBuffer, createdAt: new Date() };

    await db.collection("documents").updateOne(
      { _id: new ObjectId(documentId), userId },
      {
        $push: {
          chatHistory: { $each: [newUserMsg, newAssistantMsg] },
        },
      }
    );

    finalChatHistory = [...(document.chatHistory || []), newUserMsg, newAssistantMsg];
    res.write(`data: ${JSON.stringify({ chatHistory: finalChatHistory })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}
