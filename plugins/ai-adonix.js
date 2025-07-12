import fetch from 'node-fetch';

import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * @description Interactúa con una API de IA (anteriormente Adonix) para obtener respuestas en formato de texto, código o imagen.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El texto de la pregunta para la IA.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `🧠 *Asistente de Inteligencia Artificial*\n\n` +
      `Por favor, ingresa tu pregunta o la tarea que deseas realizar.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <tu pregunta>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} ¿Cuál es la capital de Francia?\`\n` +
      `*Otro Ejemplo:* \`${usedPrefix}${command} crea una imagen de un gato volador\` (si la IA soporta generación de imágenes)`,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `⏳ Procesando tu solicitud con el Asistente IA... Por favor espera.`, m);
  await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } }); // Reacción de IA procesando

  try {
    // La URL de la API original. Si SYA Team tiene una API preferida, debería actualizarse aquí.
    // NOTA: La disponibilidad y funcionalidad de esta API externa no está garantizada.
    const apiURL = `https://theadonix-api.vercel.app/api/adonix?q=${encodeURIComponent(text)}`;
    const res = await fetch(apiURL);

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (_) {}
      throw new Error(`Error de API (HTTP ${res.status}): ${res.statusText}. ${errorBody || 'No hay detalles adicionales.'}`);
    }

    const data = await res.json();

    // Caso 1: La API devuelve una imagen generada
    if (data.imagen_generada) {
      await conn.sendMessage(m.chat, {
        image: { url: data.imagen_generada },
        caption: `🖼️ *Asistente IA* generó esta imagen para:\n_"${data.pregunta || text}"_\n\n${data.mensaje || ''}`,
      }, { quoted: m, ...global.rcanal });
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // Caso 2: La API devuelve una respuesta de texto (puede incluir código)
    if (data.respuesta && typeof data.respuesta === 'string') {
      // Intenta separar el mensaje principal de los bloques de código
      const parts = data.respuesta.split(/```(?:javascript|js|html|css|python|java|c|cpp|csharp|php|ruby|go|swift|kotlin|bash|sh|powershell|sql|json|xml|yaml|md|txt|text|)/i);
      let respuestaFinal = `💡 *Asistente IA Responde:*\n\n${parts[0].trim()}`;

      if (parts.length > 1) { // Si hay bloques de código detectados
        for (let i = 1; i < parts.length; i += 2) { // Iterar sobre los bloques de código
          const codeBlockContent = parts[i+1] ? parts[i].trim() : parts[i].trim().slice(0, parts[i].trim().lastIndexOf('\n') || parts[i].trim().length); // Extraer contenido del bloque
          const languageMatch = data.respuesta.match(/```(\w+)/); // Intentar detectar el lenguaje
          const language = languageMatch ? languageMatch[1] : '';

          respuestaFinal += `\n\n💻 *Código (${language || 'detectado'}):*\n\`\`\`${language}\n${codeBlockContent.slice(0, 3800)}\n\`\`\``; // Limitar longitud del código
        }
      }

      await conn.reply(m.chat, respuestaFinal, m, { ...global.rcanal });
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // Caso 3: La API no devuelve ni imagen ni texto válido en el formato esperado
    console.warn(chalk.yellowBright('[AI PLUGIN WARNING] Respuesta inesperada de la API:'), JSON.stringify(data, null, 2));
    await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
    return conn.reply(m.chat, '❌ No se pudo procesar la respuesta del Asistente IA. La API devolvió un formato inesperado.', m, { ...global.rcanal });

  } catch (e) {
    console.error(chalk.redBright('[AI PLUGIN ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(m.chat,
      `❌ Error al contactar con el Asistente IA:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Por favor, intenta más tarde.`,
      m, { ...global.rcanal });
  }
};

handler.help = ['ia <pregunta>', 'ai <pregunta>', 'adonix <pregunta> (Inteligencia Artificial)'];
handler.tags = ['ia', 'tools'];
handler.command = ['adonix', 'ai', 'ia', 'ask', 'pregunta', 'adonixia']; // 'ia' y 'ask' son buenos alias
handler.register = true;
handler.limit = true; // Esta API podría tener límites de uso

export default handler;