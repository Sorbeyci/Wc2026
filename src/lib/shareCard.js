// Builds a 1080×1920 (9:16) leaderboard story image on a canvas and shares it
// via the Web Share API, falling back to a download. No external libraries.

const W = 1080, H = 1920;

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawLeaderboardCard(rows, { title = 'Sıralama', subtitle = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0c1f17');
  g.addColorStop(1, '#06140e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // brand
  ctx.fillStyle = '#19c37d';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText('kupayikimalir.com', 70, 120);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText('FIFA DÜNYA KUPASI 2026 · TAHMİN OYUNU', 70, 168);

  // title
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 92px system-ui, sans-serif';
  ctx.fillText(title, 70, 290);
  if (subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '500 34px system-ui, sans-serif';
    ctx.fillText(subtitle, 70, 340);
  }

  // rows
  const top = rows.slice(0, 10);
  const startY = 400, rowH = 132, pad = 70;
  const medal = ['#f4c64a', '#cdd3da', '#cd7f32'];
  top.forEach((r, i) => {
    const y = startY + i * rowH;
    ctx.fillStyle = i === 0 ? 'rgba(244,198,74,.14)' : 'rgba(255,255,255,.05)';
    roundRect(ctx, pad, y, W - pad * 2, rowH - 18, 28); ctx.fill();

    // rank
    ctx.fillStyle = i < 3 ? medal[i] : 'rgba(255,255,255,.45)';
    ctx.font = '800 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), pad + 60, y + 74);

    // avatar
    const ax = pad + 150, ay = y + (rowH - 18) / 2, ar = 44;
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fillStyle = r.list?.color || '#0a8754'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 38px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(initials(r.list?.ownerName || r.list?.name), ax, ay + 14);

    // name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '700 46px system-ui, sans-serif';
    let name = r.list?.name || '';
    while (ctx.measureText(name).width > W - pad * 2 - 470 && name.length > 3) name = name.slice(0, -1);
    if (name !== (r.list?.name || '')) name += '…';
    ctx.fillText(name, pad + 230, y + 70);

    // points
    ctx.textAlign = 'right';
    ctx.fillStyle = '#19c37d';
    ctx.font = '800 56px system-ui, sans-serif';
    ctx.fillText(String(r.total ?? 0), W - pad - 30, y + 74);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'left';
  return canvas;
}

export async function shareLeaderboard(rows, opts = {}) {
  const canvas = drawLeaderboardCard(rows, opts);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'kupayikimalir-siralama.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: opts.title || 'Sıralama' });
      return;
    }
  } catch (e) { /* fall through to download */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
