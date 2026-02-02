/**
 * Cloudflare Functions - 地点搜索代理
 */
import { proxyRequest, createErrorResponse } from '../lib/proxy.js';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    const keyword = url.searchParams.get('q');
    const limit = url.searchParams.get('limit') || '5';

    if (!keyword) {
        return createErrorResponse(400, '缺少搜索关键词');
    }

    const params = new URLSearchParams({
        format: 'json',
        q: keyword,
        limit: limit,
        'accept-language': 'zh'
    });

    return proxyRequest({
        apiKey: 'nominatim',
        path: '/search',
        params
    });
}
