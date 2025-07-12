import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * @description Genera una imagen a partir de un prompt de texto utilizando una API de IA (similar a DALL-E).
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string[]} args Los argumentos del comando (el prompt completo).
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
let handler = async (m, { conn, args, usedPrefix, command }) => {
  const prompt = args.join(' ');
  if (!prompt || !prompt.trim()) {
    return conn.reply(m.chat,
      `🎨 *Generador de Imágenes IA*\n\n` +
      `Por favor, describe la imagen que deseas generar.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <descripción de la imagen>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} un astronauta montando un unicornio en la luna, estilo pintura al óleo\``,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `🖼️ Creando tu imagen con IA basada en: "_${prompt}_"... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '🖌️', key: m.key } }); // Reacción de IA procesando imagen

  try {
    // NOTA: La URL de la API original. Si SYA Team tiene una API preferida, debería actualizarse aquí.
    // La disponibilidad y funcionalidad de esta API externa no está garantizada.
    const apiUrl = `https://theadonix-api.vercel.app/api/IAimagen?prompt=${encodeURIComponent(prompt)}`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (_) {}
      throw new Error(`Error de API (HTTP ${res.status}): ${res.statusText}. ${errorBody || 'No hay detalles adicionales.'}`);
    }

    const json = await res.json();

    if (json.status !== 200 || !json.result?.image) {
      console.warn(chalk.yellowBright('[DALL-E PLUGIN WARNING] Respuesta inesperada de la API:'), JSON.stringify(json, null, 2));
      throw new Error('La API no devolvió una imagen válida o el estado fue incorrecto.');
    }

    await conn.sendMessage(m.chat, {
      image: { url: json.result.image },
      caption: `🎨 *Imagen Generada por IA*\n\n*Prompt:* _${prompt}_\n\n✨ Powered by ${global.namebot || 'SYA Team Bot'}`,
      mentions: [m.sender]
    }, { quoted: m, ...global.rcanal });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[DALL-E PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al generar la imagen:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta con otro prompt o más tarde.`,
      m, { ...global.rcanal }
    );
  }
};

handler.command = ['dalle', 'iaimagen', 'generarimagen', 'aiimage'];
handler.help = ['dalle <descripción> (Genera una imagen con IA)'];
handler.tags = ['ia', 'tools'];
handler.register = true; // Se recomienda registrar para controlar uso
handler.limit = true;    // Aplicar límite de uso debido a consumo de API

export default handler;