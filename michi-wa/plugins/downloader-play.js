import fetch from 'node-fetch'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) return m.reply(`✐ Ingresa un texto para buscar en YouTube\n> *Ejemplo:* ${usedPrefix + command} ozuna`)

  try {
    // 🔍 Buscar video con Delirius API
    let searchRes = await fetch(`https://delirius-apiofc.vercel.app/search/ytsearch?q=${encodeURIComponent(text)}`)
    let search = await searchRes.json()

    if (!search.data || !search.data.length) return m.reply('❌ No se encontraron resultados.')

    let result = search.data[0]

    // 🧾 Mostrar info del video
    let info = `*「✦」 ${result.title}*\n\n` +
               `> ✦ *Canal:* ${result.author?.name || 'Desconocido'}\n` +
               `> ⴵ *Duración:* ${result.duration || 'Desconocida'}\n` +
               `> ✰ *Vistas:* ${result.views || 'Desconocidas'}\n` +
               `> ✐ *Publicado:* ${result.publishedAt || 'Desconocida'}\n` +
               `> 🜸 *Link:* ${result.url}`

    if (result.image) {
      await conn.sendMessage(m.chat, { image: { url: result.image }, caption: info }, { quoted: m })
    } else {
      await m.reply(info)
    }

    // 🎧 Descargar audio usando la API de Adonix
    let r = await fetch(`https://theadonix-api.vercel.app/api/ytmp3?url=${encodeURIComponent(result.url)}`)
    let json = await r.json()

    if (!json?.result?.audio) {
      return m.reply('❌ No se pudo obtener el audio del video.')
    }

    let audioUrl = json.result.audio
    let filename = json.result.filename || 'audio.mp3'

    // 🗣️ Descargar el buffer
    let audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error('No se pudo descargar el archivo de audio.')

    let audioBuffer = await audioRes.buffer()

    // 🎤 Enviar como nota de voz
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: filename,
      ptt: true
    }, { quoted: m })

  } catch (e) {
    m.reply(`❌ Error: ${e.message}`)
    await m.react('✖️')
  }
}


