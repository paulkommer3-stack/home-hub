// functions/api/sync.js
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const passcode = url.searchParams.get('passcode');

  if (!passcode) {
    return new Response(JSON.stringify({ error: 'Passcode required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT data FROM household_data WHERE passcode = ?'
    ).bind(passcode).first();

    if (!row) {
      return new Response(JSON.stringify({ data: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: JSON.parse(row.data) }), {
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
    const { passcode, data } = body;

    if (!passcode || !data) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dataString = JSON.stringify(data);
    const updatedAt = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO household_data (passcode, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(passcode) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(passcode, dataString, updatedAt).run();

    return new Response(JSON.stringify({ success: true, updated_at: updatedAt }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
