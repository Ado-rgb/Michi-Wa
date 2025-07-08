import axios from 'axios'

const handler = async (m, { conn, args, usedPrefix, text, command }) => {
  if (!text) return m.reply(`✐ Ingresa una búsqueda para TikTok\n> *Ejemplo:* ${usedPrefix + command} haikyuu edit`)

  let res = await fetch(`https://apizell.web.id/download/tiktokplay?q=${encodeURIComponent(text)}`)
  let json = await res.json()

  if (!json.status || !json.data || !json.data.length) return m.reply('❌ No se encontró ningún video.')

  let vid = json.data[0]

  let caption = `「💜」*${vid.title}*\n\n` +
                `> ✦ *Autor:* » ${vid.author}\n` +
                `> ✰ *Vistas:* » ${vid.views.toLocaleString()}\n` +
                `> 🜸 *Link:* » ${vid.url}`

  await conn.sendMessage(m.chat, {
    video: { url: vid.url },
    caption
  }, { quoted: m })
}

handler.help = ['tiktokvid']
handler.tags = ['downloader']
handler.command = ['tiktokvid', 'playtiktok']

export default handler