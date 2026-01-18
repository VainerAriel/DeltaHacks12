import { MongoClient, Db, ServerApiVersion } from 'mongodb';

// MongoDB connection options
// For MongoDB Atlas, we can use ServerApiVersion for better compatibility
const getMongoOptions = () => {
  const uri = process.env.MONGODB_URI || '';
  
  const baseOptions = {
    // Connection pool options
    maxPoolSize: 10,
    minPoolSize: 1,
    // Timeout options (in milliseconds)
    connectTimeoutMS: 30000, // 30 seconds
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    // Retry options
    retryWrites: true,
    retryReads: true,
  };
  
  // If using MongoDB Atlas (mongodb+srv://), use ServerApiVersion
  if (uri.startsWith('mongodb+srv://')) {
    return {
      ...baseOptions,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };
  }
  
  // For local MongoDB, use base options
  return baseOptions;
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Please add your MongoDB connection string to .env.local\n' +
      'Example: MONGODB_URI=mongodb://localhost:27017/esl-coaching'
    );
  }

  const uri: string = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const options = getMongoOptions();
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      const options = getMongoOptions();
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = getClientPromise();
  }
  const client = await clientPromise;
  return client.db('esl-coaching');
}

// Database collections
export const collections = {
  users: 'users',
  recordings: 'recordings',
  transcriptions: 'transcriptions',
  feedbackReports: 'feedbackReports',
  referenceDocuments: 'referenceDocuments',
} as const;
