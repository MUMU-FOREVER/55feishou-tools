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
            // 开发环境代理 - 海拔查询 (Open-Elevation，无限制)
            '/api/elevation': {
                target: 'https://api.open-elevation.com',
                changeOrigin: true,
                rewrite: (path) => {
                    const url = new URL(path, 'http://localhost');
                    const lat = url.searchParams.get('lat') || '';
                    const lng = url.searchParams.get('lng') || '';
                    return `/api/v1/lookup?locations=${lat},${lng}`;
                }
            },

            // 开发环境代理 - Esri 卫星图瓦片
            '/tiles/esri': {
                target: 'https://server.arcgisonline.com',
                changeOrigin: true,
                rewrite: (path) => {
                    // /tiles/esri/z/x/y -> /ArcGIS/rest/services/World_Imagery/MapServer/tile/z/y/x
                    const match = path.match(/\/tiles\/esri\/(\d+)\/(\d+)\/(\d+)/);
                    if (match) {
                        const [, z, x, y] = match;
                        return `/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
                    }
                    return path;
                }
            },
            // 开发环境代理 - OpenTopoMap 地形图瓦片
            '/tiles/topo': {
                target: 'https://tile.opentopomap.org',
                changeOrigin: true,
                rewrite: (path) => path.replace('/tiles/topo', '') + '.png',
                headers: {
                    'User-Agent': 'DistanceCalculator/1.0'
                }
            }
        }
    }
});
