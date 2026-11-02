import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const SERVER_ENV_KEYS = [
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'SESSION_SECRET',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REPORT_GITHUB_TOKEN',
  'REPORT_REPO',
]

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Runs the Vercel Functions in api/ during `npm run dev`, so sign-in can be
// tested locally without the Vercel CLI. On Vercel they run natively, and
// vercel.json maps /auth/* to api/auth/* the same way this does.
function vercelFunctions() {
  return {
    name: 'vercel-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost')
        const route = pathname.replace(/^\/auth\//, '/api/auth/')

        // Lowercase segments only: no "..", and "_lib" helpers stay private.
        if (!/^\/api(\/[a-z0-9-]+)+$/.test(route)) return next()

        const file = fileURLToPath(new URL(`.${route}.js`, import.meta.url))
        if (!existsSync(file)) return next()

        try {
          const handler = (await server.ssrLoadModule(file))[req.method]
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }

          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const response = await handler(
            new Request(`http://${req.headers.host}${req.url}`, {
              method: req.method,
              headers: req.headers,
              body: hasBody ? await readBody(req) : undefined,
            }),
          )

          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie()
          if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Hand the server-side settings from .env.local to the functions above. They
  // never reach the browser: Vite only exposes VITE_-prefixed variables.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [react(), vercelFunctions()],
  }
})
