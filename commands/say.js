module.exports = {
  name: 'say',
  description: 'Kirim pengumuman/rules kustom ke channel pilihan',
  async execute(message, args) {
    // Cek izin (Hanya Admin / Manage Messages)
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Kamu tidak punya izin untuk menggunakan perintah ini!');
    }

    // Ambil channel yang di-tag
    const targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
      return message.reply('❌ Format salah! Contoh penggunaan: `!say #announcement Halo kawan-kawan!`');
    }

    // Ambil teks pesan (mengabaikan tag channel)
    const textToSend = args.slice(1).join(' ');
    if (!textToSend) {
      return message.reply('❌ Tolong tuliskan pesan yang ingin dikirim!');
    }

    try {
      await targetChannel.send(textToSend);
      await message.reply(`✅ Pesan berhasil dikirim ke ${targetChannel}!`);
    } catch (err) {
      console.error('Gagal mengirim pesan:', err);
      message.reply('❌ Gagal mengirim pesan. Pastikan bot punya izin di channel tersebut!');
    }
  }
};