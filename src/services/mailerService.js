/**
 * Creates HTML email template for contact form
 */
function createEmailTemplate(formData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouveau contact</title>
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'PlayfairDisplay-Regular', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="text-align: center; padding: 20px; background-color: #181818; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nouveau contact</h1>
                <p style="color: #888888; margin: 10px 0 0 0;">laurentxdubois.com</p>
            </div>
            <div style="margin-bottom: 30px; color: #181818;">
                <p style="font-size: 16px; line-height: 1.5;">Bonjour Laurent,</p>
                <p style="font-size: 16px; line-height: 1.5;">Un nouveau message a été envoyé via votre portfolio.</p>
            </div>
            <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #181818; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Nom</h3>
                    <p style="color: #333333; margin: 5px 0 0 0; font-size: 16px;">${formData.name}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #181818; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Email</h3>
                    <p style="color: #333333; margin: 5px 0 0 0; font-size: 16px;"><a href="mailto:${formData.email}" style="color: #888888; text-decoration: none;">${formData.email}</a></p>
                </div>
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #181818; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Téléphone</h3>
                    <p style="color: #333333; margin: 5px 0 0 0; font-size: 16px;"><a href="tel:${formData.telephone}" style="color: #888888; text-decoration: none;">${formData.telephone || 'Non renseigné'}</a></p>
                </div>
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #181818; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Site Web</h3>
                    <p style="color: #333333; margin: 5px 0 0 0; font-size: 16px;"><a href="${formData.website}" style="color: #888888; text-decoration: none;">${formData.website || 'Non renseigné'}</a></p>
                </div>
            </div>
            <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="color: #181818; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Message</h3>
                <div style="color: #333333; margin: 10px 0 0 0; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${formData.message}</div>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="mailto:${formData.email}" style="display: inline-block; padding: 12px 24px; background-color: #181818; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Répondre au message</a>
            </div>
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e2e2;">
                <p style="color: #666666; font-size: 14px; margin: 0;">Message automatique envoyé depuis</p>
                <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">laurentxdubois.com</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Send contact email using HTTP fetch (SMTP2GO, Resend, or Brevo API)
 */
async function sendContactEmail(formData, env = {}) {
  const recipientEmail = env.RECIPIENT_EMAIL || process.env.RECIPIENT_EMAIL || 'laurent.x.dubois@gmail.com';
  const smtp2goApiKey = env.SMTP2GO_API_KEY || process.env.SMTP2GO_API_KEY;
  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const brevoApiKey = env.BREVO_API_KEY || process.env.BREVO_API_KEY;

  // 1. SMTP2GO API (HTTP API)
  if (smtp2goApiKey) {
    const sender = env.SMTP2GO_SENDER_EMAIL || env.SENDER_EMAIL || process.env.SMTP2GO_SENDER_EMAIL || process.env.SENDER_EMAIL || 'contact@laurentxdubois.com';
    const res = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: smtp2goApiKey,
        to: [recipientEmail],
        sender: sender,
        subject: `📬 Nouveau contact - ${formData.name} (laurentxdubois.com)`,
        html_body: createEmailTemplate(formData),
        custom_headers: [
          {
            header: 'Reply-To',
            value: formData.email
          }
        ]
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.data && data.data.failed > 0)) {
      throw new Error(`SMTP2GO API error: ${JSON.stringify(data)}`);
    }
    return { success: true };
  }

  // 2. Resend API
  if (resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.SENDER_EMAIL || process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: recipientEmail,
        reply_to: formData.email,
        subject: `📬 Nouveau contact - ${formData.name} (laurentxdubois.com)`,
        html: createEmailTemplate(formData)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API error: ${errText}`);
    }
    return { success: true };
  }

  // 3. Brevo API
  if (brevoApiKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: formData.name, email: env.SENDER_EMAIL || 'contact@laurentxdubois.com' },
        to: [{ email: recipientEmail }],
        replyTo: { email: formData.email, name: formData.name },
        subject: `📬 Nouveau contact - ${formData.name}`,
        htmlContent: createEmailTemplate(formData)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Brevo API error: ${errText}`);
    }
    return { success: true };
  }

  console.log('[Mailer] Dev / Default mode (No API key set). Message data:', formData);
  return { success: true, mocked: true };
}

module.exports = {
  createEmailTemplate,
  sendContactEmail
};
