import axios from 'axios';
import chalk from 'chalk';

/**
 * @description Comando para el propietario para obtener un meme de una API y enviarlo a un canal de WhatsApp configurado.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 */
const handler = async (m, { conn }) => {
  // El ID del canal al que se enviará el meme. Debería ser configurable en config.js
  const targetChannelId = global.memeChannelId || global.idcanal; // Usar una variable específica o el idcanal general
  const botName = global.namebot || 'SYA Team Bot';

  if (!targetChannelId) {
    return conn.reply(m.chat,
      `⚠️ No se ha configurado un ID de canal para enviar memes.\n` +
      `Por favor, define \`global.memeChannelId\` o \`global.idcanal\` en \`config.js\`.`,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `🤖 Buscando un buen meme para enviar al canal...`, m);
  await conn.sendMessage(m.chat, { react: { text: '🖼️', key: m.key } });

  try {
    // API para obtener memes. Considerar que las APIs gratuitas pueden ser inestables.
    const res = await axios.get('https://g-mini-ia.vercel.app/api/meme');
    const memeUrl = res.data?.url; // Acceso seguro

    if (!memeUrl) {
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, '❌ No se pudo obtener la URL del meme desde la API. Intenta de nuevo.', m, { ...global.rcanal });
    }

    const captionMeme = `🤣 ¡Meme del Día! 🤣\n\n${global.packname || botName}\n${global.author || ''}`;

    await conn.sendMessage(targetChannelId, {
      image: { url: memeUrl },
      caption: captionMeme,
      // contextInfo: { // Opcional: añadir contextInfo si se desea un look específico
      //   forwardedNewsletterMessageInfo: {
      //     newsletterJid: targetChannelId,
      //     newsletterName: global.namecanal || "Canal de Memes", // Usar nombre del canal si está definido
      //     serverMessageId: -1
      //   }
      // }
    });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    conn.reply(m.chat, `✅ ¡Meme enviado exitosamente al canal \`${targetChannelId.split('@')[0]}\`!`, m, { ...global.rcanal });

  } catch (e) {
    console.error(chalk.redBright('[SENDMEME ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ Ocurrió un error al intentar obtener o enviar el meme:\n\n` +
      `\`${e.message || 'Error desconocido.'}\`\n\n` +
      `Verifica la consola para más detalles.`,
      m, { ...global.rcanal }
    );
  }
};

handler.command = ['sendmeme', 'enviarmeme'];
handler.help = ['sendmeme (Envía un meme al canal configurado)'];
handler.tags = ['owner', 'fun']; // Añadido 'fun' tag
handler.rowner = true; // Solo el propietario principal

export default handler;