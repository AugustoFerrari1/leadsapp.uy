import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadIds, message, subject = '✂️ Mensaje para tu barbería' } = body

    const settings = await prisma.settings.findFirst()
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
    })

    const results = []

    for (const lead of leads) {
      let success = false
      let channel = ''
      let error = ''

      // Try WhatsApp first if phone exists
      if (lead.phone) {
        const wppResult = await sendWhatsApp(
          settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL || '',
          settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY || '',
          settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || '',
          lead.phone,
          message
        )
        success = wppResult.success
        channel = 'whatsapp'
        error = wppResult.error || ''
      }

      // Fallback to email if no phone or WhatsApp failed
      if (!success && lead.email) {
        const emailResult = await sendEmail(
          settings?.zohoSmtpHost || process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
          settings?.zohoSmtpPort || Number(process.env.ZOHO_SMTP_PORT) || 465,
          settings?.zohoEmail || process.env.ZOHO_EMAIL || '',
          settings?.zohoPassword || process.env.ZOHO_PASSWORD || '',
          lead.email,
          subject,
          message
        )
        success = emailResult.success
        channel = 'email'
        error = emailResult.error || ''
      }

      // Save message record
      if (channel) {
        await prisma.message.create({
          data: {
            leadId: lead.id,
            channel,
            content: message,
            status: success ? 'sent' : 'failed',
          },
        })

        // Update lead status and last contact
        if (success) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: 'contacted',
              lastContactAt: new Date(),
            },
          })
        }
      }

      results.push({
        leadId: lead.id,
        name: lead.name,
        channel,
        success,
        error: error || undefined,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    )
  }
}
