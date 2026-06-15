import { Dot } from './ui.jsx';

// Dropdown selector for the active list whose predictions are being edited.
export default function ListPicker({ lists, value, onChange }) {
  if (lists.length === 0) return null;
  if (lists.length === 1) {
    const l = lists[0];
    return (
      <div className="card px-4 py-2.5 flex items-center gap-2">
        <Dot color={l.color} />
        <span className="font-semibold text-ink truncate">{l.name}</span>
      </div>
    );
  }
  const active = lists.find((l) => l.id === value) || lists[0];
  return (
    <div className="card px-3 py-2 flex items-center gap-2">
      <Dot color={active.color} />
      <select
        className="flex-1 bg-transparent font-semibold text-ink focus:outline-none py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {lists.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </div>
  );
}
