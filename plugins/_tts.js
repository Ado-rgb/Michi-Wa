import fetch from 'node-fetch';

/**
 * @description Convierte texto a voz utilizando una API externa con diferentes modelos de voz.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string[]} args Argumentos del comando: args[0] = modelo de voz, args.slice(1).join(' ') = texto.
 * @param {string} command El comando utilizado.
 */
let handler = async (m, { conn, args, command, usedPrefix }) => {
  const vocesDisponibles = [ // Lista de modelos de voz soportados por la API
    'optimus_prime',
    'eminem',
    'taylor_swift',
    'nahida',
    'miku',
    'nami',
    'goku',
    'ana',
    'elon_musk',
    'mickey_mouse',
    'kendrick_lamar',
    'angela_adkinsh'
  ];

  if (args.length < 2) {
    const helpMessage = `🎙️ *Texto a Voz Avanzado*\n\nPor favor, proporciona un modelo de voz y el texto a convertir.\n\n*Uso:* \`${usedPrefix}${command} <voz> <texto>\`\n\n*Ejemplo:* \`${usedPrefix}${command} optimus_prime Hola mundo\`\n\n*Voces Disponibles:*\n\`\`\`${vocesDisponibles.join('\n')}\`\`\``;
    return conn.reply(m.chat, helpMessage, m, { ...global.rcanal });
  }

  const voiceModel = args[0].toLowerCase();
  const text = args.slice(1).join(' ');

  if (!text.trim()) {
    return conn.reply(m.chat, `⚠️ Por favor, ingresa el texto que deseas convertir a voz.`, m, { ...global.rcanal });
  }

  if (!vocesDisponibles.includes(voiceModel)) {
    const alternativas = vocesDisponibles.map(v => `\`${v}\``).join(', ');
    return conn.reply(m.chat, `⚠️ El modelo de voz \`${voiceModel}\` no fue encontrado.\n\n*Voces Disponibles:*\n${alternativas}`, m, { ...global.rcanal });
  }

  await conn.reply(m.chat, `⏳ Generando audio con la voz de \`${voiceModel}\`... Por favor espera.`, m);

  try {
    // Nota: La disponibilidad y fiabilidad de APIs gratuitas puede variar.
    const apiUrl = `https://zenzxz.dpdns.org/tools/text2speech?text=${encodeURIComponent(text)}`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      // Intenta leer el cuerpo del error si es posible
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch (_) {}
      throw new Error(`Error de API (HTTP ${res.status}): ${res.statusText}. ${errorBody}`);
    }

    const json = await res.json();

    if (!json.status || !json.results || !Array.isArray(json.results)) {
      console.error("[TTS API ERROR]", JSON.stringify(json, null, 2));
      return conn.reply(m.chat, '❌ Error: La API no devolvió los datos esperados. Intenta con otro texto o más tarde.', m, { ...global.rcanal });
    }

    const voice = json.results.find(v => v.model === voiceModel);
    if (!voice || !voice.audio_url) {
      return conn.reply(m.chat, `❌ No se pudo generar el audio con la voz de \`${voiceModel}\`. Prueba con otra voz o texto.`, m, { ...global.rcanal });
    }

    const audioRes = await fetch(voice.audio_url);
    if (!audioRes.ok) {
      throw new Error(`Error al descargar el audio (HTTP ${audioRes.status}): ${audioRes.statusText}`);
    }
    const audioBuffer = await audioRes.arrayBuffer();

    await conn.sendMessage(m.chat, {
      audio: Buffer.from(audioBuffer),
      mimetype: 'audio/mpeg',
      ptt: true // Enviar como nota de voz (Push To Talk)
    }, { quoted: m, ...global.rcanal });

  } catch (e) {
    console.error(chalk.redBright('[TTS PLUGIN ERROR]'), e);
    conn.reply(m.chat, `❌ Ocurrió un error inesperado al generar el audio:\n\n\`${e.message || 'Error desconocido'}\`\n\nIntenta más tarde.`, m, { ...global.rcanal });
  }
};

handler.command = /^ttsx$/i; // Se mantiene por compatibilidad, pero se sugiere añadir alias.
// handler.command = ['ttsx', 'textoavozavanzado', 'voicemodel']; // Ejemplo de alias
handler.help = ['ttsx <voz> <texto> (Convierte texto a voz con modelos específicos)'];
handler.tags = ['tools', 'ia']; // Tags para categorización
handler.premium = false; // Opcional: si la API es limitada, podría ser premium
handler.limit = true; // Opcional: aplicar límite de uso si es necesario

export default handler;