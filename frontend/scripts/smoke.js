const http = require('http')

const urls = [
  'http://localhost:5173/',
  'http://localhost:5173/transactions',
  'http://localhost:5173/budget',
  'http://localhost:5173/goals',
  'http://localhost:5173/chat',
  'http://localhost:5173/profile',
]

;(async () => {
  for (const u of urls) {
    await new Promise((resolve) => {
      http.get(u, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          console.log(u, res.statusCode, (d || '').toString().slice(0, 140).replace(/\n/g, ' '))
          resolve()
        })
      }).on('error', (e) => {
        console.log(u, 'ERR', e.message)
        resolve()
      })
    })
  }
})()
