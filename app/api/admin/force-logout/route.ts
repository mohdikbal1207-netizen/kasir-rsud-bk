import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: Kredensial Supabase Admin belum lengkap di environment variables.');
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper Ringkas untuk Log Ingestion & Egress Tracking (Aman & Bebas Bug .match)
async function recordTelemetry(payload: {
  adminId: string;
  targetUserId: string;
  action: string;
  description: string;
  clientIp: string;
  userAgent: string;
}) {
  try {
    await Promise.all([
      supabaseAdmin.from('audit_logs').insert([{
        admin_id: payload.adminId,
        action: payload.action,
        target_user_id: payload.targetUserId,
        description: payload.description,
        ip_address: payload.clientIp,
        user_agent: payload.userAgent,
        created_at: new Date().toISOString(),
      }]),
      supabaseAdmin.from('egress_metrics').insert([{
        user_id: payload.adminId,
        egress_type: 'ADMIN_FORCE_LOGOUT_EGRESS',
        details: `Target User: ${payload.targetUserId} | Action: ${payload.action}`,
        timestamp: new Date().toISOString(),
      }]) // Sintaks .match() yang salah telah dihapus agar aman dari error runtime
    ]);
  } catch (err) {
    // Non-blocking telemetry fallback: mencegah kegagalan log merusak fungsi utama
    console.warn('Telemetry Recording Warning:', err);
  }
}

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown Client';

  try {
    let callerUser: any = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: bearerUser } } = await supabaseAdmin.auth.getUser(token);
      if (bearerUser) {
        callerUser = bearerUser;
      }
    }

    if (!callerUser) {
      const cookieStore = await cookies();
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {}
            },
          },
        }
      );

      const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
      if (cookieUser) {
        callerUser = cookieUser;
      }
    }

    if (!callerUser) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi autentikasi pemanggil tidak ditemukan.' },
        { status: 401 }
      );
    }

    const callerEmail = (callerUser.email || '').toLowerCase().trim();
    const isSuperAdminEmail = callerEmail === 'mohdikbal1207@gmail.com';

    if (!isSuperAdminEmail) {
      const { data: callerProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role, is_active')
        .eq('id', callerUser.id)
        .single();

      if (profileError || !callerProfile || callerProfile.is_active === false) {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Akun pemanggil tidak aktif atau tidak memiliki hak akses.' },
          { status: 403 }
        );
      }

      const allowedAdminRoles = ['Administrator', 'IT Coordinator', 'Admin', 'Super Administrator'];
      const userRoleLower = callerProfile.role?.toLowerCase() || '';
      const isAdmin = allowedAdminRoles.some(role => userRoleLower.includes(role.toLowerCase()));

      if (!isAdmin && userRoleLower !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Anda tidak memiliki otoritas manajemen sesi.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => null);
    const targetUserId = body?.userId || body?.user_id || body?.id;

    if (!body || !targetUserId) {
      return NextResponse.json(
        { success: false, message: 'ID Pengguna target wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(targetUserId)) {
      return NextResponse.json(
        { success: false, message: 'Format ID Pengguna target tidak valid.' },
        { status: 400 }
      );
    }

    const { data: targetUser, error: targetCheckError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetCheckError || !targetUser?.user) {
      return NextResponse.json(
        { success: false, message: 'Gagal: Pengguna target tidak ditemukan di dalam sistem.' },
        { status: 404 }
      );
    }

    // Perbarui status sesi menjadi tidak aktif (is_active: false)
    const { error: dbError } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false
      })
      .eq('user_id', targetUserId);

    if (dbError) {
      await supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false
        })
        .eq('id', targetUserId);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.signOut(targetUserId);
    if (authError) {
      console.warn('Peringatan: Gagal mencabut auth token via admin, namun sesi database telah ditutup.', authError.message);
    }

    // Pencatatan Log Ingestion & Egress Telemetry secara efisien
    await recordTelemetry({
      adminId: callerUser.id,
      targetUserId,
      action: 'FORCE_LOGOUT_USER',
      description: `Admin ${callerUser.email} mengakhiri sesi secara paksa untuk staf ber-email ${targetUser.user.email || targetUserId}`,
      clientIp,
      userAgent
    });

    return NextResponse.json({ 
      success: true, 
      message: `Sesi untuk pengguna ${targetUser.user.email || 'target'} berhasil diakhiri secara paksa.`,
      targetUserId: targetUserId,
      timestamp: new Date().toISOString()
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan internal server.';
    console.error('Force Logout API Error:', errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}