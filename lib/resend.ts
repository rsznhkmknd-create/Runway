import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Inline SVG version of the Finsight logo for email clients.
// Kept as a string (no JSX) because this file runs outside React.
const FINSIGHT_LOGO_SVG = `
<svg width="28" height="28" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Finsight">
  <path d="M 20 10 L 20 46 L 138 46 L 155 28 L 138 10 Z" fill="none" stroke="#00C48C" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M 20 58 L 20 94 L 116 94 L 133 76 L 116 58 Z" fill="none" stroke="#00C48C" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M 20 106 L 20 136 L 66 136 L 66 106 Z" fill="none" stroke="#00C48C" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
`.trim()

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'hola@finsight.app',
    to: email,
    subject: 'Bienvenido a Finsight',
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 8px;">
          ${FINSIGHT_LOGO_SVG}
          <span style="font-weight: 600; font-size: 20px; color: #111827;">Finsight</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 16px;">
          Hola, ${name} 👋
        </h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Tu cuenta de Finsight está lista. Ya puedes conectar tu banca, importar
          transacciones y ver tu runway en tiempo real.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display: inline-block; background: #00C48C; color: white; font-weight: 600;
                  padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 15px;">
          Ir al dashboard →
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 40px;">
          Finsight · Madrid / Ciudad de México · Soporte: hola@finsight.app
        </p>
      </div>
    `,
  })
}
