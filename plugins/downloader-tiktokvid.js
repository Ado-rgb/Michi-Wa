import fetch from 'node-fetch'; // Usar node-fetch si axios no es estrictamente necesario para un GET simple
import chalk from 'chalk';

/**
 * @description Busca y descarga videos de TikTok basados en un texto de búsqueda.
 * Envía el primer video encontrado.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 * @param {string} text El texto de búsqueda para TikTok.
 */
const handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `📹 *Descargador de Videos TikTok*\n\n` +
      `Por favor, ingresa el término de búsqueda para encontrar un video en TikTok.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <término de búsqueda>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} baile viral 2023\``,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `📹 Buscando tu video de TikTok: "_${text}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    // API para buscar y obtener datos del video de TikTok.
    // Nota: La estabilidad de APIs gratuitas puede variar.
    const apiUrl = `https://apizell.web.id/download/tiktokplay?q=${encodeURIComponent(text)}`;
    // console.log(chalk.blueBright('[TIKTOKVID DEBUG] API URL:'), apiUrl);
    const res = await fetch(apiUrl);

    if (!res.ok) {
      throw new Error(`Error al contactar la API de TikTok (HTTP ${res.status}): ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.status || json.status !== 'Playing Now' || !json.data || json.data.length === 0) {
      // console.warn(chalk.yellowBright('[TIKTOKVID WARNING] No se encontraron videos o respuesta inesperada:'), JSON.stringify(json, null, 2));
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, `❌ No se encontraron videos de TikTok para tu búsqueda: "_${text}_".\nIntenta con otros términos.`, m, { ...global.rcanal });
    }

    const videoData = json.data[0]; // Tomar el primer video

    if (!videoData.url || !videoData.title) {
        console.warn(chalk.yellowBright('[TIKTOKVID WARNING] Datos del video incompletos:'), JSON.stringify(videoData, null, 2));
        await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
        return conn.reply(m.chat, '❌ La API devolvió datos incompletos para el video. No se puede procesar.', m, { ...global.rcanal });
    }

    const caption =
      `📹 *Video de TikTok Encontrado*\n\n` +
      `✨ *Título:* ${videoData.title}\n` +
      `👤 *Autor:* @${videoData.author || 'Desconocido'}\n` +
      `👁️ *Vistas:* ${videoData.views ? Number(videoData.views).toLocaleString() : 'N/A'}\n` +
      // `👍 *Likes:* ${videoData.likes ? Number(videoData.likes).toLocaleString() : 'N/A'}\n` + // Si la API lo proporciona
      // `💬 *Comentarios:* ${videoData.comments ? Number(videoData.comments).toLocaleString() : 'N/A'}\n` + // Si la API lo proporciona
      `🔗 *Enlace Original:* ${videoData.url_original || videoData.url}\n\n` + // `url_original` si existe, sino `url`
      `⬇️ Enviando video...`;

    // Enviar información primero (opcional, o enviar todo junto con el video)
    // await conn.reply(m.chat, caption, m, { ...global.rcanal });

    await conn.sendMessage(m.chat, {
      video: { url: videoData.url }, // URL directa al video proporcionada por la API
      caption: caption,
      mimetype: 'video/mp4', // Asumir mp4, la API debería indicarlo si es diferente
      // fileName: `${videoData.title.replace(/[<>:"/\\|?*]+/g, '')}.mp4` // Nombre de archivo opcional
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[TIKTOKVID PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al descargar el video de TikTok:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta más tarde.`,
      m, { ...global.rcanal }
    );
  }
};

handler.help = ['tiktokvid <búsqueda>', 'playtiktok <búsqueda> (Busca y envía video de TikTok)'];
handler.tags = ['downloader', 'tiktok'];
handler.command = ['tiktokvid', 'playtiktok', 'ttvid', 'tiktoksearch'];
handler.register = true;
handler.limit = true; // Descargas suelen consumir APIs

export default handler;