#!/usr/bin/env python3
"""
PostgreSQL Local Setup Script
Sets up the aegis_ai database for local development
"""

import subprocess
import os
import sys

def run_psql_command(command):
    """Execute a psql command"""
    env = os.environ.copy()
    env['PGPASSWORD'] = ''  # Empty password first
    
    result = subprocess.run([
        'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
        '-U', 'postgres',
        '-h', '127.0.0.1',
        '-c', command
    ], env=env, capture_output=True, text=True, timeout=10)
    
    return result

def main():
    print('\n' + '='*60)
    print('🔧 Aegis AI - Local PostgreSQL Setup')
    print('='*60 + '\n')
    
    # Step 1: Set password
    print('Step 1: Setting PostgreSQL postgres user password...')
    result = run_psql_command("ALTER USER postgres WITH PASSWORD 'password';")
    
    if result.returncode == 0:
        print('  ✓ Password set successfully to: password\n')
    else:
        print(f'  ⚠ Status: {result.stderr.strip()[:100]}\n')
    
    # Step 2: Create database
    print('Step 2: Creating aegis_ai database...')
    result = run_psql_command('CREATE DATABASE aegis_ai;')
    
    if result.returncode == 0:
        print('  ✓ Database created successfully\n')
    elif 'already exists' in result.stderr:
        print('  ✓ Database already exists\n')
    else:
        print(f'  ⚠ Status: {result.stderr.strip()[:100]}\n')
    
    # Step 3: Verify connection with password
    print('Step 3: Verifying connection with new password...')
    env = os.environ.copy()
    env['PGPASSWORD'] = 'password'
    
    result = subprocess.run([
        'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
        '-U', 'postgres',
        '-h', '127.0.0.1',
        '-d', 'aegis_ai',
        '-c', 'SELECT 1;'
    ], env=env, capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        print('  ✓ Connection successful!\n')
    else:
        print(f'  ✗ Connection failed: {result.stderr.strip()[:100]}\n')
        return False
    
    print('='*60)
    print('✅ PostgreSQL Setup Complete!\n')
    print('Next Steps:')
    print('  1. Update your .env files with:')
    print('     DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_ai')
    print('  2. Run migrations: npm run migrate:deploy')
    print('  3. Start web server: cd apps/web && npm run dev')
    print('  4. Test login at: http://localhost:3000/login')
    print('='*60 + '\n')
    
    return True

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f'\n❌ Error: {e}\n')
        sys.exit(1)
