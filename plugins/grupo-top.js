import util from 'util'
import path from 'path'
let user = a => '@' + a.split('@')[0]

function handler(m, { groupMetadata, command, conn, text }) {
  if (!text) return conn.reply(m.chat, ` Ingresa algo we ¿top de qué? *Ej: ${command} guapos*`, m)

  let ps = groupMetadata.participants.map(v => v.id)
  let [a, b, c, d, e, f, g, h, i, j] = Array.from({ length: 10 }, () => ps.getRandom())
  let emoji = pickRandom(['💦','🍑','🔥','😩','🥵','😈','😳','👅','💋','🫦','🫣','👀','💃','🤤','💀','🙄','🤑'])
  let intro = pickRandom([
    `😏 Ufff papi el TOP 10 ${text.toUpperCase()} está que arde 🔥`,
    `🥵 Hormonas activadas para este TOP 10 ${text}`,
    `😳 Resultados basados en estudios científicos de la universidad de la mamalonería`,
    `😈 El destino habló... este es el TOP 10 ${text} más random y sabrosón`,
    `🤤 Gente que anda rompiendo el grupo en *${text}* 🫦`,
    `💃 Y aquí los que andan bien fuertes en ${text} 👀`,
    `👀 Se filtró la lista más esperada del grupo 🔥 TOP 10 ${text}`,
  ])
  
  let top = `*${emoji} ${intro} ${emoji}*\n\n` +
    `*1. ${user(a)} 🔥*\n` +
    `*2. ${user(b)} 😏*\n` +
    `*3. ${user(c)} 💥*\n` +
    `*4. ${user(d)} 🤤*\n` +
    `*5. ${user(e)} 😳*\n` +
    `*6. ${user(f)} 💋*\n` +
    `*7. ${user(g)} 👀*\n` +
    `*8. ${user(h)} 🫦*\n` +
    `*9. ${user(i)} 🥵*\n` +
    `*10. ${user(j)} 💦*`

  conn.reply(m.chat, top, m, { mentions: [a,b,c,d,e,f,g,h,i,j] })
}

handler.help = ['top *<texto>*']
handler.command = ['top']
handler.tags = ['group']
handler.group = true
handler.register = false

export default handler

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}