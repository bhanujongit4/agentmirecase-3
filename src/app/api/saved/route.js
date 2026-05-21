import path from "node:path";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getMongoClientPromise } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/auth/password";

const DB_NAME = process.env.MONGODB_DB_NAME || "agent_mira";
const COLLECTION_NAME = "saved_properties";
const LOCAL_STORE_PATH = path.join(process.cwd(), "data", "saved_properties.local.json");

function parseEmailFromUrl(request) {
  const { searchParams } = new URL(request.url);
  return normalizeEmail(searchParams.get("email"));
}

function buildProperty(payload) {
  return {
    id: payload.id,
    title: payload.title,
    price: payload.price,
    location: payload.location,
    bedrooms: payload.bedrooms,
    bathrooms: payload.bathrooms,
    sizeSqft: payload.sizeSqft,
    amenities: payload.amenities || [],
    imageUrl: payload.imageUrl || "",
    userEmail: normalizeEmail(payload.userEmail),
    createdAt: new Date().toISOString(),
  };
}

async function ensureLocalStore() {
  try {
    await fs.access(LOCAL_STORE_PATH);
  } catch {
    await fs.writeFile(LOCAL_STORE_PATH, "[]", "utf-8");
  }
}

async function readLocalSaved() {
  await ensureLocalStore();
  const raw = await fs.readFile(LOCAL_STORE_PATH, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalSaved(properties) {
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(properties, null, 2), "utf-8");
}

function looksLikeConnectivityError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("econnrefused") ||
    message.includes("querysrv") ||
    message.includes("enotfound") ||
    message.includes("server selection") ||
    message.includes("timed out")
  );
}

async function getFromMongo(userEmail) {
  const client = await getMongoClientPromise();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  return collection.find({ userEmail }).sort({ createdAt: -1 }).limit(100).toArray();
}

async function saveToMongo(property) {
  const client = await getMongoClientPromise();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

  await collection.updateOne(
    { userEmail: property.userEmail, id: property.id },
    { $set: property },
    { upsert: true },
  );
}

async function deleteFromMongo(userEmail, propertyId) {
  const client = await getMongoClientPromise();
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  const result = await collection.deleteOne({ userEmail, id: propertyId });
  return result.deletedCount > 0;
}

async function getFromLocalFallback(userEmail) {
  const saved = await readLocalSaved();
  return saved
    .filter((item) => normalizeEmail(item.userEmail) === userEmail)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function saveToLocalFallback(property) {
  const saved = await readLocalSaved();
  const index = saved.findIndex(
    (item) => normalizeEmail(item.userEmail) === property.userEmail && item.id === property.id,
  );

  if (index >= 0) {
    saved[index] = { ...saved[index], ...property, createdAt: new Date().toISOString() };
  } else {
    saved.push(property);
  }

  await writeLocalSaved(saved);
}

async function deleteFromLocalFallback(userEmail, propertyId) {
  const saved = await readLocalSaved();
  const updated = saved.filter(
    (item) => !(normalizeEmail(item.userEmail) === userEmail && item.id === propertyId),
  );
  const deleted = updated.length !== saved.length;
  if (deleted) {
    await writeLocalSaved(updated);
  }
  return deleted;
}

export async function GET(request) {
  const userEmail = parseEmailFromUrl(request);
  if (!userEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const saved = await getFromMongo(userEmail);
    return NextResponse.json({ saved, storage: "mongodb" });
  } catch (error) {
    if (!process.env.MONGODB_URI || looksLikeConnectivityError(error)) {
      const saved = await getFromLocalFallback(userEmail);
      return NextResponse.json({
        saved,
        storage: "local-fallback",
        notice: "MongoDB unavailable. Showing locally saved properties.",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch saved properties.", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.id || !body?.title) {
      return NextResponse.json({ error: "Property id and title are required." }, { status: 400 });
    }

    const propertyToSave = buildProperty(body);
    if (!propertyToSave.userEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    try {
      await saveToMongo(propertyToSave);
      return NextResponse.json({ message: "Property saved successfully.", storage: "mongodb" });
    } catch (error) {
      if (!process.env.MONGODB_URI || looksLikeConnectivityError(error)) {
        await saveToLocalFallback(propertyToSave);
        return NextResponse.json({
          message: "MongoDB unavailable. Property saved locally.",
          storage: "local-fallback",
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save property.", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const userEmail = normalizeEmail(body?.userEmail);
    const propertyId = Number(body?.id);

    if (!userEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!propertyId) {
      return NextResponse.json({ error: "Property id is required." }, { status: 400 });
    }

    try {
      const deleted = await deleteFromMongo(userEmail, propertyId);
      return NextResponse.json({
        message: deleted ? "Property deleted." : "Property not found for this user.",
        storage: "mongodb",
      });
    } catch (error) {
      if (!process.env.MONGODB_URI || looksLikeConnectivityError(error)) {
        const deleted = await deleteFromLocalFallback(userEmail, propertyId);
        return NextResponse.json({
          message: deleted
            ? "Property deleted from local fallback storage."
            : "Property not found for this user.",
          storage: "local-fallback",
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete property.", details: error.message },
      { status: 500 },
    );
  }
}
