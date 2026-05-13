type LoadingPanelProps = {
  eyebrow: string;
  title: string;
  lines?: number;
};

export function LoadingPanel({ eyebrow, title, lines = 3 }: LoadingPanelProps) {
  return (
    <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">{eyebrow}</p>
      <h1 className="text-3xl font-bold text-stone-950">{title}</h1>
      <div className="mt-6 grid gap-3" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded-full bg-stone-200"
            style={{ width: `${92 - index * 14}%` }}
          />
        ))}
      </div>
    </section>
  );
}
