import { TEAMS } from '../data/tournament.js';
import { flagUrl, flagEmoji } from '../data/flags.js';

// Country flag image (flagcdn). Falls back to nothing if the team has no code.
export function Flag({ team, size = 20, className = '' }) {
  const url = flagUrl(team, 40);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={Math.round(size * 0.66)}
      loading="lazy"
      className={`inline-block rounded-[2px] object-cover shadow-sm ${className}`}
      style={{ width: size, height: Math.round(size * 0.7) }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

// Flag + team name, used everywhere a team is shown.
export function TeamName({ team, size = 20, className = '', align = 'left' }) {
  if (!team) return <span className="text-ink/30">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''} ${className}`}>
      <Flag team={team} size={size} />
      <span>{team}</span>
    </span>
  );
}

export function ScoreBox({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      max="99"
      className="score-input shrink-0"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') return onChange('');
        const n = Math.max(0, Math.min(99, parseInt(v, 10)));
        onChange(String(n));
      }}
    />
  );
}

export function TeamSelect({ value, onChange, options = TEAMS, placeholder = 'Takım seç', disabled }) {
  return (
    <select className="field" value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((t) => (
        <option key={t} value={t}>{flagEmoji(t)} {t}</option>
      ))}
    </select>
  );
}

export function Dot({ color }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />;
}

export function ProgressBar({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
      <div className="h-full bg-pitch transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="card p-6 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink/60">{children}</p>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h2 className="font-display text-2xl leading-tight text-ink">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Avatar({ name, color, src, size = 32 }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  if (src) {
    return <img src={src} alt="" referrerPolicy="no-referrer"
      className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color || '#0a8754', fontSize: Math.round(size * 0.4) }}>
      {initials}
    </span>
  );
}

export function FormBadges({ form }) {
  if (!form || form.length === 0) return null;
  const cls = { G: 'bg-pitch text-white', B: 'bg-gold text-ink', M: 'bg-red-500 text-white' };
  return (
    <span className="inline-flex gap-0.5">
      {form.map((f, i) => (
        <span key={i} className={`inline-flex items-center justify-center h-4 w-4 rounded text-[9px] font-bold ${cls[f]}`}>{f}</span>
      ))}
    </span>
  );
}
