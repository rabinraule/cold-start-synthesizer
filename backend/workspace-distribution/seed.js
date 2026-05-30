/**
 * Automated Mock Data Seeder for MongoDB
 * Run using: node seed.js
 */
const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/dev_database';
const mockUsers = [
  { name: "John Doe", email: "john@example.com", role: "admin", createdAt: new Date() },
  { name: "Jane Smith", email: "jane@example.com", role: "user", createdAt: new Date() }
];

async function seedDatabase() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('Connected successfully to database server for seeding');
    const db = client.db();
    
    // Clear and re-populate primary collections
    await db.collection('users').deleteMany({});
    const result = await db.collection('users').insertMany(mockUsers);
    console.log(`Successfully seeded ${result.insertedCount} template records into 'users' collection.`);
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await client.close();
  }
}

seedDatabase();