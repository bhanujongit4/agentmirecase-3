import { NextResponse } from "next/server";
import { getMongoClientPromise } from "@/lib/mongodb";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";

const DB_NAME = process.env.MONGODB_DB_NAME || "agentmira";
const USERS_COLLECTION = "users";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const client = await getMongoClientPromise();
    const collection = client.db(DB_NAME).collection(USERS_COLLECTION);

    const user = await collection.findOne({ email });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    return NextResponse.json({ message: "Login successful.", email });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to login.", details: error.message },
      { status: 500 },
    );
  }
}
