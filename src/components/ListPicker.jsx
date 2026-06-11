import { Dot } from './ui.jsx';

// Horizontal selector for the active list whose predictions are being edited.
export default function ListPicker({ lists, value, onChange }) {
  if (lists.length === 0) return null;
  return (
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 w-max pb-1">
        {lists.map((l) => {
          const active = l.id === value;
          return (
            <button
              key={l.id}
              onClick={() => onChange(l.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
                active ? 'bg-ink text-white' : 'bg-white text-ink border border-black/10'
              }`}
            >
              <Dot color={l.color} />
              {l.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
