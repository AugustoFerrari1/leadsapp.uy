export async function sendWhatsApp(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!apiUrl || !apiKey || !instance) {
      return { success: false, error: 'Falta configurar Evolution API en Configuración' }
    }

    // Clean base URL and instance
    const baseUrl = apiUrl.trim().replace(/\/+$/, '')
    const cleanInstance = instance.trim()

    // Normalize phone number
    let normalized = phoneNumber.replace(/[\s\-\+\(\)]/g, '')

    // Uruguay phone normalization: 09X XXX XXX -> 5989XXXXXXX
    if (normalized.startsWith('09') && normalized.length === 9) {
      normalized = '598' + normalized.slice(1)
    } else if (normalized.startsWith('9') && normalized.length === 8) {
      normalized = '598' + normalized
    }

    const endpoint = `${baseUrl}/message/sendText/${encodeURIComponent(cleanInstance)}`

    const executeRequest = async () => {
      return await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
        },
        body: JSON.stringify({
          number: normalized,
          text: message,
        }),
      })
    }

    let response = await executeRequest()

    // If Render was asleep (502/503/504 or HTML response), wait 4 seconds and retry once
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      response = await executeRequest()
    }

    if (!response.ok) {
      const rawText = await response.text()

      // Handle HTML error responses from Render/Cloudflare
      if (rawText.includes('<!DOCTYPE') || rawText.includes('<html') || response.status === 502 || response.status === 503) {
        return {
          success: false,
          error: `El servidor de WhatsApp (Render) estaba suspendido o iniciando (HTTP ${response.status}). Esperá unos segundos y reintentá.`,
        }
      }

      // Try parsing JSON error
      try {
        const jsonErr = JSON.parse(rawText)
        const msg =
          jsonErr.response?.message ||
          jsonErr.message ||
          jsonErr.error ||
          rawText.slice(0, 150)
        return { success: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) }
      } catch {
        return { success: false, error: rawText.slice(0, 150) }
      }
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error de conexión'
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'No se pudo conectar a Evolution API. Verificá que el servidor esté activo.',
      }
    }
    return {
      success: false,
      error: msg,
    }
  }
}

