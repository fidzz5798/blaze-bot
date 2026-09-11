const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Kirim pengumuman/rules kustom ke channel pilihan')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('saluran')
        .setDescription('Pilih saluran tempat pesan akan dikirim.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('pesan')
        .setDescription('Isi pesan pengumuman yang ingin dikirim')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Mencegah error 'Application did not respond' dengan memberi sinyal tunggu ke Discord
    await interaction.deferReply({ ephemeral: true });

    // Proteksi Akses (Hanya Owner & Admin)
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return interaction.editReply({
        content: '❌ Hanya **Owner** dan **Admin** yang bisa menggunakan perintah ini!'
      });
    }

    const targetChannel = interaction.options.getChannel('saluran');
    const textToSend = interaction.options.getString('pesan');

    try {
      const formattedText = textToSend.replace(/\\n/g, '\n');

      // Kirim pesan ke channel tujuan
      await targetChannel.send(formattedText);

      // Balas konfirmasi privat ke admin
      await interaction.editReply({
        content: `✅ Pesan berhasil dikirim ke ${targetChannel}!`
      });
    } catch (err) {
      console.error('Gagal mengirim pesan via slash command:', err);
      await interaction.editReply({
        content: '❌ Gagal mengirim pesan. Pastikan bot punya izin kirim pesan di channel tersebut!'
      });
    }
  }
};