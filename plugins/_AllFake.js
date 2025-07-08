import fetch from 'node-fetch'

export async function before(m, { conn }) {
  global.rcanal = {
    contextInfo: {
      isForwarded: true,
      forwardingScore: 200,
      forwardedNewsletterMessageInfo: {
        newsletterJid: idcanal,
        serverMessageId: 100,
        newsletterName: namecanal,
      }
    }
  }
}