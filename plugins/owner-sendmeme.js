import axios from 'axios';

const handler = async (m, { conn }) => {
  try {
    const res = await axios.get('https://g-mini-ia.vercel.app/api/meme');
    const memeUrl = res.data.url;

    if (!memeUrl) {
      return m.reply('❌ No se pudo obtener el meme.');
    }

    await conn.sendMessage('120363420941524030@newsletter', {
      image: { url: memeUrl },
      caption: '> ❀ *Meme De Hoy*',
    });

    m.reply('🔥 Meme enviado al canal.');
  } catch (e) {
    console.error(e);
    m.reply('⚠️ Hubo un error al intentar enviar el meme.');
  }
};

handler.command = ['sendmeme'];
handler.help = ['sendmeme'];
handler.tags = ['owner'];
handler.rowner = true;
export default handler;