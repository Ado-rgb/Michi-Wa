import FormData from "form-data"
import Jimp from "jimp"
import fs from 'fs'
import path from 'path'

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    await m.react('🕓')

    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime) return conn.reply(m.chat, `◥◤ *Envía o responde una imagen para mejorarla de calidad.*`, m)
    if (!/image\/(jpe?g|png)/.test(mime)) return m.reply(`✎ *El archivo no es compatible.*\nFormato detectado: ${mime}`)

    conn.reply(m.chat, `> ✦ *Mejorando la calidad...*`, m)

    const img = await q.download?.()
    const pr = await remini(img, "enhance")

    // Obtener el nombre del subbot si lo tiene
    let nombreBot = global.namebot || '✧ Michi Wa ✧'
    try {
      const botNumber = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
      const configPath = path.join('./JadiBots', botNumber, 'config.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        if (config.name) nombreBot = config.name
      }
    } catch (err) {
      console.log('⚠️ No se pudo leer config del subbot:', err)
    }

    let caption = `
╭━━━━━━ ∘☽༓☾∘ ━━━━━━╮
  ✧ Imagen mejorada con éxito
╰━━━━━━━━━━━━━━━━━╯

☄︎ *Proceso :* Mejora de calidad
✩ *Resultado :* Imagen HD

> ✦ 𝖤𝗇𝗁𝖺𝗇𝖼𝖾𝖽 𝖡𝗒 *${nombreBot}*
    `.trim()

    await conn.sendFile(m.chat, pr, 'imagen_hd.jpg', caption, m)
    await m.react('✅')
  } catch (e) {
    console.error(e)
    await conn.reply(m.chat, '❌ *Error al mejorar la imagen. Intentá más tarde.*', m)
    await m.react('✖️')
  }
}

handler.help = ["hd"]
handler.tags = ["tools"]
handler.command = ["remini", "hd", "enhance"]

export default handler

async function remini(imageData, operation) {
  return new Promise((resolve, reject) => {
    const allowedOps = ["enhance", "recolor", "dehaze"]
    operation = allowedOps.includes(operation) ? operation : "enhance"

    const baseUrl = `https://inferenceengine.vyro.ai/${operation}.vyro`
    const formData = new FormData()

    formData.append("image", Buffer.from(imageData), {
      filename: "enhance_image_body.jpg",
      contentType: "image/jpeg"
    })

    formData.append("model_version", 1, {
      "Content-Transfer-Encoding": "binary",
      contentType: "multipart/form-data; charset=utf-8"
    })

    formData.submit({
      url: baseUrl,
      host: "inferenceengine.vyro.ai",
      path: "/" + operation,
      protocol: "https:",
      headers: {
        "User-Agent": "okhttp/4.9.3",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      }
    }, function (err, res) {
      if (err) return reject(err)
      const chunks = []
      res.on("data", chunk => chunks.push(chunk))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    })
  })
}