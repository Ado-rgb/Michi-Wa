import fetch from 'node-fetch';
import chalk from 'chalk';

const tiktokUrlRegex = /^(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/[\d]+|vm\.tiktok\.com\/[\w]+)/i;

/**
 * @description Descarga videos de TikTok directamente desde un enlace URL.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El enlace URL del video de TikTok.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `📹 *Descargador de Videos TikTok (Enlace Directo)*\n\n` +
      `Por favor, proporciona el enlace URL del video de TikTok que deseas descargar.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <enlace_tiktok>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} https://vm.tiktok.com/example123\``,
      m, { ...global.rcanal }
    );
  }

  if (!tiktokUrlRegex.test(text)) {
    return conn.reply(m.chat,
      `⚠️ El enlace proporcionado no parece ser un enlace válido de TikTok. Asegúrate de que sea correcto.`,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `📥 Descargando tu video de TikTok... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    // API para descargar desde enlace de TikTok.
    // Nota: La estabilidad de APIs gratuitas puede variar.
    const apiUrl = `https://theadonix-api.vercel.app/api/tiktok?url=${encodeURIComponent(text.trim())}`;
    // console.log(chalk.blueBright('[TIKTOK DL DEBUG] API URL:'), apiUrl);
    const res = await fetch(apiUrl);

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (_) {}
      throw new Error(`Error al contactar la API de descarga de TikTok (HTTP ${res.status}): ${res.statusText}. ${errorBody || ''}`);
    }

    const json = await res.json();
    const videoData = json?.result; // 'r' era un poco ambiguo

    if (!videoData?.video || !videoData?.title) { // Verificar campos esenciales
      console.warn(chalk.yellowBright('[TIKTOK DL WARNING] Respuesta de API incompleta o sin video:'), JSON.stringify(json, null, 2));
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, '❌ No se pudo obtener el video desde el enlace proporcionado. La API podría no haber encontrado el video o falló.', m, { ...global.rcanal });
    }

    const caption =
      `📹 *Video de TikTok Descargado*\n\n` +
      `✨ *Título:* ${videoData.title}\n` +
      `👤 *Autor:* @${videoData.author?.username || videoData.author?.name || 'Desconocido'}\n` +
      `⏱️ *Duración:* ${videoData.duration || 'N/A'} segundos\n` +
      `👍 *Likes:* ${videoData.likes ? Number(videoData.likes).toLocaleString() : 'N/A'}\n\n` +
      `✨ Powered by ${global.namebot || 'SYA Team Bot'}`;

    // Opcional: Enviar thumbnail primero si se desea, pero puede ser redundante si el video carga rápido.
    // if (videoData.thumbnail) {
    //   await conn.sendMessage(m.chat, { image: { url: videoData.thumbnail }, caption: `🖼️ Miniatura del video:\n${videoData.title}` }, { quoted: m, ...global.rcanal });
    // }

    await conn.sendMessage(m.chat, {
      video: { url: videoData.video },
      mimetype: 'video/mp4',
      fileName: `${(videoData.author?.username || 'tiktok_video').replace(/[<>:"/\\|?*]+/g, '')}.mp4`,
      caption: caption,
      mentions: [m.sender]
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[TIKTOK DL PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al procesar el enlace de TikTok:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, verifica el enlace o intenta más tarde.`,
      m, { ...global.rcanal }
    );
  }
};

handler.help = ['tiktok <enlace_tiktok>', 'tt <enlace_tiktok> (Descarga video de TikTok)'];
handler.tags = ['downloader', 'tiktok'];
handler.command = ['ttdl', 'tt', 'tiktok', 'tiktokdl', 'tiktokdownload'];
handler.register = true;
handler.limit = true;

export default handler;
