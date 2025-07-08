import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const jadiPath = './JadiBots'
  let listaSubs = []

  // Verifica que exista la carpeta de subbots
  if (fs.existsSync(jadiPath)) {
    const carpetas = fs.readdirSync(jadiPath).filter(f => fs.statSync(path.join(jadiPath, f)).isDirectory())

    for (const carpeta of carpetas) {
      const configPath = path.join(jadiPath, carpeta, 'config.json')
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          const nombre = config.name || '❀ Sin nombre personalizado'
          const numero = carpeta
          listaSubs.push({ numero, nombre })
        } catch (e) {
          console.log(`✘ Error leyendo config en sub: ${carpeta}`)
        }
      }
    }
  }

  if (!listaSubs.length) {
    return conn.reply(m.chat, `
❀ *Subs Personalizados* ✦

> ✦ No hay subs personalizados activos.
> ❀ Usa *.serbot* para crear uno.
`.trim(), m)
  }

  let msg = `❀ *Subs Personalizados Activos:* ✦\n\n`
  listaSubs.forEach((s, i) => {
    msg += `✦ *${i + 1}.* ${s.nombre}\n`
    msg += `> ❀ *Número:* wa.me/${s.numero}\n\n`
  })

  msg += `✦ ❀ *Total:* ${listaSubs.length}`

  await conn.reply(m.chat, msg.trim(), m)
}

handler.help = ['sublist']
handler.tags = ['serbot']
handler.command = ['sublist']

export default handler