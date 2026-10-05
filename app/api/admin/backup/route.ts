import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const runtime = 'nodejs'; // Pastikan berjalan di Node.js runtime

interface ColumnMeta {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  column_default: string | null;
  is_nullable: string;
}

interface TableRow {
  table_name: string;
}

interface PKRow {
  column_name: string;
}

// Helper Function: Upload File ke Google Drive dengan Sanitasi Private Key
async function uploadToGoogleDrive(sqlContent: string, fileName: string) {
  const clientEmail = process.env.GDRIVE_CLIENT_EMAIL;
  let rawPrivateKey = process.env.GDRIVE_PRIVATE_KEY;
  const folderId = process.env.GDRIVE_FOLDER_ID;

  if (!clientEmail || !rawPrivateKey || !folderId) {
    throw new Error('Konfigurasi Google Drive (GDRIVE_CLIENT_EMAIL, GDRIVE_PRIVATE_KEY, GDRIVE_FOLDER_ID) belum diatur di .env.local');
  }

  // Sanitasi Private Key agar dibaca secara sah oleh OpenSSL:
  // 1. Hapus tanda petik ganda/tunggal pembungkus jika ada
  // 2. Ubah escaping \n menjadi baris baru (newline) nyata
  const privateKey = rawPrivateKey
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: 'text/plain',
    body: Readable.from([sqlContent]),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  });

  return response.data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Opsi aksi: 'download' (default), 'gdrive', atau 'both'
  const action = searchParams.get('action') || 'download';

  // Ambil variabel lingkungan murni dari .env.local
  const host = process.env.PGHOST;
  const port = Number(process.env.PGPORT) || 5432;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;

  if (!host || !database || !user || !password) {
    return NextResponse.json(
      { success: false, error: 'Variabel lingkungan database belum diatur di .env.local' },
      { status: 500 }
    );
  }

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
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
    sqlDump += `SET client_encoding = 'UTF8';\n`;
    sqlDump += `SET session_replication_role = 'replica'; -- Mencegah error Foreign Key constraint saat restore\n\n`;

    // 1. Ambil semua tabel di schema public
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tablesResult = await client.query<TableRow>(tablesQuery);
    const tables = tablesResult.rows.map((r: TableRow) => r.table_name);

    for (const tableName of tables) {
      // 2. Ambil informasi kolom
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
      const colsResult = await client.query<ColumnMeta>(colsQuery, [tableName]);
      const columnsData: ColumnMeta[] = colsResult.rows;

      // 3. Ambil Primary Key tabel
      const pkQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY kcu.ordinal_position;
      `;
      const pkResult = await client.query<PKRow>(pkQuery, [tableName]);
      const primaryKeys = pkResult.rows.map((r: PKRow) => `"${r.column_name}"`);

      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `-- Struktur tabel "${tableName}"\n`;
      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `DROP TABLE IF EXISTS public."${tableName}" CASCADE;\n`;
      sqlDump += `CREATE TABLE public."${tableName}" (\n`;

      const colDefs = columnsData.map((col: ColumnMeta) => {
        let type = col.data_type.toUpperCase();
        if (type === 'CHARACTER VARYING') {
          type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
        } else if (type === 'TIMESTAMP WITH TIME ZONE') {
          type = 'TIMESTAMPTZ';
        } else if (type === 'TIMESTAMP WITHOUT TIME ZONE') {
          type = 'TIMESTAMP';
        } else if (type === 'ARRAY') {
          type = 'TEXT[]';
        } else if (type === 'USER-DEFINED') {
          type = 'TEXT';
        }

        let def = `  "${col.column_name}" ${type}`;
        if (col.is_nullable === 'NO') def += ` NOT NULL`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });

      // Tambahkan klausa PRIMARY KEY jika ada
      if (primaryKeys.length > 0) {
        colDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }

      sqlDump += colDefs.join(',\n');
      sqlDump += `\n);\n\n`;

      // 4. Ambil isi data tabel
      const dataResult = await client.query(`SELECT * FROM public."${tableName}"`);
      const rows = dataResult.rows;

      if (rows.length > 0) {
        const columns = columnsData.map((c: ColumnMeta) => `"${c.column_name}"`);
        for (const row of rows) {
          const values = columnsData.map((c: ColumnMeta) => {
            const val = row[c.column_name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlDump += `INSERT INTO public."${tableName}" (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET session_replication_role = 'origin';\n`;

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `backup_full_supabase_${dateStr}.sql`;

    // Opsi Aksi 1: Hanya Upload ke Google Drive
    if (action === 'gdrive') {
      const gdriveResult = await uploadToGoogleDrive(sqlDump, fileName);
      return NextResponse.json({
        success: true,
        message: 'Backup berhasil diunggah otomatis ke Google Drive RSUD.',
        file: gdriveResult,
      });
    }

    // Opsi Aksi 2: Kirim ke Google Drive DAN Unduh Otomatis di Browser
    if (action === 'both') {
      await uploadToGoogleDrive(sqlDump, fileName).catch((e) =>
        console.error('Gagal upload gdrive background:', e)
      );
    }

    // Opsi Aksi 3 / Default: Langsung Unduh File .sql Uncompressed di Browser
    return new NextResponse(sqlDump, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan pada server backup';
    console.error('Error backup:', err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  } finally {
    await client.end();
  }
}