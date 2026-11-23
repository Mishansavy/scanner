type ProgressBarProps = { completed: number; total: number };

export function ProgressBar({ completed, total }: ProgressBarProps) {
  return (
    <div className="progress">
      <progress value={completed} max={total} aria-label="PDF build progress" />
      <span>{completed}/{total}</span>
    </div>
  );
}
