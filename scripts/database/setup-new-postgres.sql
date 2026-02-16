-- Create new PostgreSQL user and database for Aegis AI
-- Run this as postgres superuser

-- Create user if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'Aegis_Ai') THEN
      CREATE USER Aegis_Ai WITH PASSWORD 'abdul';
   END IF;
END
$$;

-- Create database
DROP DATABASE IF EXISTS "Aegis";
CREATE DATABASE "Aegis" OWNER Aegis_Ai;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "Aegis" TO Aegis_Ai;

-- Connect to the new database and set up schema permissions
\c Aegis

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO Aegis_Ai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO Aegis_Ai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO Aegis_Ai;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

RESET ROLE;
