import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadIds, message, subject = '✂️ Mensaje para tu barbería', includeName = false } = body

    const settings = await prisma.settings.findFirst()
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
    })

    const results = []

    for (const lead of leads) {
      let success = false
      let channel = ''
      let error = ''

      // Process message with or without barber name
      let finalMessage = message
      let finalSubject = subject

      if (includeName && lead.name) {
        // If message has {{name}} or [Nombre], replace it
        if (/({{\s*name\s*}}|\[nombre\])/i.test(finalMessage)) {
          finalMessage = finalMessage.replace(/({{\s*name\s*}}|\[nombre\])/gi, lead.name)
        } else if (/^Hola(!|,)?/i.test(finalMessage)) {
          // If no tag is used but start greeting exists, personalize greeting naturally
          finalMessage = finalMessage.replace(/^Hola(!|,)?/i, `Hola ${lead.name}$1`)
        }

        if (/({{\s*name\s*}}|\[nombre\])/i.test(finalSubject)) {
          finalSubject = finalSubject.replace(/({{\s*name\s*}}|\[nombre\])/gi, lead.name)
        }
      } else {
        // Deactivated or explicitly no name: clean up any leftover tags cleanly
        finalMessage = finalMessage
          .replace(/Hola\s+({{\s*name\s*}}|\[nombre\])(!|,)?/gi, 'Hola$2')
          .replace(/({{\s*name\s*}}|\[nombre\])/gi, 'tu barbería')
        finalSubject = finalSubject
          .replace(/({{\s*name\s*}}|\[nombre\])/gi, 'tu barbería')
      }

      // Always replace city if present
      finalMessage = finalMessage.replace(/{{\s*city\s*}}/gi, lead.city || '')
      finalSubject = finalSubject.replace(/{{\s*city\s*}}/gi, lead.city || '')

      // Try WhatsApp first if phone exists
      if (lead.phone) {
        const wppResult = await sendWhatsApp(
          settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL || '',
          settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY || '',
          settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || '',
          lead.phone,
          finalMessage
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
          finalSubject,
          finalMessage
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
            content: finalMessage,
            status: success ? 'sent' : 'failed',
          },
        })

        // Update lead status and last contact timestamp
        if (success) {
          const newStatus = lead.status === 'new' ? 'contacted' : lead.status
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: newStatus,
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

      // Gentle pause between messages to avoid WhatsApp rate limit
      if (leads.length > 1) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    )
  }
}
