import ws from 'ws'

let handler = async (m, { conn }) => {
  let uniqueUsers = new Map()

  if (!global.conns || !Array.isArray(global.conns)) global.conns = []

  // Agrega los subs activos al mapa
  for (const connSub of global.conns) {
    if (connSub.user && connSub.ws?.socket?.readyState !== ws.CLOSED) {
      const jid = connSub.user.jid
      const numero = jid?.split('@')[0]

      // Intenta obtener el nombre real desde WhatsApp
      let nombre = connSub.user.name
      if (!nombre && typeof conn.getName === 'function') {
        try {
          nombre = await conn.getName(jid)
        } catch {
          nombre = `Usuario ${numero}`
        }
      }

      uniqueUsers.set(jid, nombre || `Usuario ${numero}`)
    }
  }

  const uptime = process.uptime() * 1000
  const formatUptime = clockString(uptime)
  const totalUsers = uniqueUsers.size

  let txt = `✨ *Sub-Bots Activos de SYA Team Bot* ✨\n\n`
  txt += `> ⚜️ *Tiempo activo:* ${formatUptime}\n`
  txt += `> 🤖 *Subs conectados:* ${totalUsers}\n`

  if (totalUsers > 0) {
    txt += `\n✨ *Lista de Sub-Bots Conectados:* ✨\n\n`
    let i = 1
    for (const [jid, nombre] of uniqueUsers) {
      const numero = jid.split('@')[0]
      txt += `✦ *${i++}.* ${nombre}\n> ❀ wa.me/${numero}\n\n`
    }
  } else {
    txt += `\n> ❀ No hay subbots conectados por ahora.`
  }

  await conn.reply(m.chat, txt.trim(), m)
}

handler.command = ['listjadibot', 'bots']
handler.help = ['bots']
handler.tags = ['serbot']
export default handler

function clockString(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}