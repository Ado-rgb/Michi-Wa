import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`📢 Usa el comando así:\n\n${usedPrefix + command} Hola.`)

  // Reacción de espera 🌀
  await conn.sendMessage(m.chat, {
    react: {
      text: '🎙️',
      key: m.key
    }
  })

  let voice = 'Jorge'
  let api = `https://apis-starlights-team.koyeb.app/starlight/loquendo?text=${encodeURIComponent(text)}&voice=${voice}`

  try {
    const res = await fetch(api)
    const json = await res.json()

    if (!json.audio) return m.reply('❌ No se pudo generar el audio.')

    await conn.sendMessage(m.chat, {
      audio: Buffer.from(json.audio, 'base64'),
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply('⚠️ Error generando el audio.')
  }
}

handler.command = ['tts']
handler.help = ['tts <texto>']
handler.tags = ['tools']
export default handler