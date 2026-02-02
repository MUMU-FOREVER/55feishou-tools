/**
 * Cloudflare Functions - 海拔查询代理
 */
import { proxyRequest, createErrorResponse } from '../lib/proxy.js';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    if (!lat || !lng) {
        return createErrorResponse(400, '缺少经纬度参数');
    }

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lng
    });

    return proxyRequest({
        apiKey: 'openMeteo',
        path: '/v1/elevation',
        params
    });
}
