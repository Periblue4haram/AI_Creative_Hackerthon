import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버는 /api 요청을 백엔드(Spring Boot, 기본 8080)로 넘겨 준다.
// → 브라우저 입장에서는 같은 출처라 백엔드의 CORS_ALLOWED_ORIGINS 를 건드리지 않아도 된다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080';
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target, changeOrigin: true } } },
    preview: { proxy: { '/api': { target, changeOrigin: true } } },
  };
});
