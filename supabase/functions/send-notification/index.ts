import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface NotificationRequest {
  recipient_email: string;
  title: string;
  message: string;
}

serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const payload = await request.json() as NotificationRequest;
  if (!payload.recipient_email || !payload.title || !payload.message) {
    return Response.json({ error: 'Invalid notification payload' }, { status: 400 });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFICATION_FROM_EMAIL');
  if (!resendKey || !from) return Response.json({ error: 'Notification provider is not configured' }, { status: 503 });

  const providerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [payload.recipient_email], subject: payload.title, text: payload.message }),
  });

  return new Response(await providerResponse.text(), {
    status: providerResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
