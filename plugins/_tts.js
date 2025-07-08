import fetch from 'node-fetch'

let handler = async (m, { conn, args, command }) => {
  const vocesDisponibles = [
    'optimus_prime',
    'eminem',
    'taylor_swift',
    'nahida',
    'miku',
    'nami',
    'goku',
    'ana',
    'elon_musk',
    'mickey_mouse',
    'kendrick_lamar',
    'angela_adkinsh'
  ]

  if (args.length < 2) {
    return m.reply(`✐ Uso correcto:\n.${command} <voz> <texto>\n\n❐ Voces disponibles:\n${vocesDisponibles.join(', ')}`)
  }

  const voiceModel = args[0].toLowerCase()
  const text = args.slice(1).join(' ')

  if (!vocesDisponibles.includes(voiceModel)) {
    return m.reply(`✐ Voz "${voiceModel}" no encontrada.\n❐ Voces disponibles:\n${vocesDisponibles.join(', ')}`)
  }

  try {
    const res = await fetch(`https://zenzxz.dpdns.org/tools/text2speech?text=${encodeURIComponent(text)}`)
    const json = await res.json()

    if (!json.status || !Array.isArray(json.results)) {
      return m.reply('✦ Error al obtener datos de la API.')
    }

    const voice = json.results.find(v => v.model === voiceModel)
    if (!voice || !voice.audio_url) {
      return m.reply('✿ No se pudo generar el audio con esa voz.')
    }

    const audioRes = await fetch(voice.audio_url)
    const audioBuffer = await audioRes.arrayBuffer()

    await conn.sendMessage(m.chat, {
      audio: Buffer.from(audioBuffer),
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply('✐ Ocurrió un error al generar el audio.')
  }
}

handler.command = /^ttsx$/i
export default handler