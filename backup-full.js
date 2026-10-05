// backup-full.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function generateFullSqlBackup() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.pbvoqnnkkmheapayyvjv',
    password: 'Kerinci1207', // Ganti dengan password Anda
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("🔄 Menghubungkan ke database Supabase...");
    await client.connect();
    console.log("✅ Berhasil terhubung!");

    let sqlDump = `-- ==========================================\n`;
    sqlDump += `-- FULL SUPABASE DATABASE BACKUP (SCHEMA + DATA)\n`;
    sqlDump += `-- Waktu: ${new Date().toISOString()}\n`;
    sqlDump += `-- ==========================================\n\n`;
    sqlDump += `SET statement_timeout = 0;\n`;
    sqlDump += `SET lock_timeout = 0;\n`;
    sqlDump += `SET client_encoding = 'UTF8';\n\n`;

    // Ambil SEMUA tabel di schema public secara otomatis
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(r => r.table_name);

    console.log(`📋 Ditemukan ${tables.length} tabel di database Anda:`, tables.join(', '));

    for (const tableName of tables) {
      console.log(`\n📥 Memproses tabel: "${tableName}"...`);

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
      sqlDump += `-- Struktur tabel untuk "${tableName}"\n`;
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
        if (col.is_nullable === 'NO') {
          def += ` NOT NULL`;
        }
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });

      sqlDump += colDefs.join(',\n');
      sqlDump += `\n);\n\n`;

      const dataResult = await client.query(`SELECT * FROM public."${tableName}"`);
      const rows = dataResult.rows;

      if (rows.length > 0) {
        console.log(`📦 Menulis ${rows.length} baris data untuk "${tableName}"...`);
        sqlDump += `-- Data untuk tabel "${tableName}"\n`;

        const columns = colsResult.rows.map(c => `"${c.column_name}"`);

        for (const row of rows) {
          const values = colsResult.rows.map(c => {
            const val = row[c.column_name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val;
            if (typeof val === 'object') {
              return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlDump += `INSERT INTO public."${tableName}" (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += `\n`;
      } else {
        console.log(`ℹ️ Tabel "${tableName}" kosong.`);
      }
    }

    const fileName = `full_backup_supabase_${Date.now()}.sql`;
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, sqlDump, 'utf8');

    console.log(`\n🎉 SUKSES! File backup lengkap (Struktur Tabel + Data) berhasil dibuat di:`);
    console.log(`📂 ${filePath}`);

  } catch (err) {
    console.error("❌ Terjadi kesalahan saat backup database:", err);
  } finally {
    await client.end();
  }
}

generateFullSqlBackup();