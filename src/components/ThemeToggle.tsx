import { useState } from 'react';
import type { ThemeChoice } from '../lib/theme';
import { applyTheme, getStoredTheme } from '../lib/theme';

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(getStoredTheme);

  return (
    <select
      aria-label="Theme"
      value={choice}
      onChange={(event) => {
        const next = event.target.value as ThemeChoice;
        setChoice(next);
        applyTheme(next);
      }}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
