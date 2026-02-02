/**
 * API 接口统一管理
 * 通过 Cloudflare Functions 代理转发请求
 */

/**
 * 搜索地点 - 通过代理转发到 OpenStreetMap Nominatim API
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 返回结果数量限制，默认5
 * @returns {Promise<Array>} 搜索结果数组
 */
export async function searchLocation(keyword, limit = 5) {
    try {
        const url = `/api/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error('搜索地点失败:', error);
        throw error;
    }
}

/**
 * 获取海拔高度 - 直接调用 Open-Elevation API（无限制，支持 CORS）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<number>} 海拔高度（米）
 */
export async function getElevation(lat, lng) {
    try {
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
        const response = await fetch(url);
        const data = await response.json();

        // Open-Elevation 返回格式: { results: [{ elevation: number }] }
        if (data.results && data.results[0]) {
            return data.results[0].elevation || 0;
        }

        return 0;
    } catch (error) {
        console.error('获取海拔失败:', error);
        throw error;
    }
}
