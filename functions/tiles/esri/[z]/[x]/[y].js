/**
 * Cloudflare Functions - Esri 卫星图瓦片代理
 */
export async function onRequest(context) {
    const { params } = context;
    const { z, x, y } = params;

    const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

    try {
        const response = await fetch(tileUrl);

        if (!response.ok) {
            return new Response('Tile not found', { status: 404 });
        }

        const imageData = await response.arrayBuffer();

        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Esri tile proxy error:', error);
        return new Response('Proxy error', { status: 500 });
    }
}
