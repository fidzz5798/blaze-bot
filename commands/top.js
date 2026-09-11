const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

function cleanUsername(name) {
  const cleaned = name.replace(/[^\x00-\x7F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "User";
}

module.exports = {
  name: 'top',
  description: 'Menampilkan Leaderboard XP',
  async execute(message, args, db) {
    try {
      const userList = (await db.get('user_list')) || [];
      const leaderData = [];

      for (const id of userList) {
        const xp = (await db.get(`xp_${id}`)) || 0;
        leaderData.push({ id, xp });
      }

      leaderData.sort((a, b) => b.xp - a.xp);
      const top5 = leaderData.slice(0, 5);

      if (top5.length === 0) {
        return message.reply('Belum ada data XP yang tercatat!');
      }

      const canvas = createCanvas(800, 500);
      const ctx = canvas.getContext('2d');

      const bgPath = path.join(__dirname, '..', 'assets', 'leaderboard.png');
      try {
        const background = await loadImage(bgPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const mainFont = 'serif';

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 32px ${mainFont}`;
      ctx.fillText('BLAZE SQUAD LEADERBOARD', 180, 60);

      ctx.font = `bold 22px ${mainFont}`;
      let yPos = 130;

      for (let i = 0; i < top5.length; i++) {
        const item = top5[i];
        let memberName = 'Unknown User';

        try {
          const fetchedMember = await message.guild.members.fetch(item.id);
          memberName = cleanUsername(fetchedMember.displayName);
        } catch {
          memberName = `User (${item.id.slice(0, 5)}...)`;
        }

        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff';
        ctx.fillText(`#${i + 1}  ${memberName}`, 80, yPos);

        ctx.fillStyle = '#ffaa00';
        ctx.fillText(`${item.xp} XP`, 600, yPos);

        yPos += 70;
      }

      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'leaderboard.png' });
      await message.reply({ files: [attachment] });

    } catch (error) {
      console.error('Error saat membuat leaderboard:', error);
      message.reply('Terjadi kesalahan saat memproses leaderboard.');
    }
  }
};