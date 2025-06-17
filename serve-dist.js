const fs = require('fs')
const path = require('path')
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = 4200

if (fs.existsSync('tmp-webapp')) fs.rmSync('tmp-webapp', { recursive: true })
fs.mkdirSync('tmp-webapp', { recursive: true })

try {
    fs.symlinkSync(path.resolve('dist/browser'), path.resolve('tmp-webapp/webapp'), 'junction')
} catch {
    fs.cpSync('dist/browser', 'tmp-webapp/webapp', { recursive: true })
}

app.use(
    '/api',
    createProxyMiddleware({
        target: 'http://localhost:80',
        changeOrigin: true,
        pathRewrite: pathname => `/api${pathname}`
    })
)

app.use(express.static('tmp-webapp'))
app.get('/webapp/*', (req, res) => {
    res.sendFile(path.resolve('tmp-webapp/webapp/index.html'))
})

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/webapp/`)
})

process.on('SIGINT', () => {
    if (fs.existsSync('tmp-webapp')) fs.rmSync('tmp-webapp', { recursive: true })
    process.exit()
})
