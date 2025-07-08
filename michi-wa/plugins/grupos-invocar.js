const handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!m.isGroup) return m.reply('🔒 Este comando solo se usa en grupos.');

  const groupMetadata = await conn.groupMetadata(m.chat);

  // Debug: imprimir participantes y roles
  console.log('🔎 Participantes del grupo:');
  groupMetadata.participants.forEach(p => {
    console.log(`- ${p.id} | rol: ${p.admin || 'miembro'}`);
  });

  const userParticipant = groupMetadata.participants.find(p => p.id === m.sender);
  const isUserAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin' || m.sender === groupMetadata.owner;

  if (!isUserAdmin) return m.reply('❌ Solo los admins pueden usar este comando.');

  const mainEmoji = global.db.data.chats[m.chat]?.customEmoji || '☕';
  const decoEmoji1 = '✨';
  const decoEmoji2 = '📢';

  m.react(mainEmoji);

  const mensaje = args.join(' ') || 'Sin mensaje personalizado';
  const total = groupMetadata.participants.length;

  const header = `
╭──────────────────────╮
│       ${decoEmoji2} *🗣️ MENCIÓN GENERAL* ${decoEmoji2}       │
╰──────────────────────╯
`;

  const info = `
> 💌 Mensaje: ${mensaje}
> 👥 Miembros: ${total}
${decoEmoji1.repeat(1)}
`;

  let cuerpo = '';
  for (const mem of groupMetadata.participants) {
    cuerpo += `• ${mainEmoji} @${mem.id.split('@')[0]}\n`;
  }

  const footer = `
${decoEmoji1.repeat(1)}
┊ *📅 Comando:* ${usedPrefix}${command}
╰──────────────────────╯
`;

  const texto = header + info + cuerpo + footer;

  await conn.sendMessage(m.chat, {
    text: texto.trim(),
    mentions: groupMetadata.participants.map(p => p.id)
  });
};

handler.help = ['invocar *<mensaje opcional>*'];
handler.tags = ['group'];
handler.command = ['todos', 'invocar', 'tagall'];
handler.group = true;

export default handler;