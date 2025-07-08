import axios from 'axios'
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, usedPrefix, text, command }) => {
  if (!text) return conn.reply(m.chat, `
❀ *Michi-Wa* ✦

> ✦ Escribe el nombre de un video.
> ❀ *Ejemplo:*
> *${usedPrefix + command} lofi anime*
`.trim(), m, rcanal)

  await m.react('🔍')

  // Detectar nombre del bot o subbot personalizado
  const botJid = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
  const configPath = path.join('./JadiBots', botJid, 'config.json')

  let nombreBot = global.namebot || '✦ Michi-Wa ✦'
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.name) nombreBot = config.name
    } catch (err) {
      console.log('❌ Error leyendo config del subbot:', err)
    }
  }

  const imgPath = './storage/img/ytsearch.jpg'

  try {
    const { data } = await axios.get(`https://api.starlights.uk/api/search/youtube?q=${encodeURIComponent(text)}`)
    const results = data?.result || []

    if (!results.length) {
      await conn.reply(m.chat, `
✦ *Lo siento...* ❀

> ✦ No encontré resultados para tu búsqueda.
> ❀ Intenta con otro nombre.
`.trim(), m, rcanal)
      await m.react('❌')
      return
    }

    let textMsg = `❀ *Resultados encontrados para:* *${text}*\n\n`

    results.slice(0, 10).forEach((video, i) => {
      textMsg += `✦ *${i + 1}.* ${video.title?.slice(0, 45)}\n`
      textMsg += `> ❀ *Duración:* ${video.duration || '-'}\n`
      textMsg += `> ❀ *Canal:* ${video.uploader?.slice(0, 35) || '-'}\n`
      textMsg += `> ❀ *Link:* ${video.link}\n\n`
    })

    textMsg += `✦ *By ${nombreBot}* 🐾`

    const isUrl = /^https?:\/\//.test(imgPath)
    const messagePayload = isUrl ? { image: { url: imgPath } } : { image: fs.readFileSync(imgPath) }

    await conn.sendMessage(m.chat, {
      ...messagePayload,
      caption: textMsg.trim(),
      mentionedJid: conn.parseMention(textMsg),
      ...rcanal
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.error(e)
    await conn.reply(m.chat, `
✦ *Ups... hubo un error* ❀

> ✦ No se pudo completar la búsqueda.
> ❀ Intenta más tarde porfa...

`.trim(), m, rcanal)
    await m.react('💥')
  }
}

handler.tags = ['search']
handler.help = ['yts']
handler.command = ['youtubesearch', 'youtubes', 'yts']

export default handler