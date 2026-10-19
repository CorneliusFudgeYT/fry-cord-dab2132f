import { useEffect } from 'react';
import { useMediaUrl } from './media';
export function ThemeSync({ theme = 'dark', background, language = 'en' }: {theme?: string; background?: string | null; language?: string}) {
  const { data: url } = useMediaUrl(background);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.documentElement.lang = language;
    document.documentElement.style.setProperty('--user-background', url ? `url("${url.replace(/"/g, '')}")` : 'none');
  }, [theme, url, language]);
  return null;
}
