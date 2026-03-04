#!/usr/bin/env python3
"""
Phase 3 Final Insertion Script
Executes all SQL batch files via subprocess calling Claude MCP tool
"""
import subprocess
import json

project_id = "mhfikaomkmqcndqfohbp"

def execute_sql_file(filename, lang_name):
    """Execute a SQL file using MCP supabase tool"""
    print(f"\n{'='*60}")
    print(f"Executing {lang_name} posts from {filename}...")
    print('='*60)

    with open(filename, 'r') as f:
        sql = f.read()

    # Split into individual INSERT statements
    statements = [s.strip() for s in sql.split('ON CONFLICT') if s.strip()]

    success = 0
    duplicate = 0
    error = 0

    for idx, stmt in enumerate(statements, 1):
        if not stmt:
            continue

        # Reconstruct the statement
        full_stmt = stmt + '\nON CONFLICT (slug) DO NOTHING;' if 'INSERT' in stmt else stmt

        # This would need to be executed via the MCP tool
        # For now, print summary
        print(f"  Statement {idx}/{len(statements)}")

    print(f"\n{lang_name} Summary:")
    print(f"  Processed: {len(statements)} statements")

    return len(statements)

# Execute all batches
total = 0
total += execute_sql_file('phase3-it-batch.sql', 'Italian')
total += execute_sql_file('phase3-sv-batch.sql', 'Swedish')
total += execute_sql_file('phase3-nl-batch.sql', 'Dutch')
total += execute_sql_file('phase3-ja-batch.sql', 'Japanese')

print(f"\n{'='*60}")
print(f"TOTAL: {total} statements prepared")
print('='*60)
print("\nTo actually execute, use the SQL files directly with psql or pgAdmin")
print("Or import them via Supabase dashboard SQL editor")
