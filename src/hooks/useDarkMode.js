import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('ew-dark') === 'true');

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ew-dark', dark);
  }, [dark]);

  return [dark, setDark];
}