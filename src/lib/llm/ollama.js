const DEFAULT_BASE_URL = "https://ollama.com/api";
const DEFAULT_MODEL = "gpt-oss:20b";

function getConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
    apiKey: process.env.OLLAMA_API_KEY || "",
    model: process.env.OLLAMA_CHAT_MODEL || DEFAULT_MODEL,
  };
}

export async function callOllamaChat(messages, { temperature = 0.1, maxTokens = 500 } = {}) {
  const { baseUrl, apiKey, model } = getConfig();

  if (!apiKey || !baseUrl || !model) {
    throw new Error("Ollama configuration is missing. Set OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || "Ollama request failed.");
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Ollama returned an empty response.");
  }

  return text;
}
