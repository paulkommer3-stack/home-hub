// functions/api/sync.js
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || url.searchParams.get('passcode');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Passcode required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT data, updated_at FROM household_data WHERE passcode = ?'
    ).bind(code).first();

    if (!row) {
      return new Response(JSON.stringify({ exists: false, payload: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      exists: true,
      payload: JSON.parse(row.data),
      updatedAt: row.updated_at
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const code = body.code || body.passcode;
    const payload = body.payload || body.data;

    if (!code || !payload) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dataString = JSON.stringify(payload);
    const updatedAt = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO household_data (passcode, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(passcode) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(code, dataString, updatedAt).run();

    return new Response(JSON.stringify({ success: true, updatedAt }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
