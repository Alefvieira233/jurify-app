import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check system preference or localStorage
    let savedTheme: 'light' | 'dark' | null = null;
    try {
      savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    } catch { /* private browsing or storage full */ }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    try { localStorage.setItem('theme', newTheme); } catch { /* ignore */ }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full hover:bg-white/10 transition-all duration-300 group"
      aria-label={`Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon */}
        <Sun
          className={`absolute inset-0 h-6 w-6 transition-all duration-500 ${
            theme === 'light'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0'
          }`}
          strokeWidth={2}
        />

        {/* Moon Icon */}
        <Moon
          className={`absolute inset-0 h-6 w-6 transition-all duration-500 ${
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
          }`}
          strokeWidth={2}
        />
      </div>

      {/* Animated background glow */}
      <div className="absolute inset-0 rounded-full bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl" />
    </Button>
  );
};

export default ThemeToggle;
