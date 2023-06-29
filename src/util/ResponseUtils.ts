import { EmbedBuilder, Interaction, Message } from 'discord.js';

export async function respondDmFallback(ctx: Interaction | Message<true>, embed: EmbedBuilder) {
    if (!ctx.channel) {
        return;
    }

    try {
        if (ctx instanceof Message) ctx.author.send({ embeds: [embed] });
        else ctx.user.send({ embeds: [embed] });
    } catch (e) {
        const sent = await ctx.channel.send({ embeds: [embed] });
        setTimeout(() => {
            sent.delete();
        }, 5000);
    }
}
