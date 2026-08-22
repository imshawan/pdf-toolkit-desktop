export const isMac =
  typeof window !== 'undefined' &&
  (window.platform === 'darwin' || (typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')));

export const isWindows =
  typeof window !== 'undefined' &&
  (window.platform === 'win32' || (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')));

export const isLinux =
  typeof window !== 'undefined' &&
  (window.platform === 'linux' || (typeof navigator !== 'undefined' && navigator.userAgent.includes('Linux')));
