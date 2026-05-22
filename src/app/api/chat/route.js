import { NextResponse } from "next/server";
import { filterProperties, getMergedProperties } from "@/lib/propertyData";
import { callOllamaChat } from "@/lib/llm/ollama";

function toNumberOrUndefined(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseAmenities(input) {
  if (!input || typeof input !== "string") {
    return [];
  }

  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFilters(raw) {
  return {
    location: raw.location?.trim() || "",
    maxBudget: toNumberOrUndefined(raw.maxBudget),
    minBedrooms: toNumberOrUndefined(raw.minBedrooms),
    minBathrooms: toNumberOrUndefined(raw.minBathrooms),
    minSizeSqft: toNumberOrUndefined(raw.minSizeSqft),
    amenities: Array.isArray(raw.amenities)
      ? raw.amenities.map((a) => String(a).trim()).filter(Boolean)
      : parseAmenities(raw.amenities),
  };
}

function hasAnyFilter(filters) {
  return Boolean(
    filters.location ||
      filters.maxBudget ||
      filters.minBedrooms ||
      filters.minBathrooms ||
      filters.minSizeSqft ||
      (filters.amenities && filters.amenities.length),
  );
}

function levenshteinDistance(a, b) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[s.length][t.length];
}

const STATE_NAME_TO_CODE = {
  florida: "FL",
  california: "CA",
  texas: "TX",
  washington: "WA",
  illinois: "IL",
  massachusetts: "MA",
  "new york": "NY",
};



function mapLocationFromMessage(message, properties) {
  const messageLower = message.toLowerCase();
  const uniqueLocations = [...new Set(properties.map((p) => p.location))];

  // Match explicit state names (e.g., "Florida") to dataset entries like "Miami, FL".
  for (const [stateName, stateCode] of Object.entries(STATE_NAME_TO_CODE)) {
    if (messageLower.includes(stateName)) {
      const byState = uniqueLocations.find((location) =>
        location.toLowerCase().endsWith(`, ${stateCode.toLowerCase()}`),
      );
      if (byState) {
        return byState;
      }
    }
  }

  for (const location of uniqueLocations) {
    const cityPart = location.split(",")[0].trim().toLowerCase();
    if (messageLower.includes(cityPart)) {
      return location;
    }
  }

  const words = messageLower.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  let bestMatch = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const location of uniqueLocations) {
    const cityPart = location.split(",")[0].trim().toLowerCase();
    for (let i = 0; i < words.length; i += 1) {
      const one = words[i];
      const two = `${words[i] || ""} ${words[i + 1] || ""}`.trim();

      const oneDist = levenshteinDistance(one, cityPart);
      if (oneDist < bestScore) {
        bestScore = oneDist;
        bestMatch = location;
      }

      if (two) {
        const twoDist = levenshteinDistance(two, cityPart);
        if (twoDist < bestScore) {
          bestScore = twoDist;
          bestMatch = location;
        }
      }
    }
  }

  return bestScore <= 3 ? bestMatch : "";
}

function extractBudgetFromMessage(message) {
  const lower = message.toLowerCase();

  const millionWordMatch = lower.match(/(\d+(?:\.\d+)?)\s*(million|mn)\b/);
  if (millionWordMatch) {
    return Math.round(Number(millionWordMatch[1]) * 1000000);
  }

  const thousandWordMatch = lower.match(/(\d+(?:\.\d+)?)\s*(thousand)\b/);
  if (thousandWordMatch) {
    return Math.round(Number(thousandWordMatch[1]) * 1000);
  }

  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    return Math.round(Number(kMatch[1]) * 1000);
  }

  const mMatch = lower.match(/(\d+(?:\.\d+)?)\s*m\b/);
  if (mMatch) {
    return Math.round(Number(mMatch[1]) * 1000000);
  }

  const underUnitMatch = lower.match(
    /(?:under|below|max(?:imum)?|budget)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k|m|million|thousand)\b/,
  );
  if (underUnitMatch) {
    const value = Number(underUnitMatch[1]);
    const unit = underUnitMatch[2];

    if (unit === "k") return Math.round(value * 1000);
    if (unit === "m" || unit === "million") return Math.round(value * 1000000);
    if (unit === "thousand") return Math.round(value * 1000);
  }

  const underMatch = lower.match(/(?:under|below|max(?:imum)?|budget)\s*\$?\s*(\d[\d,]*)/);
  if (underMatch) {
    return Number(underMatch[1].replace(/,/g, ""));
  }

  const dollarsMatch = lower.match(/\$\s*(\d[\d,]*)/);
  if (dollarsMatch) {
    return Number(dollarsMatch[1].replace(/,/g, ""));
  }

  return undefined;
}

function extractBedroomsFromMessage(message) {
  const lower = message.toLowerCase();
  const match = lower.match(/(?:at\s*least\s*)?(\d+)\s*(?:bed|beds|bedroom|bedrooms|bhk)/);
  return match ? Number(match[1]) : undefined;
}

function deterministicExtractFromMessage(message, properties) {
  const location = mapLocationFromMessage(message, properties);
  const maxBudget = extractBudgetFromMessage(message);
  const minBedrooms = extractBedroomsFromMessage(message);

  return normalizeFilters({
    location,
    maxBudget,
    minBedrooms,
    amenities: [],
  });
}

function buildNoResultsReason(filters, properties) {
  if (filters.maxBudget) {
    const minPrice = Math.min(...properties.map((p) => p.price));
    if (filters.maxBudget < minPrice) {
      return `Your max budget is below the lowest listed property price (${minPrice}).`;
    }
  }

  if (filters.location) {
    const hasLocation = properties.some((p) =>
      p.location.toLowerCase().includes(filters.location.toLowerCase()),
    );
    if (!hasLocation) {
      return "The requested location does not appear in the available dataset.";
    }
  }

  return "The combination of filters is likely too strict for the available listings.";
}

async function extractFiltersFromMessage(message, properties) {
  const locations = [...new Set(properties.map((p) => p.location))];
  const amenities = [...new Set(properties.flatMap((p) => p.amenities))];

  const prompt = `You extract real-estate search filters from user text.\nReturn valid JSON only with keys: location, maxBudget, minBedrooms, minBathrooms, minSizeSqft, amenities, correctedText.\n- Use null when missing.\n- amenities must be an array of strings.\n- Fix spelling in correctedText and map location to nearest known value if needed.\nKnown locations: ${locations.join(" | ")}\nKnown amenities: ${amenities.join(" | ")}\nUser text: ${message}`;

  const raw = await callOllamaChat([
    { role: "system", content: "You are a strict JSON extraction engine." },
    { role: "user", content: prompt },
  ]);



  const cleaned = raw.replace(/```json|```/g, "").trim();
  
  return JSON.parse(cleaned);
}

async function llmNoResultsReason(message, filters) {
  const prompt = `User request: ${message}\nParsed filters: ${JSON.stringify(filters)}\nExplain in 1-2 short sentences why no properties were found and suggest one practical relaxation. Keep it conversational and not overly rigid.`;

  return callOllamaChat([
    { role: "system", content: "You are a helpful real-estate assistant." },
    { role: "user", content: prompt },
  ]);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const properties = await getMergedProperties();

    let filters;
    let correctedText = "";
    

    if (body.message && String(body.message).trim()) {
      const messageText = String(body.message).trim();
      const deterministic = deterministicExtractFromMessage(messageText, properties);

      try {
        const extracted = await extractFiltersFromMessage(messageText, properties);
        const llmFilters = normalizeFilters(extracted);
        console.log(llmFilters);
        correctedText = extracted.correctedText || "";

        filters = hasAnyFilter(llmFilters) ? llmFilters : deterministic;
      } catch (err) {
  console.error("LLM extraction failed:", err);
  filters = deterministic;
}

      if (!hasAnyFilter(filters)) {
        const broadMatches = properties.slice(0, 5);
        return NextResponse.json({
          message:
            "I could not clearly extract filters, so I am showing a few options. Try adding location, budget, or bedrooms for better results.",
          correctedText,
          filters,
          results: broadMatches,
        });
      }
    } else {
      filters = normalizeFilters(body);
    }

    const matches = filterProperties(properties, filters);

    if (matches.length === 0) {
      let reason = "";
      if (body.message) {
        try {
          reason = await llmNoResultsReason(String(body.message), filters);
        } catch {
          reason = buildNoResultsReason(filters, properties);
        }
      } else {
        reason = buildNoResultsReason(filters, properties);
      }

      return NextResponse.json({
        message: `I could not find properties matching those preferences. ${reason}`,
        correctedText,
        filters,
        results: [],
      });
    }

    return NextResponse.json({
      message: `I found ${matches.length} matching ${matches.length === 1 ? "property" : "properties"}.`,
      correctedText,
      filters,
      results: matches,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process the chat request.", details: error.message },
      { status: 500 },
    );
  }
}
