import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME || 'ai_lesson_planner';
if (!uri) throw new Error('MONGODB_URI is required.');

const client = new MongoClient(uri);
try {
  const db = client.db(databaseName);
  await Promise.all([
    db.collection('users').createIndex({ auth0Id: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('documents').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('curriculum_standards').createIndex({ board: 1, grade: 1, subject: 1, standard_code: 1 }, { unique: true }),
    db.collection('coverage_tracking').createIndex({ userId: 1, board: 1, grade: 1, subject: 1, standardId: 1 }, { unique: true }),
    db.collection('concept_map_nodes').createIndex({ userId: 1, mapId: 1, node_key: 1 }, { unique: true }),
    db.collection('concept_map_edges').createIndex({ userId: 1, mapId: 1, edge_key: 1 }, { unique: true }),
    db.collection('students').createIndex({ accessCode: 1 }, { unique: true }),
    db.collection('assignments').createIndex({ studentId: 1, dueDate: 1 }),
    db.collection('submissions').createIndex({ assignmentId: 1, studentId: 1 }, { unique: true })
  ]);
  console.log(`MongoDB indexes ready in ${databaseName}.`);
} finally {
  await client.close();
}
