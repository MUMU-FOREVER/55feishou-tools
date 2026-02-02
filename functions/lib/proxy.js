/**
 * 通用代理服务
 * 提供统一的请求转发能力
 */

/**
 * 允许代理的 API 白名单配置
 */
export const ALLOWED_APIS = {
    // OpenStreetMap Nominatim - 地点搜索
    nominatim: {
        baseUrl: 'https://nominatim.openstreetmap.org',
        headers: {
            'User-Agent': 'DistanceCalculator/1.0'
        },
        cacheMaxAge: 3600 // 1小时
    },
    // Open-Meteo - 海拔/天气数据
    openMeteo: {
        baseUrl: 'https://api.open-meteo.com',
        headers: {},
        cacheMaxAge: 86400 // 24小时
    }
};

/**
 * 通用代理请求处理器
 * @param {Object} options - 配置选项
 * @param {string} options.apiKey - API 白名单中的 key
 * @param {string} options.path - 目标 API 路径
 * @param {URLSearchParams} options.params - 查询参数
 * @param {Object} options.extraHeaders - 额外的请求头
 * @returns {Promise<Response>} 代理响应
 */
export async function proxyRequest({ apiKey, path, params, extraHeaders = {} }) {
    const apiConfig = ALLOWED_APIS[apiKey];

    if (!apiConfig) {
        return createErrorResponse(403, `API "${apiKey}" 不在白名单中`);
    }

    try {
        // 构建目标 URL
        const targetUrl = new URL(path, apiConfig.baseUrl);
        if (params) {
            params.forEach((value, key) => {
                targetUrl.searchParams.set(key, value);
            });
        }

        // 发起请求
        const response = await fetch(targetUrl.toString(), {
            headers: {
                ...apiConfig.headers,
                ...extraHeaders
            }
        });

        const data = await response.json();

        return createSuccessResponse(data, apiConfig.cacheMaxAge);
    } catch (error) {
        console.error(`代理请求失败 [${apiKey}]:`, error);
        return createErrorResponse(500, '代理请求失败');
    }
}

/**
 * 创建成功响应
 */
export function createSuccessResponse(data, cacheMaxAge = 3600) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `public, max-age=${cacheMaxAge}`
        }
    });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
