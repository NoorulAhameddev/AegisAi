// Test database connection
const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgresql://postgres:your_new_password@localhost:5432/aegis_ai",
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Database connection successful!");
    const result = await client.query(
      "SELECT current_database(), current_user, version()",
    );
    console.log("Database:", result.rows[0].current_database);
    console.log("User:", result.rows[0].current_user);
    console.log("PostgreSQL version:", result.rows[0].version.split(",")[0]);
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
