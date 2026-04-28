import { http, HttpResponse } from 'msw';

// MSW handler para Edge Function — URL hard-coded para project ehbxpbeijofxtsbezwxd (Phase 2 precedent).
// Default success response; tests can override with server.use(...) for 409 / 403 / 400 cases.
// INV-3-16: Edge Function usa D-21 alphabet (ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789)
export const createUserWithTempPasswordHandler = http.post(
  'https://ehbxpbeijofxtsbezwxd.supabase.co/functions/v1/create-user-with-temp-password',
  async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      role?: string;
      companyId?: string;
      orgUnitId?: string;
    };
    if (!body.email || !body.fullName || !body.role) {
      return HttpResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }
    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json({ error: 'duplicate_email' }, { status: 409 });
    }
    return HttpResponse.json({
      success: true,
      userId: '00000000-0000-0000-0000-000000000001',
      tempPassword: 'Abc23xYz', // D-21 alphabet placeholder — NOT a real credential
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  },
);
