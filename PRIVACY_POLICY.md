# Privacy Policy for Nameless-Suggestions Discord Bot

**Effective date:** 2026-06-11
**Last updated:** 2026-06-11

This Privacy Policy describes how the Nameless-Suggestions Discord Bot (the "Bot", "we", "us", or "our"), operated by Supercrafter100, collects, uses, stores, and shares information when you (a "User") use the Bot or interact with servers ("guilds") where the Bot is installed.

By inviting, using, or otherwise interacting with the Bot, you agree to the terms of this Privacy Policy. If you do not agree, please remove the Bot from your server or stop interacting with it.

This Privacy Policy is designed to comply with the [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) and the [Discord Developer Terms of Service](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service).

---

## 1. Information We Collect

The Bot is designed to bridge Discord servers with a [NamelessMC](https://namelessmc.com/) website's suggestions module. To provide this functionality, the Bot collects and stores the minimum information required to operate.

### 1.1 Information collected automatically

When the Bot is used in a Discord server, we may automatically collect and store:

- **Discord Guild (server) IDs** — used to identify the server the Bot is configured for.
- **Discord Channel IDs** — the suggestion channel and the channels that contain suggestion messages.
- **Discord Message IDs** — used to map Discord messages to the corresponding suggestions and comments on the connected NamelessMC site.
- **Per-guild configuration** — including the NamelessMC API URL, an API key, an authorization key, the configured suggestion channel ID, and the preferred language.
- **Suggestion and comment metadata** — internal identifiers, the NamelessMC suggestion/comment IDs, status, and the URL of the suggestion on the connected NamelessMC site.

### 1.2 Information you provide

When you use a slash command, send a message, or react to a suggestion, Discord transmits associated data (such as your Discord User ID, the content of the message or command arguments, and the channel/guild context) to the Bot. This data is processed in real time to perform the requested action (e.g., creating a suggestion or comment on the connected NamelessMC site).

### 1.3 Information we do NOT collect or store

- We do **not** store the content of your Discord messages on our servers beyond what is required to fulfil the current request.
- We do **not** store your Discord username, avatar, email, IP address, or payment information.
- We do **not** track your behaviour across servers, build profiles about you, or sell any data.
- We do **not** use your data for advertising or marketing.

### 1.4 Message Content Intent

The Bot uses Discord's Message Content privileged intent in order to read the text of suggestions and comments at the time they are created. Message content is read transiently to forward the relevant text to the configured NamelessMC site, and is **not** persistently stored by the Bot.

---

## 2. How We Use Information

We use the collected information solely to:

- Provide and operate the Bot's core functionality (synchronising Discord suggestions/comments with a NamelessMC website).
- Maintain per-guild configuration (API endpoint, language, suggestion channel, etc.).
- Map Discord messages and reactions to their corresponding NamelessMC entries so that future interactions (e.g., status updates, replies) work correctly.
- Diagnose errors and improve the reliability of the Bot.

We do not use your information for any purpose other than those described in this Privacy Policy.

---

## 3. Sharing of Information

We do **not** sell, rent, or trade your information.

Information is shared only in the following limited situations:

- **With the connected NamelessMC site.** When a user creates a suggestion or comment via the Bot, the content and the author's Discord User ID are transmitted to the NamelessMC site that the server administrator has configured. That site is operated by a third party (the server's owner/administrator), and its handling of your data is governed by **its own** privacy policy.
- **With Discord.** All communication between users and the Bot is transmitted through Discord's infrastructure and is subject to [Discord's Privacy Policy](https://discord.com/privacy).
- **When required by law.** We may disclose information if compelled to do so by valid legal process, or to protect the rights, property, or safety of ourselves or others.

---

## 4. Data Storage and Security

- Data is stored in a MariaDB database hosted on infrastructure operated by Supercrafter100.
- We apply reasonable technical and organisational measures to protect stored information against unauthorised access, alteration, disclosure, or destruction.
- No method of storage or transmission over the internet is 100% secure; we cannot guarantee absolute security.

---

## 5. Data Retention

- Per-guild configuration is retained for as long as the Bot remains in your server.
- Suggestion and comment mappings are retained for as long as the corresponding messages exist and the Bot remains in your server, so that the Bot continues to function correctly with previously created suggestions.
- **When the Bot is removed from a guild, the per-guild configuration and stored suggestion mappings for that guild are automatically deleted from our database.** You may additionally contact us to confirm deletion or to request removal of any residual data (see Section 11).

---

## 6. Children's Privacy

The Bot is not directed at children under the age of 13 (or under the minimum digital consent age in your jurisdiction). Consistent with Discord's Terms of Service, users must meet Discord's minimum age requirement to use the Bot. We do not knowingly collect information from anyone below that age. If you believe that we have inadvertently collected such data, please contact us and we will delete it promptly.

---

## 7. Your Rights and Choices

Depending on your jurisdiction (including under the GDPR, UK GDPR, CCPA, and similar laws), you may have the right to:

- Access the information we hold about you.
- Request correction of inaccurate information.
- Request deletion of your information ("right to be forgotten").
- Object to or restrict certain processing.
- Lodge a complaint with your local data protection authority.

To exercise any of these rights, contact us using the details in Section 11. Server administrators can also remove all guild-related data by removing the Bot from their server and contacting us to request deletion of stored configuration and mapping data.

---

## 8. Third-Party Services

The Bot interacts with the following third-party services, each governed by their own terms and privacy policies:

- **Discord** — [Privacy Policy](https://discord.com/privacy)
- **The NamelessMC site configured by the server administrator** — operated independently by that server's owner.

We are not responsible for the privacy practices of these third parties.

---

## 9. International Data Transfers

Your information may be processed in countries other than the one in which you reside. By using the Bot, you consent to such transfers, subject to appropriate safeguards where required by law.

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top of this document indicates when it was last revised. Material changes will be announced through the Bot's support channels or repository. Continued use of the Bot after changes take effect constitutes acceptance of the revised policy.

---

## 11. Contact

If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact:

- **Developer:** Supercrafter100
- **Repository / Issues:** <https://github.com/supercrafter100/Nameless-Suggestions-Discord-Bot/issues>
- **Bot website:** <https://nameless-suggestions.supercrafter100.com>
