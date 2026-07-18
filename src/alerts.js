function safeError(error) {
  return String(error?.message || error || 'Unknown error').slice(0, 300);
}

function createAlertManager({ webhookUrl = '', cooldownMs = 15 * 60_000, fetchImpl = global.fetch, now = () => Date.now(), logger = console } = {}) {
  const lastSentByType = new Map();
  let lastAttemptAt = null;
  let lastSuccessAt = null;
  let lastFailureAt = null;
  let lastError = null;

  async function send({ type, severity = 'warning', message, details = {} }) {
    if (!webhookUrl) return { sent: false, reason: 'not_configured' };
    const current = now();
    const previous = lastSentByType.get(type);
    if (previous !== undefined && current - previous < cooldownMs) return { sent: false, reason: 'cooldown' };
    lastSentByType.set(type, current);
    lastAttemptAt = new Date(current).toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    timeout.unref?.();
    try {
      const response = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'exam-system', type, severity, message, occurredAt: lastAttemptAt, details }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
      lastSuccessAt = lastAttemptAt;
      lastError = null;
      return { sent: true };
    } catch (error) {
      lastFailureAt = lastAttemptAt;
      lastError = safeError(error);
      logger.error('[alert] Delivery failed:', lastError);
      return { sent: false, reason: 'delivery_failed' };
    } finally {
      clearTimeout(timeout);
    }
  }

  function status() {
    return { configured: Boolean(webhookUrl), lastAttemptAt, lastSuccessAt, lastFailureAt, lastError };
  }

  return { send, status };
}

module.exports = { createAlertManager };
