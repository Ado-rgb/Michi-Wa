import fetch from 'node-fetch';
import chalk from 'chalk';

// Regex para validar URLs de Instagram (posts y reels)
const instagramUrlRegex = /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/(?:p|reel|tv)\/)([\w-]+)\/?/i;

/**
 * @description Descarga videos o reels de Instagram a partir de un enlace URL.
 * Este plugin debería idealmente llamarse 'downloader-instagram.js' o similar.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El enlace URL del post o reel de Instagram.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `📲 *Descargador de Instagram*\n\n` +
      `Por favor, proporciona el enlace URL de un post o reel de Instagram.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <enlace_instagram>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} https://www.instagram.com/p/Cxyz123/\``,
      m, { ...global.rcanal }
    );
  }

  const url = text.trim();
  if (!instagramUrlRegex.test(url)) {
    return conn.reply(m.chat,
      `⚠️ El enlace proporcionado no parece ser un enlace válido de Instagram (post o reel).\n` +
      `Asegúrate de que sea como: \`https://www.instagram.com/p/XXXXX/\` o \`https://www.instagram.com/reel/XXXXX/\``,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `📥 Descargando contenido de Instagram: "_${url}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    // API para descargar de Instagram.
    // Nota: La estabilidad de APIs gratuitas puede variar.
    const apiUrl = `https://api.dorratz.com/igdl?url=${encodeURIComponent(url)}`;
    // console.log(chalk.blueBright('[INSTAGRAM DL DEBUG] API URL:'), apiUrl);
    const res = await fetch(apiUrl);

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (_) {}
      throw new Error(`Error al contactar la API de Instagram (HTTP ${res.status}): ${res.statusText}. ${errorBody || ''}`);
    }

    const json = await res.json();

    if (!json.status || !json.data || (Array.isArray(json.data) && json.data.length === 0)) {
      console.warn(chalk.yellowBright('[INSTAGRAM DL WARNING] No se encontró contenido o respuesta inesperada:'), JSON.stringify(json, null, 2));
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, `❌ No se pudo obtener contenido del enlace de Instagram proporcionado. Verifica el enlace o intenta más tarde.`, m, { ...global.rcanal });
    }

    // La API puede devolver un array de media (ej. carruseles)
    const mediaItems = Array.isArray(json.data) ? json.data : [json.data];
    let successCount = 0;

    for (const media of mediaItems) {
      if (!media.url) {
        console.warn(chalk.yellowBright('[INSTAGRAM DL WARNING] Media item sin URL:'), JSON.stringify(media));
        continue; // Saltar este item si no tiene URL
      }

      const caption = `✅ Contenido de Instagram Descargado\n✨ Powered by ${global.namebot || 'SYA Team Bot'}`;
      const fileName = `instagram_${command}_${Date.now()}` + (media.type === 'video' ? '.mp4' : '.jpg');

      try {
        if (media.type === 'video' || media.url.includes('.mp4')) { // Asumir video si el tipo es video o la URL lo indica
          await conn.sendMessage(m.chat, {
            video: { url: media.url },
            mimetype: 'video/mp4',
            fileName: fileName,
            caption: caption,
            // thumbnail: media.thumbnail ? await (await fetch(media.thumbnail)).buffer() : null // Opcional
          }, { quoted: m, ...global.rcanal });
        } else if (media.type === 'image' || media.url.includes('.jpg') || media.url.includes('.jpeg') || media.url.includes('.png')) { // Asumir imagen
           await conn.sendMessage(m.chat, {
            image: { url: media.url },
            mimetype: media.url.includes('.png') ? 'image/png' : 'image/jpeg',
            fileName: fileName,
            caption: caption,
          }, { quoted: m, ...global.rcanal });
        } else {
            // Si no es ni video ni imagen claramente identificable, intentar enviar como documento o notificar
            console.warn(chalk.yellowBright('[INSTAGRAM DL WARNING] Tipo de media no reconocido o URL no específica:'), media.type, media.url);
            // Por ahora, se omite este tipo de media para evitar errores.
            // Se podría intentar enviar como documento:
            // await conn.sendFile(m.chat, media.url, fileName, caption, m);
        }
        successCount++;
      } catch (sendError) {
         console.error(chalk.redBright(`[INSTAGRAM DL SEND ERROR] Error enviando media ${media.url}:`), sendError);
         // No enviar error al chat por cada item fallido para no spamear, el error general cubrirá.
      }
    }

    if (successCount > 0) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      if (mediaItems.length > 1 && successCount < mediaItems.length) {
        await conn.reply(m.chat, `ℹ️ Se descargaron ${successCount} de ${mediaItems.length} elementos del post/reel. Algunos podrían no ser soportados.`, m, { ...global.rcanal });
      }
    } else {
        throw new Error('No se pudo procesar ningún elemento multimedia del enlace.');
    }

  } catch (e) {
    console.error(chalk.redBright('[INSTAGRAM DL PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al descargar el contenido de Instagram:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, verifica el enlace o intenta más tarde.`,
      m, { ...global.rcanal }
    );
  }
};

handler.help = ['ig <enlace_ig>', 'instagram <enlace_ig> (Descarga post/reel de Instagram)'];
handler.tags = ['downloader', 'instagram'];
handler.command = ['ig', 'instagram', 'igdl', 'instagramdl'];
handler.register = true;
handler.limit = true;

export default handler;