import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * @description Interactúa con una API de IA para obtener respuestas en formato de audio (voz), imagen o texto.
 * Prioriza la respuesta de audio si está disponible.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El texto de la pregunta para la IA.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `🗣️ *Asistente IA con Voz*\n\n` +
      `Por favor, ingresa tu pregunta o el texto que deseas que la IA procese.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <tu pregunta/texto>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} Cuéntame un dato curioso sobre el espacio\``,
      m, { ...global.rcanal }
    );
  }

  const processingMessage = await conn.reply(m.chat, `⏳ Procesando tu solicitud con el Asistente IA (Voz)... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '💬', key: m.key } });

  try {
    // NOTA: La URL de la API original. Si SYA Team tiene una API preferida, debería actualizarse aquí.
    const apiURL = `https://theadonix-api.vercel.app/api/adonixvoz?q=${encodeURIComponent(text)}`;
    const res = await fetch(apiURL);

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (_) {}
      throw new Error(`Error de API (HTTP ${res.status}): ${res.statusText}. ${errorBody || 'No hay detalles adicionales.'}`);
    }

    const data = await res.json();
    // console.log(chalk.blueBright('[AI VOZ DEBUG] Respuesta de API:'), JSON.stringify(data, null, 2)); // Descomentar para debug detallado

    // Prioridad 1: Respuesta de Audio (Base64)
    if (data.audio_base64) {
      try {
        const audioBuffer = Buffer.from(data.audio_base64, 'base64');
        // console.log(chalk.blue('[AI VOZ DEBUG] Tamaño del buffer de audio:', audioBuffer.length, 'bytes'));

        if (audioBuffer.length < 5000) { // Umbral un poco más bajo, pero aún así previene audios vacíos/corruptos
            console.warn(chalk.yellowBright('[AI VOZ WARNING] Audio recibido parece demasiado pequeño o corrupto. Longitud:', audioBuffer.length));
            // No enviar este audio, intentar mostrar texto si existe
            if (data.respuesta && typeof data.respuesta === 'string') {
                 await conn.sendMessage(m.chat, { delete: processingMessage.key });
                 conn.reply(m.chat, `⚠️ El audio generado era muy pequeño (posiblemente un error). Mostrando respuesta de texto:\n\n💡 *Asistente IA Responde:*\n${data.respuesta.trim()}`, m, {...global.rcanal});
                 await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
                 return;
            }
            throw new Error('Audio generado demasiado pequeño o posiblemente corrupto.');
        }

        await conn.sendMessage(m.chat, { delete: processingMessage.key });
        await conn.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          ptt: true // Enviar como nota de voz
        }, { quoted: m, ...global.rcanal });
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        return;

      } catch (audioErr) {
        console.error(chalk.redBright('[AI VOZ ERROR AL PROCESAR AUDIO]'), audioErr);
        await conn.sendMessage(m.chat, { delete: processingMessage.key });
        // Intentar mostrar respuesta de texto si el audio falla y hay texto
        if (data.respuesta && typeof data.respuesta === 'string') {
            conn.reply(m.chat, `⚠️ No se pudo procesar el audio. Mostrando respuesta de texto:\n\n💡 *Asistente IA Responde:*\n${data.respuesta.trim()}`, m, {...global.rcanal});
        } else {
            conn.reply(m.chat, '❌ No se pudo procesar el audio recibido de la IA. Intenta más tarde.', m, { ...global.rcanal });
        }
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return;
      }
    }

    // Prioridad 2: Respuesta de Imagen
    if (data.imagen_generada || data.result?.image) {
      const imgUrl = data.imagen_generada || data.result.image;
      await conn.sendMessage(m.chat, { delete: processingMessage.key });
      await conn.sendMessage(m.chat, {
        image: { url: imgUrl },
        caption: `🖼️ *Asistente IA* (Voz) generó esta imagen para:\n_"${data.pregunta || text}"_\n\n${data.mensaje || ''}`,
      }, { quoted: m, ...global.rcanal });
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // Prioridad 3: Respuesta de Texto (si no hubo audio ni imagen)
    if (data.respuesta && typeof data.respuesta === 'string') {
      const parts = data.respuesta.split(/```(?:javascript|js|html|css|python|java|c|cpp|csharp|php|ruby|go|swift|kotlin|bash|sh|powershell|sql|json|xml|yaml|md|txt|text|)/i);
      let textoFinal = `💡 *Asistente IA Responde (Voz):*\n\n${parts[0].trim()}`;
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i += 2) {
          const codeBlockContent = parts[i+1] ? parts[i].trim() : parts[i].trim().slice(0, parts[i].trim().lastIndexOf('\n') || parts[i].trim().length);
          const languageMatch = data.respuesta.match(/```(\w+)/);
          const language = languageMatch ? languageMatch[1] : '';
          textoFinal += `\n\n💻 *Código (${language || 'detectado'}):*\n\`\`\`${language}\n${codeBlockContent.slice(0, 3800)}\n\`\`\``;
        }
      }
      await conn.sendMessage(m.chat, { delete: processingMessage.key });
      await conn.reply(m.chat, textoFinal, m, { ...global.rcanal });
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // Si no se pudo procesar ningún tipo de respuesta esperada
    await conn.sendMessage(m.chat, { delete: processingMessage.key });
    console.warn(chalk.yellowBright('[AI VOZ PLUGIN WARNING] Respuesta no reconocida de la API:'), JSON.stringify(data, null, 2));
    await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
    return conn.reply(m.chat, '❌ El Asistente IA (Voz) no pudo procesar tu solicitud o la respuesta no fue en un formato esperado.', m, { ...global.rcanal });

  } catch (e) {
    console.error(chalk.redBright('[AI VOZ PLUGIN ERROR GENERAL]'), e);
    await conn.sendMessage(m.chat, { delete: processingMessage.key });
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(m.chat,
      `❌ Error al contactar con el Asistente IA (Voz):\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta más tarde.`,
      m, { ...global.rcanal });
  }
};

handler.help = ['iavoz <texto> (IA con respuesta prioritaria de voz)'];
handler.tags = ['ia', 'tools'];
handler.command = ['iavoz', 'aivoz', 'vozai']; // Alias
handler.register = true;
handler.limit = true;

export default handler;


