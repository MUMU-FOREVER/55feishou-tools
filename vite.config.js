import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
    plugins: [uni()],
    server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            // 开发环境代理 - 地点搜索
            '/api/search': {
                target: 'https://nominatim.openstreetmap.org',
                changeOrigin: true,
                rewrite: (path) => {
                    const url = new URL(path, 'http://localhost');
                    const q = url.searchParams.get('q') || '';
                    const limit = url.searchParams.get('limit') || '5';
                    return `/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}&accept-language=zh`;
                },
                headers: {
                    'User-Agent': 'DistanceCalculator/1.0'
                }
            },
            // 开发环境代理 - 海拔查询
            '/api/elevation': {
                target: 'https://api.open-meteo.com',
                changeOrigin: true,
                rewrite: (path) => {
                    const url = new URL(path, 'http://localhost');
                    const lat = url.searchParams.get('lat') || '';
                    const lng = url.searchParams.get('lng') || '';
                    return `/v1/elevation?latitude=${lat}&longitude=${lng}`;
                }
            }
        }
    }
});
