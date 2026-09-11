const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  // 1. Buat Struktur Slash Command
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Kirim pengumuman/rules kustom ke channel pilihan')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Otomatis batasi cuma Admin/Owner
    .addChannelOption(option =>
      option
        .setName('saluran')
        .setDescription('Pilih saluran tempat pesan akan dikirim.')
        .addChannelTypes(ChannelType.GuildText) // Cuma channel teks
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('pesan')
        .setDescription('Isi pesan pengumuman yang ingin dikirim')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    // 2. Proteksi Akses Tambahan (Hanya Owner & Admin)
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return interaction.reply({
        content: '❌ Hanya **Owner** dan **Admin** yang bisa menggunakan perintah ini!',
        ephemeral: true
      });
    }

    // 3. Ambil Input dari Slash Command
    const targetChannel = interaction.options.getChannel('saluran');
    const textToSend = interaction.options.getString('pesan');

    try {
      // Format pesan (ganti \n menjadi baris baru)
      const formattedText = textToSend.replace(/\\n/g, '\n');

      // Kirim ke channel tujuan
      await targetChannel.send(formattedText);

      // Respon privat ke admin agar tidak mengotori chat
      await interaction.reply({
        content: `✅ Pesan berhasil dikirim ke ${targetChannel}!`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Gagal mengirim pesan via slash command:', err);
      await interaction.reply({
        content: '❌ Gagal mengirim pesan. Pastikan bot punya izin di channel tersebut!',
        ephemeral: true
      });
    }
  }
};