let frases = [
  'Qué onda wey, únete al mejor grupo ✧',
  'No te quedes afuera, aquí la banda se junta ❀',
  'Pura buena vibra, dale click y entra ✿',
  'No pierdas tiempo, aquí es la fiesta ☁︎',
]

let texto = frases[Math.floor(Math.random() * frases.length)]

let buttons = [
  {
    buttonId: 'join_group',
    buttonText: { displayText: '✧ Unirme al grupo' },
    type: 1
  }
]

let buttonMessage = {
  text: texto,
  footer: 'YuruYuri Bot',
  buttons: buttons,
  headerType: 1,
  // Esto hace que al tocar el botón abra el link sin mostrarlo en el mensaje
  contextInfo: {
    externalAdReply: {
      showAdAttribution: true,
      mediaUrl: 'https://chat.whatsapp.com/If3WAOMJqZp2WLqDp9n4Cw',
      mediaType: 1,
      description: 'Invitación al grupo',
      title: 'Únete a la banda',
      thumbnail: null,
      sourceUrl: 'https://chat.whatsapp.com/If3WAOMJqZp2WLqDp9n4Cw'
    }
  }
}

// En tu handler o función de comandos:
await conn.sendMessage(m.chat, buttonMessage, { quoted: m })

handler.command = ['grupo']
export default handler
