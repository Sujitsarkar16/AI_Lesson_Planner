import { MongoClient, ObjectId } from 'mongodb';

let mongoClientPromise: Promise<MongoClient> | undefined;

export const getMongoClient = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');
  mongoClientPromise ??= new MongoClient(uri).connect();
  return mongoClientPromise;
};

export const getDatabase = async () => {
  const databaseName = process.env.MONGODB_DB_NAME || 'ai_lesson_planner';
  return (await getMongoClient()).db(databaseName);
};

export const objectId = (value: string) => ObjectId.isValid(value) ? new ObjectId(value) : null;
export const id = (value: ObjectId) => value.toHexString();
