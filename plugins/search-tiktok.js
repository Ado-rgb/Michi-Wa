import axios from 'axios'
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) return conn.reply(m.chat, `
*📱 Decime qué video de TikTok querés buscar we*

Ejemplo:
${usedPrefix + command} baile divertido
`.trim(), m, rcanal)

  await m.react('🕓')

  let img = './storage/img/menu.jpg'

  // Sacar nombre del sub-bot si tiene config
  let nombreBot = global.namebot || '✨ SYA Team Bot ✨'
  try {
    const botActual = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
    const configPath = path.join('./JadiBots', botActual, 'config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.name) nombreBot = config.name
    }
  } catch (err) {
    console.log('⚠️ No se pudo leer config del subbot:', err)
  }

  try {
    const { data } = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(text)}`)
    const results = data?.data || []

    if (results.length === 0) {
      return conn.reply(m.chat, '❌ No encontré ningún video con ese nombre, probá con otra búsqueda.', m, rcanal)
    }

    let txt = `✦ *Resultados TikTok* ✦\n┃\n`

    for (let i = 0; i < Math.min(results.length, 15); i++) {
      const video = results[i]
      txt += `*${i + 1}.* ✧ ${video.title || 'Sin título'}\n❀ ${video.url}\n─────────────────────\n`
    }

    txt += `╰─────────────✦\n\n> ⚜️ Resultados por *${nombreBot}* ⚜️`

    const isURL = /^https?:\/\//i.test(img)
    const imageContent = isURL ? { image: { url: img } } : { image: fs.readFileSync(img) }

    await conn.sendMessage(m.chat, {
      ...imageContent,
      caption: txt.trim(),
      mentionedJid: conn.parseMention(txt),
      ...rcanal
    }, { quoted: m })

    await m.react('✅')
  } catch (e) {
    console.error(e)
    await conn.reply(m.chat, '❌ Error buscando TikTok, intentá luego.', m, rcanal)
    await m.react('✖️')
  }
}

handler.tags = ['search']
handler.help = ['tiktoksearch']
handler.command = ['tiktoksearch', 'tiktoks', 'tts']

export default handler