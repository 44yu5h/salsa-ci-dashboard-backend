const MATRIX_ALERTS_ENABLED = process.env.MATRIX_ALERTS_ENABLED;
const MATRIX_ROOM_ID = process.env.MATRIX_ROOM_ID;
const MATRIX_HOMESERVER_URL = process.env.MATRIX_HOMESERVER_URL;
const MATRIX_ACCESS_TOKEN = process.env.MATRIX_ACCESS_TOKEN;

export async function sendMatrixAlert(options = {}) {
  if (MATRIX_ALERTS_ENABLED !== 'true') {
    return { ok: true, sent: false, reason: 'disabled' };
  }

  const { roomId = MATRIX_ROOM_ID, message, dryRun } = options;

  const content = {
    msgtype: 'm.notice',
    body: message,
  };

  if (dryRun) {
    return { dryRun: true, ok: true, sent: true, content };
  }

  const txnId = Date.now() + '_' + Math.random().toString(36).slice(2);
  const url = `${MATRIX_HOMESERVER_URL}/_matrix/client/v3/rooms/${roomId}/send/m.room.message/${txnId}`;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MATRIX_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(content),
  });

  if (!resp?.ok) {
    const text = await resp.text();
    return { ok: false, sent: false, status: resp.status, error: text };
  }

  const data = await resp.json().catch(() => ({}));
  return { ok: true, sent: true, eventId: data.event_id };
}
