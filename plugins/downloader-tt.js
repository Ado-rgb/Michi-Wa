import fetch from 'node-fetch';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) 
    return m.reply(
      `🌸 Envía un enlace TikTok.\n\nEj: ${usedPrefix + command} https://vm.tiktok.com/xxxxxx`
    );

  try {
    await m.react('🎴');

    const api = `https://theadonix-api.vercel.app/api/tiktok?url=${encodeURIComponent(text)}`;
    const res = await fetch(api);
    const json = await res.json();
    const r = json?.result;

    if (!r?.video) {
      await m.react('❌');
      return m.reply('❌ No se pudo obtener video.');
    }

    const cap = `
✿ ${r.title}
✐ Autor: ${r.author.name} (@${r.author.username})
✎ Duración: ${r.duration}s
✰ Likes:${r.likes}`.trim();

    await conn.sendMessage(m.chat, { image: { url: r.thumbnail }, caption: cap }, { quoted: m });
    await conn.sendMessage(m.chat, { video: { url: r.video }, mimetype: 'video/mp4', fileName: `${r.author.username}.mp4` }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('⚠️');
    return m.reply('❌ Error procesando enlace.');
  }
};

handler.help = ['tiktok <enlace>'];
handler.tags = ['downloader'];
handler.command = ['ttdl', 'tt', 'tiktok'];

export default handler;
