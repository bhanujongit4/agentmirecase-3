import { NextResponse } from "next/server";
import { getMongoClientPromise } from "@/lib/mongodb";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";

const DB_NAME = process.env.MONGODB_DB_NAME || "agent_mira";
const USERS_COLLECTION = "users";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const client = await getMongoClientPromise();
    const collection = client.db(DB_NAME).collection(USERS_COLLECTION);

    await collection.createIndex({ email: 1 }, { unique: true });

    const existing = await collection.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    await collection.insertOne({
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "Account created.", email });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to register user.", details: error.message },
      { status: 500 },
    );
  }
}
