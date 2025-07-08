let handler = async (m, { conn }) => {
  let name = 'Ado'
  let number = '50493732693' // sin @ ni nada

  // Crear vCard de contacto
  let vcard = `
BEGIN:VCARD
VERSION:3.0
N:${name}
FN:${name}
TEL;type=CELL;type=VOICE;waid=${number}:${number}
END:VCARD
`.trim()

  // Enviar contacto como tarjeta
  await conn.sendMessage(m.chat, {
    contacts: {
      displayName: name,
      contacts: [
        {
          vcard,
        },
      ],
    },
  }, { quoted: m })

  // Enviar mensaje adicional elegante
  await conn.sendMessage(m.chat, {
    text: `
━━ 👑 *Creador del Bot* 👑 ━━

📛 *Nombre:* ${name}
📞 *Número:* wa.me/${number}
🛠️ *Proyecto:* Bot de WhatsApp desde 0

📬 Puedes escribirle si necesitas ayuda o soporte técnico.
`.trim()
  }, { quoted: m })
}

handler.help = ['creador']
handler.tags = ['info']
handler.command = ['creador', 'owner', 'creator']

export default handler