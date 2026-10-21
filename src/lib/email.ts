import nodemailer from 'nodemailer'

export async function sendEmail(
  host: string,
  port: number,
  email: string,
  password: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: email,
        pass: password,
      },
    })

    await transporter.sendMail({
      from: `"BarberLeads UY" <${email}>`,
      to,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">✂️ Mensaje para tu barbería</h2>
        ${body.split('\n').map((line) => `<p>${line}</p>`).join('')}
      </div>`,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
