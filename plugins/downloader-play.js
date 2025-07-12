import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * @description Busca una canción o video en YouTube por texto, muestra información y descarga el audio.
 * Utiliza dos APIs: una para búsqueda (Delirius) y otra para descarga de audio (Adonix).
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 * @param {string} text El texto de búsqueda.
 */
let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `🎵 *Descargar Música de YouTube (Play)*\n\n` +
      `Por favor, ingresa el nombre de la canción o video que deseas buscar y descargar.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <nombre de la canción/video>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} Imagine Dragons - Bones\``,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `🎶 Buscando y preparando tu canción: "_${text}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    // Paso 1: Buscar el video en YouTube usando Delirius API
    const searchApiUrl = `https://delirius-apiofc.vercel.app/search/ytsearch?q=${encodeURIComponent(text)}`;
    // console.log(chalk.blueBright('[PLAY DEBUG] Search API URL:'), searchApiUrl);
    const searchRes = await fetch(searchApiUrl);
    if (!searchRes.ok) {
      throw new Error(`Error al buscar en YouTube (HTTP ${searchRes.status}): ${searchRes.statusText}`);
    }
    const searchJson = await searchRes.json();

    if (!searchJson.status || !searchJson.data || searchJson.data.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, `❌ No se encontraron resultados para tu búsqueda: "_${text}_".\nIntenta con términos más específicos o revisa la ortografía.`, m, { ...global.rcanal });
    }

    const firstResult = searchJson.data[0]; // Tomar el primer resultado

    // Paso 2: Mostrar información del video encontrado
    const videoInfo =
      `🎧 *${firstResult.title}*\n\n` +
      `👤 *Canal:* ${firstResult.author?.name || 'Desconocido'}\n` +
      `⏱️ *Duración:* ${firstResult.duration || 'Desconocida'}\n` +
      `👁️ *Vistas:* ${firstResult.views ? Number(firstResult.views).toLocaleString() : 'Desconocidas'}\n` +
      `📅 *Publicado:* ${firstResult.publishedAt || 'Desconocida'}\n` +
      `🔗 *Enlace:* ${firstResult.url}\n\n` +
      `⬇️ Preparando audio...`;

    if (firstResult.image) {
      await conn.sendMessage(m.chat, { image: { url: firstResult.image }, caption: videoInfo, mentions: [m.sender] }, { quoted: m, ...global.rcanal });
    } else {
      await conn.reply(m.chat, videoInfo, m, { mentions: [m.sender], ...global.rcanal });
    }
    await conn.sendMessage(m.chat, { react: { text: '📥', key: m.key } });


    // Paso 3: Descargar el audio usando la API de Adonix
    const downloadApiUrl = `https://theadonix-api.vercel.app/api/ytmp3?url=${encodeURIComponent(firstResult.url)}`;
    // console.log(chalk.blueBright('[PLAY DEBUG] Download API URL:'), downloadApiUrl);
    const downloadRes = await fetch(downloadApiUrl);
    if (!downloadRes.ok) {
      throw new Error(`Error al preparar la descarga del audio (HTTP ${downloadRes.status}): ${downloadRes.statusText}`);
    }
    const downloadJson = await downloadRes.json();

    if (!downloadJson?.status || !downloadJson.result?.audio) {
      console.error(chalk.yellowBright('[PLAY WARNING] API de descarga no devolvió audio:'), JSON.stringify(downloadJson, null, 2));
      await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
      return conn.reply(m.chat, '❌ No se pudo obtener el audio del video seleccionado. La API de descarga podría estar temporalmente no disponible.', m, { ...global.rcanal });
    }

    const audioUrl = downloadJson.result.audio;
    const filename = downloadJson.result.filename || `${firstResult.title.replace(/[<>:"/\\|?*]+/g, '')}.mp3`; // Limpiar nombre de archivo

    // Paso 4: Descargar el buffer de audio
    const audioFileRes = await fetch(audioUrl);
    if (!audioFileRes.ok) {
      throw new Error(`No se pudo descargar el archivo de audio desde la URL proporcionada (HTTP ${audioFileRes.status}): ${audioFileRes.statusText}`);
    }
    const audioBuffer = await audioFileRes.buffer();

    // Paso 5: Enviar como nota de voz (PTT)
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: filename, // Nombre del archivo para el cliente
      ptt: true
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[PLAY PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al procesar tu solicitud de reproducción:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta más tarde o con otra canción.`,
      m, { ...global.rcanal }
    );
  }
};

handler.command = ['play', 'ytplay', 'playmusic', 'reproducir'];
handler.help = ['play <nombre de canción/video> (Busca y descarga audio de YouTube)'];
handler.tags = ['downloader', 'youtube'];
handler.register = true;
handler.limit = true; // Las descargas suelen consumir recursos/APIs

export default handler;


