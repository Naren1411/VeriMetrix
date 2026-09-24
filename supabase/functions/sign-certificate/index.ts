import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface SigningRequest { payload: string }

serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!request.headers.get('Authorization')) return new Response('Unauthorized', { status: 401 });
  const privateKey = Deno.env.get('CERTIFICATE_PRIVATE_KEY');
  if (!privateKey) return Response.json({ error: 'Certificate signing key is not configured' }, { status: 503 });
  const { payload } = await request.json() as SigningRequest;
  if (!payload || payload.length > 4096) return Response.json({ error: 'Invalid payload' }, { status: 400 });

  const keyData = Uint8Array.from(atob(privateKey), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, key, new TextEncoder().encode(payload));
  return Response.json({ algorithm: 'RSA-PSS-SHA256', signature: btoa(String.fromCharCode(...new Uint8Array(signature))) });
});
