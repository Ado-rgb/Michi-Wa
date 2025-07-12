import fetch from 'node-fetch';
import chalk from 'chalk'; // Para logs mejorados

/**
 * @description Convierte texto a voz utilizando la voz de "Jorge" (Loquendo) mediante una API externa.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El texto a convertir en voz.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `🎙️ *Texto a Voz (Loquendo - Jorge)*\n\n` +
      `Por favor, ingresa el texto que deseas convertir a voz.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <tu texto aquí>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} Hola, soy ${global.namebot || 'un bot de WhatsApp'}\``,
      m, { ...global.rcanal }
    );
  }

  // Reacción de espera y mensaje de procesamiento
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
  const processingMessage = await conn.reply(m.chat, `🗣️ Generando audio de Loquendo (Jorge)... Por favor espera.`, m);

  const voiceModel = 'Jorge'; // Voz fija para esta API/endpoint
  const apiUrl = `https://apis-starlights-team.koyeb.app/starlight/loquendo?text=${encodeURIComponent(text)}&voice=${voiceModel}`;

  try {
    const res = await fetch(apiUrl);

    if (!res.ok) {
      let errorBody = '';
      try {
        errorBody = await res.text(); // Intentar obtener más detalles del error de la API
      } catch (_) {}
      throw new Error(`Error de API (HTTP ${res.status}): ${res.statusText}. ${errorBody || 'No hay detalles adicionales.'}`);
    }

    const json = await res.json();

    if (!json.audio) { // Asumiendo que la API devuelve { audio: "base64string" }
      console.error(chalk.yellowBright('[TTS LOQUENDO API WARNING] La API no devolvió un campo "audio" válido:'), JSON.stringify(json, null, 2));
      await conn.sendMessage(m.chat, { delete: processingMessage.key }); // Eliminar mensaje "procesando"
      return conn.reply(m.chat, '❌ No se pudo generar el audio. La API no devolvió datos de audio válidos. Intenta más tarde.', m, { ...global.rcanal });
    }

    // Eliminar mensaje "procesando" antes de enviar el audio
    await conn.sendMessage(m.chat, { delete: processingMessage.key });

    await conn.sendMessage(m.chat, {
      audio: Buffer.from(json.audio, 'base64'), // El audio viene en base64
      mimetype: 'audio/mpeg',
      ptt: true // Enviar como nota de voz
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[TTS LOQUENDO PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { delete: processingMessage.key }); // Eliminar mensaje "procesando"
    conn.reply(m.chat,
      `❌ Ocurrió un error inesperado al generar el audio de Loquendo:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta más tarde. Si el problema persiste, contacta al administrador.`,
      m, { ...global.rcanal }
    );
    await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
  }
};

handler.command = ['tts', 'loquendo', 'jorge']; // Comando y alias
handler.help = ['tts <texto> (Voz Loquendo de Jorge)'];
handler.tags = ['tools', 'ia']; // Tags para categorización
handler.register = true;
handler.limit = true; // Aplicar límite de uso

export default handler;