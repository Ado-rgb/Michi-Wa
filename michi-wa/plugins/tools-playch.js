import fetch from 'node-fetch';

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) return m.reply(`✐ Ingresa un texto para buscar en YouTube\n> *Ejemplo:* ${usedPrefix + command} ozuna`);

  try {
    let api = await (await fetch(`https://delirius-apiofc.vercel.app/search/ytsearch?q=${encodeURIComponent(text)}`)).json();
    if (!api.data || !api.data.length) return m.reply('❌ No se encontraron resultados para tu búsqueda.');

    let results = api.data[0];

    // Verificar si algo falla en la api pa así mandar archivo error :>
    if (results.duration === '0:00' || results.duration === '0.00' || !results.duration) {
      return m.reply('❌ El video tiene duración 0:00 y no se puede descargar.');
    }

    let txt = `*「✦」 ${results.title}*\n\n` +
              `> ✦ *Canal:* ${results.author?.name || 'Desconocido'}\n` +
              `> ⴵ *Duración:* ${results.duration || 'Desconocida'}\n` +
              `> ✰ *Vistas:* ${results.views || 'Desconocidas'}\n` +
              `> ✐ *Publicado:* ${results.publishedAt || 'Desconocida'}\n` +
              `> 🜸 *Link:* ${results.url || 'No disponible'}`;

    // Enviar info al privado
    let senderJid = m.sender;
    let img = results.image || null;

    if (img) {
      await conn.sendMessage(senderJid, { image: { url: img }, caption: txt }, { quoted: m });
    } else {
      await conn.sendMessage(senderJid, { text: txt }, { quoted: m });
    }

    // Descargar el audio rapidito XD
    let api2 = await (await fetch(`https://theadonix-api.vercel.app/api/ytmp3?url=${encodeURIComponent(results.url)}`)).json();

    if (!api2.result || !api2.result.audio) {
      return m.reply('❌ No se pudo obtener el audio del video.');
    }

    // Aquí enviamos al canal XD
    let canal = '120363420941524030@newsletter';
    try {
      await conn.sendMessage(canal, {
        audio: { url: api2.result.audio },
        mimetype: 'audio/mpeg',
        ptt: true
      });

      await m.reply('✅ Audio enviado correctamente al canal.');
    } catch (err) {
      await m.reply('❌ Falló al enviar el audio al canal.');
    }

  } catch (e) {
    m.reply(`❌ Error: ${e.message}`);
    await m.react('✖️');
  }
};

handler.command = ['playch'];
export default handler;