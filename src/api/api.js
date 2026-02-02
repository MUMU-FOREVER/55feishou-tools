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
 * 获取海拔高度 - 通过代理转发到 Open-Meteo Elevation API
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<number>} 海拔高度（米）
 */
export async function getElevation(lat, lng) {
    try {
        const url = `/api/elevation?lat=${lat}&lng=${lng}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data.elevation[0] || 0;
    } catch (error) {
        console.error('获取海拔失败:', error);
        throw error;
    }
}

