// Dynamic Theme Management Service supporting System Default, Light, and Dark
export const themeService = {
  getStoredTheme: () => {
    return localStorage.getItem('socialsync-theme') || 'default';
  },

  setTheme: (theme) => {
    localStorage.setItem('socialsync-theme', theme);
    themeService.applyTheme(theme);
  },

  applyTheme: (theme) => {
    let activeTheme = theme;
    if (theme === 'default') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', activeTheme);
  },

  initSystemListener: (callback) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => {
      const stored = themeService.getStoredTheme();
      if (stored === 'default') {
        const activeTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', activeTheme);
        if (callback) callback(activeTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }
};

export default themeService;
