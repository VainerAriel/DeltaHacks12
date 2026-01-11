// Quick diagnostic script to test MongoDB connection
const fs = require('fs');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Read .env.local file
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB connection...');
  console.log('📍 URI format:', uri.startsWith('mongodb+srv://') ? 'Atlas (SRV)' : 'Standard');
  console.log('🌐 Host:', uri.match(/@([^/]+)/)?.[1] || 'unknown');
  console.log('');

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    console.log('⏳ Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Try to ping the database
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Database ping successful!');
    
    // List databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    console.log('📊 Available databases:', databases.map(db => db.name).join(', '));
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('');
    console.error('Error details:');
    console.error('  Type:', error.constructor.name);
    console.error('  Message:', error.message);
    
    if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
      console.error('');
      console.error('🔧 Troubleshooting steps:');
      console.error('  1. Check MongoDB Atlas Network Access (IP Whitelist):');
      console.error('     - Go to https://cloud.mongodb.com');
      console.error('     - Select your cluster');
      console.error('     - Click "Network Access" in the left sidebar');
      console.error('     - Click "Add IP Address"');
      console.error('     - Click "Allow Access from Anywhere" (0.0.0.0/0) for development');
      console.error('     - Wait 1-2 minutes for changes to propagate');
      console.error('');
      console.error('  2. Check if your firewall/antivirus is blocking the connection');
      console.error('  3. Verify your internet connection is stable');
      console.error('  4. Make sure your MongoDB Atlas cluster is not paused');
    }
    
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
