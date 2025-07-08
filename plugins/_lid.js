const handler = async (m, { conn }) => {
  const sender = m.sender; // esto ya te da el jid completo: 521234567890@s.whatsapp.net
  const number = sender.split('@')[0]; // aquí extraes solo el número

  await conn.reply(m.chat, `➤ ${number}`, m);
};

handler.command = ["lid", "getid"];
handler.tags = ["tools"];
handler.help = ["lid"];
export default handler;