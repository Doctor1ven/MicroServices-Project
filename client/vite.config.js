import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);
  const apiUrl = env.REACT_APP_API_URL || env.VITE_API_URL || '';

  return {
    plugins: [react()],
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(apiUrl)
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    server: {
      port: Number(env.VITE_DEV_PORT || 5173),
      ...(apiUrl
        ? {
            proxy: {
              '/api': apiUrl,
              '/health': apiUrl
            }
          }
        : {})
    }
  };
});
