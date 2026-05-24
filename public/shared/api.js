async function readError(res) {
  try {
    const j = await res.json();
    return j.error || res.statusText;
  } catch (_) {
    return res.status + ' ' + res.statusText;
  }
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
