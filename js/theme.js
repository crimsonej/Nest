document.addEventListener('DOMContentLoaded', () => {
  const THEME_KEY = 'nest-theme';
  const preferredTheme = localStorage.getItem(THEME_KEY) || 'light';

  function applyTheme(theme) {
    const validThemes = ['light', 'mid', 'dark'];
    const selected = validThemes.includes(theme) ? theme : 'light';
    document.body.setAttribute('data-theme', selected);

    document.querySelectorAll('.theme-option').forEach((button) => {
      const active = button.dataset.theme === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    localStorage.setItem(THEME_KEY, selected);
  }

  document.querySelectorAll('.theme-option').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });

  applyTheme(preferredTheme);
});
