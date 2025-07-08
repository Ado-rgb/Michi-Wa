import fs from 'fs'
import path from 'path'

const defaultName = '✧ ʏᴜʀᴜ ʏᴜʀɪ ✧'

export async function aplicarNombrePersonalizado(conn) {
  const botActual = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
  const configPath = path.join('./JadiBots', botActual, 'config.json')

  let nombreBot = defaultName
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.name) nombreBot = config.name
    } catch (err) {
      console.log('⚠️ No se pudo leer config del subbot:', err)
    }
  }
  return nombreBot
}