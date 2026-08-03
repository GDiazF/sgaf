/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        institutional: {
          DEFAULT: '#1E5F8C',
          deep: '#172D45',
        },
        celeste: {
          DEFAULT: '#6EC4E8',
          deep: '#3A94C4',
        },
        primary: 'var(--primary)',
        surface: 'var(--surface)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        bg: 'var(--bg)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
        topbar: 'var(--topbar-height)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      screens: {
        tablet: { max: '1023px' },
        mobile: { max: '767px' },
        desktop: '1024px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}
