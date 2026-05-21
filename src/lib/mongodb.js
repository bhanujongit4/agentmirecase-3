import { MongoClient } from "mongodb";

const options = {};
let client;
let clientPromise;

export function getMongoClientPromise() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please set MONGODB_URI in your environment.");
  }

  if (!clientPromise) {
    if (process.env.NODE_ENV === "development") {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }

  return clientPromise;
}
