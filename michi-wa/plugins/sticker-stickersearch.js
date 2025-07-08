import fetch from 'node-fetch'
import { Sticker } from 'wa-sticker-formatter'

let handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`✐ Ejemplo de uso:\n❀ .${command} cats`)

  try {
    let resBusqueda = await fetch(`https://zenzxz.dpdns.org/search/stickerlysearch?query=${encodeURIComponent(text)}`)
    let jsonBusqueda = await resBusqueda.json()

    if (!jsonBusqueda.status || !Array.isArray(jsonBusqueda.data) || jsonBusqueda.data.length === 0) {
      return m.reply('✿ No encontré stickers con ese nombre ✦')
    }

    let elegido = jsonBusqueda.data[Math.floor(Math.random() * jsonBusqueda.data.length)]
    let resDetalle = await fetch(`https://zenzxz.dpdns.org/tools/stickerlydetail?url=${encodeURIComponent(elegido.url)}`)
    let jsonDetalle = await resDetalle.json()

    if (!jsonDetalle.status || !jsonDetalle.data || !Array.isArray(jsonDetalle.data.stickers) || jsonDetalle.data.stickers.length === 0) {
      return m.reply('✦ Ocurrió un error al traer los stickers ✐')
    }

    let nombrePack = jsonDetalle.data.name || 'Sin nombre'
    let autorPack = jsonDetalle.data.author?.name || 'Desconocido'

    await m.reply(`❐ Se encontraron 5 stickers de:\n✧ *${nombrePack}*\n por ✿ *${autorPack}*`)

    let maxStickers = 5
    for (let i = 0; i < Math.min(jsonDetalle.data.stickers.length, maxStickers); i++) {
      let img = jsonDetalle.data.stickers[i]
      let sticker = new Sticker(img.imageUrl, {
        pack: `✐ ${namebot}`,
        author: `✦ ${author}`,
        type: 'full',
        categories: ['✨', '💫', '❀'],
        id: 'stickerly-zenz'
      })
      let buffer = await sticker.toBuffer()
      await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
    }

  } catch (err) {
    console.error(err)
    m.reply('❀ Ups... ocurrió un error al procesar los stickers ✧')
  }
}

handler.help = ['stickersearch *<texto>*']
handler.tags = ['sticker']
handler.command = ['stickersearch']
export default handler
