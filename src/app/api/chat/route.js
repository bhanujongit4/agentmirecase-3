import { NextResponse } from "next/server";
import { filterProperties, getMergedProperties } from "@/lib/propertyData";

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

export async function POST(request) {
  try {
    const body = await request.json();

    const filters = {
      location: body.location?.trim() || "",
      maxBudget: toNumberOrUndefined(body.maxBudget),
      minBedrooms: toNumberOrUndefined(body.minBedrooms),
      minBathrooms: toNumberOrUndefined(body.minBathrooms),
      minSizeSqft: toNumberOrUndefined(body.minSizeSqft),
      amenities: parseAmenities(body.amenities),
    };

    const properties = await getMergedProperties();
    const matches = filterProperties(properties, filters);

    const summary =
      matches.length === 0
        ? "I could not find properties matching those preferences. Try widening your filters."
        : `I found ${matches.length} matching ${matches.length === 1 ? "property" : "properties"}.`;

    return NextResponse.json({
      message: summary,
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
