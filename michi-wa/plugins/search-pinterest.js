import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return await conn.reply(m.chat, `✎ Ingresa un texto para buscar en Pinterest\n\nEjemplo:\n${usedPrefix + command} anime aesthetic`, m);
  }

  try {
    let api = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`);
    let json = api.data;

    if (!json.data || !json.data.length) {
      return await conn.reply(m.chat, `❌ No se encontraron resultados para *${text}*`, m);
    }

    let data = json.data[Math.floor(Math.random() * json.data.length)];
    let { pin, created_at, images_url, grid_title } = data;

    let caption = `*「✦」 ${grid_title}*\n\n` +
                  `> *✦ Creado El:* ${created_at}\n` +
                  `> *🜸 Link:* ${pin}`;

    await conn.sendMessage(m.chat, {
      image: { url: images_url },
      caption,
      footer: ''
    }, { quoted: m });

  } catch (error) {
    console.error(error);
    await conn.reply(m.chat, '❌ Ocurrió un error al buscar en Pinterest.', m);
  }
};

handler.help = ['pinterest <texto>'];
handler.tags = ['search', 'image'];
handler.command = ['pinterest', 'pin'];

export default handler;