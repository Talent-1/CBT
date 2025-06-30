// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Make sure this is uncommented if you're using React

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Ensure your plugins are enabled
  server: {
    proxy: {
      // Proxy requests from /api to your Render backend during development
      '/api': {
        target: 'https://city-api-67zs.onrender.com', // <--- Your Render backend URL
        changeOrigin: true, // Needed for cross-origin requests
        // You might need to rewrite if your backend endpoints don't include '/api'
        // For example, if your frontend calls /api/users but backend is just /users:
        // rewrite: (path) => path.replace(/^\/api/, ''),
        // If your backend *does* expect the /api prefix, then no rewrite is needed, or:
        rewrite: (path) => path.replace(/^\/api/, '/api'), // This keeps the /api prefix
        secure: true, // Render uses HTTPS, so keep this true
        ws: true, // If your backend uses WebSockets, keep this true
      },
    },
  },
});