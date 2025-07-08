import fetch from 'node-fetch';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`🌵 *Adonix IA:*\n\nEscribí algo maje...\nEjemplo:\n${usedPrefix + command} dime un chiste`);
  }

  await m.react('🧠');

  try {
    const apiURL = `https://theadonix-api.vercel.app/api/adonixvoz?q=${encodeURIComponent(text)}`;
    const res = await fetch(apiURL);
    const data = await res.json();

    console.log('[🧠 RES DATA]', data); // DEBUG 🔍

    // 🔊 AUDIO BASE64
    if (data.audio_base64) {
      try {
        const audioBuffer = Buffer.from(data.audio_base64, 'base64');

        // Verifica tamaño
        console.log('🔊 Tamaño del buffer:', audioBuffer.length, 'bytes');

        if (audioBuffer.length < 10000) throw new Error('⚠️ Audio demasiado pequeño o corrupto');

        await conn.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          ptt: true
        }, { quoted: m });

        await m.react('✅');
        return;

      } catch (err) {
        console.error('[❌ ERROR AL PROCESAR AUDIO]', err);
        await m.reply('❌ No se pudo enviar el audio. Tal vez está corrupto o mal formado.');
        await m.react('❌');
        return;
      }
    }

    // 🖼️ IMAGEN
    if (data.imagen_generada || data.result?.image) {
      const imgUrl = data.imagen_generada || data.result.image;
      await conn.sendMessage(m.chat, {
        image: { url: imgUrl },
        caption: `🖼️ *Adonix IA generó esta imagen:*\n\n🗯️ *Pregunta:* ${data.pregunta || text}\n\n📌 ${data.mensaje || 'Aquí está tu imagen perrito'}`,
      }, { quoted: m });
      await m.react('✅');
      return;
    }

    // 💬 TEXTO
    if (data.respuesta && typeof data.respuesta === 'string') {
      const [mensaje, ...codigo] = data.respuesta.split(/```(?:javascript|js|html)?/i);
      let textoFinal = `🌵 *Adonix IA:*\n\n${mensaje.trim()}`;

      if (codigo.length) {
        textoFinal += `\n\n💻 *Código:*\n\`\`\`js\n${codigo.join('```').trim().slice(0, 3900)}\n\`\`\``;
      }

      await m.reply(textoFinal);
      await m.react('✅');
      return;
    }

    await m.react('❌');
    return m.reply('❌ No se supo qué mandar 🤷‍♂️');

  } catch (e) {
    console.error('[❌ ERROR GENERAL ADONIX IA]', e);
    await m.react('❌');
    return m.reply(`❌ Error usando Adonix IA:\n\n${e.message}`);
  }
};

handler.help = ['iavoz <texto>'];
handler.tags = ['ia'];
handler.command = ['iavoz'];

export default handler;


