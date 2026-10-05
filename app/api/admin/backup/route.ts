import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs'; // Pastikan berjalan di Node.js runtime

export async function GET() {
  const client = new Client({
    host: process.env.PGHOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres.pbvoqnnkkmheapayyvjv',
    password: process.env.PGPASSWORD || 'Kerinci1207', // Sangat disarankan disimpan di .env
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    let sqlDump = `-- ==========================================\n`;
    sqlDump += `-- FULL SUPABASE DATABASE BACKUP (SCHEMA + DATA)\n`;
    sqlDump += `-- Waktu: ${new Date().toISOString()}\n`;
    sqlDump += `-- ==========================================\n\n`;
    sqlDump += `SET statement_timeout = 0;\n`;
    sqlDump += `SET lock_timeout = 0;\n`;
    sqlDump += `SET client_encoding = 'UTF8';\n\n`;

    // Ambil semua tabel di schema public
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(r => r.table_name);

    for (const tableName of tables) {
      const colsQuery = `
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      const colsResult = await client.query(colsQuery, [tableName]);

      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `-- Struktur tabel "${tableName}"\n`;
      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `DROP TABLE IF EXISTS public."${tableName}" CASCADE;\n`;
      sqlDump += `CREATE TABLE public."${tableName}" (\n`;

      const colDefs = colsResult.rows.map(col => {
        let type = col.data_type.toUpperCase();
        if (type === 'CHARACTER VARYING') {
          type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
        } else if (type === 'TIMESTAMP WITH TIME ZONE') {
          type = 'TIMESTAMPTZ';
        } else if (type === 'TIMESTAMP WITHOUT TIME ZONE') {
          type = 'TIMESTAMP';
        }

        let def = `  "${col.column_name}" ${type}`;
        if (col.is_nullable === 'NO') def += ` NOT NULL`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });

      sqlDump += colDefs.join(',\n');
      sqlDump += `\n);\n\n`;

      const dataResult = await client.query(`SELECT * FROM public."${tableName}"`);
      const rows = dataResult.rows;

      if (rows.length > 0) {
        const columns = colsResult.rows.map(c => `"${c.column_name}"`);
        for (const row of rows) {
          const values = colsResult.rows.map(c => {
            const val = row[c.column_name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlDump += `INSERT INTO public."${tableName}" (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += `\n`;
      }
    }

    const fileName = `backup_full_supabase_${new Date().toISOString().split('T')[0]}.sql`;

    // Kembalikan file langsung sebagai unduhan browser
    return new NextResponse(sqlDump, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (err: any) {
    console.error('Error backup:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}