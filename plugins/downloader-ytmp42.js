import fetch from "node-fetch";
import yts from "yt-search";
import chalk from 'chalk';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/; // Expresión regular para extraer ID de YouTube

/**
 * @description Manejador multifuncional para buscar y descargar audio o video de YouTube.
 * Acepta tanto nombres de video para búsqueda como enlaces directos de YouTube.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El texto de búsqueda o enlace URL de YouTube.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado (ej. 'play', 'ytmp4').
 */
const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `▶️ *Descargador Multimedia de YouTube*\n\n` +
      `Por favor, ingresa el nombre o enlace del video de YouTube que deseas procesar.\n\n` +
      `*Uso (Audio):* \`${usedPrefix}play <nombre/enlace>\`\n` +
      `*Uso (Video):* \`${usedPrefix}ytmp4 <nombre/enlace>\`\n\n` +
      `*Ejemplo (Audio):* \`${usedPrefix}play SYA Team Mix\`\n` +
      `*Ejemplo (Video):* \`${usedPrefix}ytmp4 https://youtu.be/example123\``,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `🔎 Buscando información para: "_${text}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    let searchResult;
    const videoIdMatch = text.match(youtubeRegexID);

    if (videoIdMatch && videoIdMatch[1]) { // Si es un enlace de YouTube válido
      // console.log(chalk.blueBright('[YT DL DEBUG] Enlace detectado. ID:'), videoIdMatch[1]);
      const videoInfo = await yts({ videoId: videoIdMatch[1] });
      if (!videoInfo) throw new Error('No se pudo obtener información del enlace de YouTube proporcionado.');
      searchResult = videoInfo;
    } else { // Si es texto de búsqueda
      // console.log(chalk.blueBright('[YT DL DEBUG] Texto de búsqueda:'), text);
      const searchResults = await yts(text);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
        return conn.reply(m.chat, `❌ No se encontraron resultados para tu búsqueda: "_${text}_".`, m, { ...global.rcanal });
      }
      searchResult = searchResults.videos[0]; // Tomar el primer resultado de la búsqueda
    }

    if (!searchResult || !searchResult.url) {
        await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
        return conn.reply(m.chat, `❌ No se pudo obtener información válida del video. Intenta de nuevo.`, m, { ...global.rcanal });
    }

    // Extraer y formatear información del video
    const { title, thumbnail, timestamp, views, ago, url, author } = searchResult;
    const formattedViews = formatViews(views);
    const channelName = author?.name || 'Desconocido';

    const infoMessage =
      `🎬 *${title || 'Título no disponible'}*\n\n` +
      `👤 *Canal:* ${channelName}\n` +
      `⏱️ *Duración:* ${timestamp || 'N/A'}\n` +
      `👁️ *Vistas:* ${formattedViews}\n` +
      `📅 *Publicado:* ${ago || 'N/A'}\n` +
      `🔗 *Enlace:* ${url}`;

    // Preparar y enviar la información con thumbnail usando externalAdReply
    const thumbData = thumbnail ? (await conn.getFile(thumbnail))?.data : null;
    const adReplyOptions = {
      contextInfo: {
        externalAdReply: {
          title: `▶️ ${title || 'Reproductor de YouTube'}`,
          body: `${global.namebot || 'SYA Team Bot'} - Descargas`,
          mediaType: 1, // 1 for image
          previewType: 0, // 0 for image
          mediaUrl: url, // URL del video original
          sourceUrl: global.canal || 'https://github.com/SYA-Team/', // URL del canal o repo del bot
          thumbnail: thumbData,
          renderLargerThumbnail: true,
        },
      },
    };

    await conn.reply(m.chat, `${infoMessage}\n\n⬇️ Preparando descarga...`, m, { ...adReplyOptions, ...global.rcanal });
    await conn.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

    const isAudioCommand = ['play', 'yta', 'ytmp3', 'playaudio', 'ytaudio'].includes(command.toLowerCase());
    const isVideoCommand = ['play2', 'ytv', 'ytmp4', 'mp4', 'ytvideo', 'videoyt'].includes(command.toLowerCase());

    if (isAudioCommand) {
      // Descargar Audio
      const audioApiUrl = `https://theadonix-api.vercel.app/api/ytmp3?url=${encodeURIComponent(url)}`;
      const audioRes = await fetch(audioApiUrl);
      if (!audioRes.ok) throw new Error(`Error al obtener audio de API (HTTP ${audioRes.status})`);
      const audioJson = await audioRes.json();

      if (!audioJson?.result?.audio) {
        console.warn(chalk.yellowBright('[YT DL WARNING] API de audio no devolvió audio:'), JSON.stringify(audioJson, null, 2));
        throw new Error('No se pudo generar el audio desde la API.');
      }

      await conn.sendMessage(m.chat, {
        audio: { url: audioJson.result.audio },
        mimetype: 'audio/mpeg',
        fileName: audioJson.result.filename || `${title.replace(/[<>:"/\\|?*]+/g, '')}.mp3`,
        ptt: true // Enviar como nota de voz
      }, { quoted: m, ...global.rcanal });

    } else if (isVideoCommand) {
      // Descargar Video
      const videoApiUrl = `https://theadonix-api.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}`;
      const videoRes = await fetch(videoApiUrl);
      if (!videoRes.ok) throw new Error(`Error al obtener video de API (HTTP ${videoRes.status})`);
      const videoJson = await videoRes.json();

      if (!videoJson?.result?.video) {
        console.warn(chalk.yellowBright('[YT DL WARNING] API de video no devolvió video:'), JSON.stringify(videoJson, null, 2));
        throw new Error('No se pudo generar el video desde la API.');
      }

      await conn.sendMessage(m.chat, {
        video: { url: videoJson.result.video },
        mimetype: 'video/mp4',
        fileName: videoJson.result.filename || `${title.replace(/[<>:"/\\|?*]+/g, '')}.mp4`,
        caption: `✅ Video descargado: *${videoJson.result.title || title}*\n✨ Powered by ${global.namebot || 'SYA Team Bot'}`,
        mentions: [m.sender]
      }, { quoted: m, ...global.rcanal });

    } else {
      // Esto no debería ocurrir si los comandos están bien definidos en handler.command
      console.warn(chalk.yellowBright('[YT DL WARNING] Comando no reconocido dentro del plugin:'), command);
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, '⚙️ Opción de descarga no reconocida. Usa `.play` para audio o `.ytmp4` para video.', m, { ...global.rcanal });
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error(chalk.redBright('[YT DOWNLOADER PLUGIN ERROR]'), error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(m.chat,
      `❌ Ocurrió un error al procesar tu solicitud de YouTube:\n\n` +
      `\`${error.message || 'Error desconocido.'}\`\n\n` +
      `Asegúrate de que el enlace sea correcto o intenta con otro término de búsqueda.`,
      m, { ...global.rcanal });
  }
};

// Definir todos los comandos y ayudas que este handler manejará
handler.command = ['play', 'yta', 'ytmp3', 'playaudio', 'ytaudio', 'play2', 'ytv', 'ytmp4', 'mp4', 'ytvideo', 'videoyt'];
handler.help = [
  'play <nombre/enlace> (Descarga audio de YouTube)',
  'ytmp3 <nombre/enlace> (Alias para play)',
  'ytmp4 <nombre/enlace> (Descarga video de YouTube)',
  'play2 <nombre/enlace> (Alias para ytmp4)'
];
handler.tags = ['downloader', 'youtube'];
handler.register = true;
handler.limit = true; // Descargas suelen ser intensivas

export default handler;

/**
 * @description Formatea el número de vistas a un formato más legible (K, M, B).
 * @param {number|string} views El número de vistas.
 * @returns {string} Las vistas formateadas o "N/A".
 */
function formatViews(views) {
  if (views === undefined || views === null || views === 'no encontrado') return "N/A";
  const num = parseInt(views);
  if (isNaN(num)) return "N/A";

  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)} K`;
  return num.toString();
}