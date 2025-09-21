const { Client } = require('pg');
require('dotenv').config({ path: './config.env' });

async function setupDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'healthcare_db';
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📝 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully!`);
    } else {
      console.log(`✅ Database '${dbName}' already exists!`);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Update your config.env with the correct credentials');
    console.log('3. Run: node server.js');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Check your config.env credentials');
    console.log('3. Ensure the postgres user has permission to create databases');
  } finally {
    await client.end();
  }
}

setupDatabase();
