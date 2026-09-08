/**
 * Utilidades para detección de dispositivos y apertura de WhatsApp / WhatsApp Business.
 */

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(ua) || window.innerWidth <= 768;
}

export function isAndroidDevice() {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

/**
 * Formatea un número uruguayo o internacional para WhatsApp (solo dígitos, prefijo 598).
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  return clean.startsWith('598') ? clean : `598${clean.replace(/^0/, '')}`;
}

/**
 * Abre la conversación de WhatsApp con el número y mensaje dados.
 * En celular: Redirige para abrir específicamente en WhatsApp Business.
 *   - En Android: Usa intent con package "com.whatsapp.w4b" (WhatsApp Business) y fallback automático a wa.me.
 *   - En iOS: Usa el scheme nativo "whatsapp://send" con fallback a wa.me.
 * En computadora: Abre WhatsApp Web en una nueva pestaña (comportamiento estándar).
 *
 * @param {Object} options
 * @param {string} options.phone Número de teléfono
 * @param {string} options.message Mensaje predefinido
 * @param {boolean} [options.forceRegular=false] Si es true, usa WhatsApp estándar incluso en celular
 */
export function openWhatsAppChat({ phone, message = '', forceRegular = false }) {
  if (!phone) return;
  const num = formatPhoneForWhatsApp(phone);
  if (!num) return;

  const encoded = encodeURIComponent(message || '');
  const isMobile = isMobileDevice();

  if (isMobile) {
    const isAndroid = isAndroidDevice();

    if (!forceRegular && isAndroid) {
      // En Android, dirigir explícitamente a WhatsApp Business (com.whatsapp.w4b)
      const fallbackUrl = encodeURIComponent(`https://wa.me/${num}?text=${encoded}`);
      const intentUrl = `intent://send?phone=${num}&text=${encoded}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;S.browser_fallback_url=${fallbackUrl};end`;
      window.location.href = intentUrl;
      return;
    }

    // En iOS o con WhatsApp regular en móvil:
    // El scheme directo abre la app nativa instalada sin pasar por la web intermedia
    const directScheme = `whatsapp://send?phone=${num}&text=${encoded}`;
    window.location.href = directScheme;

    // Fallback de seguridad si el esquema directo no responde
    const fallbackTimer = setTimeout(() => {
      window.location.href = `https://wa.me/${num}?text=${encoded}`;
    }, 1200);

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimer);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
  } else {
    // En PC / Desktop: abre WhatsApp Web en pestaña nueva
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }
}
