import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'hola@runway.app',
    to: email,
    subject: 'Bienvenido a Runway',
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 32px;">
          <span style="background: #16a34a; color: white; font-weight: 700; padding: 8px 12px; border-radius: 8px; font-size: 18px;">R</span>
          <span style="font-weight: 600; font-size: 20px; margin-left: 8px; color: #111827;">Runway</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 16px;">
          Hola, ${name} 👋
        </h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Tu cuenta de Runway está lista. Ya puedes conectar tu banca, importar
          transacciones y ver tu runway en tiempo real.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display: inline-block; background: #16a34a; color: white; font-weight: 600;
                  padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 15px;">
          Ir al dashboard →
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 40px;">
          Runway · Madrid / Ciudad de México · Soporte: hola@runway.app
        </p>
      </div>
    `,
  })
}
