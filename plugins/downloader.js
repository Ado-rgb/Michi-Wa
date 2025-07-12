import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const ytUrlRegex = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w-]{11})(?:\S+)?$/;

/**
 * @description Descarga videos de YouTube como MP4 (documento) utilizando una API específica (ymcdn).
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El enlace URL del video de YouTube.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
let handler = async (m, { conn, text, usedPrefix, command, args }) => {
  if (!args[0] || !args[0].trim()) {
    return conn.reply(m.chat,
      `📎 *Descargador de Video YouTube (Documento)*\n\n` +
      `Por favor, ingresa el enlace URL del video de YouTube que deseas descargar como documento.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <enlace_youtube>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} https://youtu.be/example123\``,
      m, { ...global.rcanal }
    );
  }

  const videoUrl = args[0].trim();
  if (!ytUrlRegex.test(videoUrl)) {
    return conn.reply(m.chat, `⚠️ El enlace proporcionado no parece ser un enlace válido de YouTube.`, m, { ...global.rcanal });
  }

  await conn.reply(m.chat, `📥 Procesando tu video de YouTube como documento: "_${videoUrl}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    const videoData = await ytdlCustomApi(videoUrl); // Usar la función de API personalizada
    if (!videoData || !videoData.url || !videoData.title) {
      throw new Error('La API no devolvió la información necesaria para la descarga.');
    }

    const fileSize = await getFileSize(videoData.url);
    const formattedSize = fileSize ? formatBytes(fileSize) : 'Desconocido';

    // Determinar el nombre del bot actual (principal o sub-bot)
    let currentBotName = global.namebot || 'SYA Team Bot';
    const jadiBotFolder = global.jadi || '.sya_jadibots';
    const botJid = conn.user?.jid?.split('@')[0]?.replace(/\D/g, '');
    if (botJid) {
      const configPathSubBot = path.join(jadiBotFolder, botJid, 'config.json');
      if (fs.existsSync(configPathSubBot)) {
        try {
          const configSubBot = JSON.parse(fs.readFileSync(configPathSubBot, 'utf-8'));
          if (configSubBot.name) currentBotName = configSubBot.name;
        } catch (err) {
          console.warn(chalk.yellow(`[YT DOC WARN] No se pudo leer config del sub-bot ${botJid}:`), err);
        }
      }
    }

    const caption =
      `🎬 *Video de YouTube (Documento)*\n\n` +
      `✨ *Título:* ${videoData.title}\n` +
      `🔗 *URL:* ${videoUrl}\n` +
      `⚖️ *Peso Estimado:* ${formattedSize}\n\n` +
      `✨ Powered by ${currentBotName}`;

    // Descargar el buffer y enviar como documento
    const videoBuffer = await (await fetch(videoData.url)).buffer();

    await conn.sendMessage(m.chat, {
        document: videoBuffer,
        mimetype: 'video/mp4',
        fileName: `${videoData.title.replace(/[<>:"/\\|?*]+/g, '')}.mp4`,
        caption: caption,
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[YT DOC DOWNLOADER ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al descargar el video como documento:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, verifica el enlace o intenta más tarde.`,
      m, { ...global.rcanal }
    );
  }
};

// Se cambia el comando principal para evitar conflicto con ytmp4 de downloader-ytmp42.js
handler.help = ['ytmp4doc <enlace_youtube>', 'playdoc <enlace_youtube> (Descarga video de YT como documento)'];
handler.command = ['ytmp4doc', 'playdoc', 'youtubedoc'];
handler.tags = ['downloader', 'youtube'];
handler.register = true;
handler.limit = true;

export default handler;

/**
 * @description Obtiene el enlace de descarga de un video de YouTube usando la API de ymcdn.
 * @param {string} url La URL del video de YouTube.
 * @returns {Promise<object>} Objeto con { url: string, title: string }.
 */
async function ytdlCustomApi(url) {
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9", // Usar inglés para respuestas más consistentes de API
    "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Microsoft Edge\";v=\"116\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "https://id.ytmp3.mobi/", // El referer puede ser importante para esta API
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  // console.log(chalk.blueBright('[YT DOC DEBUG] Iniciando ytdlCustomApi para:'), url);

  const initialRes = await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers });
  if (!initialRes.ok) throw new Error(`API Init Error (HTTP ${initialRes.status})`);
  const initData = await initialRes.json();
  if (!initData.convertURL) throw new Error('API Init no devolvió convertURL.');

  const videoId = url.match(ytUrlRegex)?.[1];
  if (!videoId) throw new Error('No se pudo extraer el ID del video de YouTube desde la URL.');

  const convertURL = initData.convertURL + `&v=${videoId}&f=mp4&_=${Math.random()}`;
  // console.log(chalk.blueBright('[YT DOC DEBUG] Convert URL:'), convertURL);

  const convertRes = await fetch(convertURL, { headers });
  if (!convertRes.ok) throw new Error(`API Convert Error (HTTP ${convertRes.status})`);
  const convertData = await convertRes.json();
  if (!convertData.progressURL || !convertData.downloadURL) throw new Error('API Convert no devolvió progressURL o downloadURL.');

  let progressInfo = {};
  // Intentar obtener el progreso unas cuantas veces, pero no bloquear indefinidamente.
  for (let i = 0; i < 5; i++) { // Aumentado a 5 intentos con delay
    const progressRes = await fetch(convertData.progressURL, { headers });
    if (!progressRes.ok) {
        // console.warn(chalk.yellowBright(`[YT DOC WARNING] API Progress Error (HTTP ${progressRes.status}), intento ${i+1}`));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de reintentar
        continue;
    }
    progressInfo = await progressRes.json();
    // console.log(chalk.blueBright(`[YT DOC DEBUG] Progress Info (intento ${i+1}):`), progressInfo);
    if (progressInfo.progress === 3 || progressInfo.title) break; // progress: 3 suele indicar completado, o si ya tenemos título
    await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar 1.5 segundos
  }

  if (!progressInfo.title && !convertData.downloadURL){
      console.warn(chalk.yellowBright('[YT DOC WARNING] No se pudo obtener el título ni el enlace de descarga final de la API.'), progressInfo, convertData);
      throw new Error('No se pudo obtener la información completa del video desde la API después de varios intentos.');
  }

  return {
    url: convertData.downloadURL, // Usar el downloadURL que se obtiene antes del bucle de progreso
    title: progressInfo.title || 'video_youtube' // Usar el título del progreso o un fallback
  };
}

/**
 * @description Formatea bytes a un tamaño legible (KB, MB, GB).
 * @param {number} bytes El número de bytes.
 * @returns {string} El tamaño formateado o "Desconocido".
 */
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * @description Obtiene el tamaño del archivo desde una URL usando una solicitud HEAD.
 * @param {string} url La URL del archivo.
 * @returns {Promise<number|null>} El tamaño en bytes o null si no se pudo obtener.
 */
async function getFileSize(url) {
  try {
    const response = await axios.head(url, { timeout: 5000 }); // Timeout de 5s
    const contentLength = response.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (error) {
    console.warn(chalk.yellowBright("[GET FILE SIZE WARN] Error al obtener el tamaño del archivo:"), error.message);
    return null;
  }
}