/**
 * Cloudflare Functions - 海拔查询代理
 * 使用 Open-Elevation API（无请求限制）
 */
import { createSuccessResponse, createErrorResponse } from '../lib/proxy.js';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    if (!lat || !lng) {
        return createErrorResponse(400, '缺少经纬度参数');
    }

    try {
        // 使用 Open-Elevation API（无限制）
        const apiUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        return createSuccessResponse(data, 86400); // 缓存24小时
    } catch (error) {
        console.error('海拔查询代理失败:', error);
        return createErrorResponse(500, '海拔查询失败');
    }
}
