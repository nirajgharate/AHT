import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });
config();

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
url.searchParams.set("key", process.env.GEMINI_API_KEY);

const response = await fetch(url);
const data = await response.json();

if (!response.ok) {
  console.error(data.error?.message || "Unable to list Gemini models");
  process.exit(1);
}

const usefulMethods = new Set(["generateContent", "embedContent", "batchEmbedContents"]);
const models = data.models
  .filter((model) =>
    model.supportedGenerationMethods?.some((method) => usefulMethods.has(method)),
  )
  .map((model) => ({
    name: model.name.replace("models/", ""),
    displayName: model.displayName,
    methods: model.supportedGenerationMethods.join(", "),
  }));

console.table(models);
