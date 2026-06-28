const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 53658;
const ROOT = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? 'hr-demo.html' : decodeURIComponent(req.url));

    // 防止目录遍历
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + req.url);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
        });
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  HR Gantt Demo 本地服务器已启动');
    console.log('========================================');
    console.log('');
    console.log('  访问地址:');
    console.log('    http://localhost:' + PORT + '/hr-demo.html');
    console.log('    http://127.0.0.1:' + PORT + '/hr-demo.html');
    console.log('');
    console.log('  按 Ctrl+C 停止服务');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('[错误] 端口 ' + PORT + ' 已被占用');
    } else {
        console.error('[错误] 服务器启动失败:', err.message);
    }
    process.exit(1);
});
