export async function sendWhatsApp(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone number: remove +, spaces, dashes
    const normalized = phoneNumber.replace(/[\s\-\+\(\)]/g, '')

    const endpoint = `${apiUrl}/message/sendText/${instance}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: normalized,
        text: message,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { success: false, error: err }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
