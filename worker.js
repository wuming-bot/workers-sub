// 确保环境变量只声明一次
const API_URL = API_URL_ENV; // 从环境变量中获取 API URL
const AUTH_TOKEN = AUTH_TOKEN_ENV; // 从环境变量中获取授权令牌

// 获取 VLESS 节点数据，支持从 URL 或直接从环境变量中获取
async function fetchVLESSNodes() {
    if (!VLESS_NODES_ENV) {
        throw new Error('VLESS_NODES_ENV is not defined');
    }

    let vlessNodes;
    try {
        if (VLESS_NODES_ENV.startsWith('http')) {
            const response = await fetch(VLESS_NODES_ENV);
            if (!response.ok) {
                throw new Error('Failed to fetch VLESS nodes');
            }
            vlessNodes = await response.json();
        } else {
            vlessNodes = JSON.parse(VLESS_NODES_ENV);
        }
    } catch (error) {
        throw new Error(`Invalid VLESS_NODES_ENV format or fetch error: ${error.message}`);
    }
    return vlessNodes;
}

// 获取优选 IP 和端口列表
let cachedIPs = null; // 添加缓存机制
let cacheTimestamp = 0; // 缓存时间戳

async function fetchPreferredIPs() {
    const CACHE_DURATION = 60 * 1000; // 缓存时间 60 秒
    const now = Date.now();

    if (cachedIPs && now - cacheTimestamp < CACHE_DURATION) {
        return cachedIPs;
    }

    if (!API_URL) {
        throw new Error('API_URL_ENV is not defined');
    }

    const response = await fetch(API_URL);
    if (!response.ok) {
        throw new Error('Failed to fetch IPs');
    }

    const text = await response.text();
    const lines = text
        .split('\n')
        .map(line => {
            const cleanLine = line.split('#')[0].trim();
            const parts = cleanLine.split(':');
            if (parts.length === 2) {
                return { ip: parts[0].trim(), port: parts[1].trim() };
            } else if (parts.length === 1) {
                return { ip: parts[0].trim(), port: null };
            }
            return null;
        })
        .filter(entry => entry && entry.ip);

    cachedIPs = lines.length > 0 ? lines : null; // 如果没有有效 IP，缓存为空
    cacheTimestamp = now;
    return cachedIPs;
}

// 替换 VLESS 节点中的所有 address 和 port
function replaceVLESSNode(vlessNode, ips) {
    const updatedNodes = [];

    ips.forEach(({ ip, port }) => {
        const parts = vlessNode.split('@');
        if (parts.length < 2) return;

        const addressPart = parts[1].split('?')[0];
        const oldAddressPort = addressPart.split(':');
        if (oldAddressPort.length < 2) return;

        const newAddressPort = port ? `${ip}:${port}` : `${ip}:${oldAddressPort[1]}`;
        const newNode = vlessNode.replace(`${oldAddressPort[0]}:${oldAddressPort[1]}`, newAddressPort);
        updatedNodes.push(newNode);
    });

    return updatedNodes;
}

// 构建纯文本内容，显示替换结果
function buildTextResponse(updatedNodes) {
    return updatedNodes.flat().join('\n').trim();
}

// 主逻辑处理
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 从 URL 路径中提取 token
    const token = path.split('/')[1]; // 提取 "your-token"

    if (token !== AUTH_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 获取 VLESS 节点数据
        const vlessNodes = await fetchVLESSNodes();

        // 获取所有优选 IP 和端口
        const preferredIPs = await fetchPreferredIPs();

        // 如果没有 IP 数据，直接返回源内容
        if (!preferredIPs) {
            return new Response(vlessNodes.join('\n'), {
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // 对每个 VLESS 节点替换所有 IP 和端口
        const allUpdatedNodes = vlessNodes.map(node => replaceVLESSNode(node, preferredIPs));

        // 生成纯文本内容并返回
        const textResponse = buildTextResponse(allUpdatedNodes);
        return new Response(textResponse, {
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}
