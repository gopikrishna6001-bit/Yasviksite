import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllAppSettings,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import {
  DEFAULT_THEME_PRESET_KEY,
  getThemeCssVars,
  getThemePreset,
} from '@/lib/themePresets';

export default function ThemeVariables() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.theme,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const activeThemeKey = String(resolveSetting(settings, 'theme_active_preset', DEFAULT_THEME_PRESET_KEY));

  useEffect(() => {
    const preset = getThemePreset(activeThemeKey);
    const vars = getThemeCssVars(preset);
    const root = document.documentElement;

    root.dataset.yasvikTheme = preset.key;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', preset.header);
  }, [activeThemeKey]);

  return null;
}
