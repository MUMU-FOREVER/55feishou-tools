/**
 * Cloudflare Functions - OpenTopoMap 地形图瓦片代理
 */
export async function onRequest(context) {
    const { params } = context;
    const { z, x, y } = params;

    // 使用不同的子域名进行负载均衡
    const subdomains = ['a', 'b', 'c'];
    const s = subdomains[Math.floor(Math.random() * subdomains.length)];

    const tileUrl = `https://${s}.tile.opentopomap.org/${z}/${x}/${y}.png`;

    try {
        const response = await fetch(tileUrl, {
            headers: {
                'User-Agent': 'DistanceCalculator/1.0'
            }
        });

        if (!response.ok) {
            return new Response('Tile not found', { status: 404 });
        }

        const imageData = await response.arrayBuffer();

        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('OpenTopoMap tile proxy error:', error);
        return new Response('Proxy error', { status: 500 });
    }
}
