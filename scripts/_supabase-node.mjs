// Wrapper around @supabase/supabase-js createClient for Node-side scripts.
// @supabase/realtime-js requires a native WebSocket; Node < 22 doesn't ship one,
// so we pass `ws` as the transport. Use this helper from any build-time or CI
// script (build, sitemap, daily publish, backfills) to keep the workaround in
// one place — when we move to Node 22+, only this file needs to change.

import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

export function createClient(url, key, options = {}) {
  return supabaseCreateClient(url, key, {
    ...options,
    realtime: {
      ...(options.realtime || {}),
      transport: WebSocket,
    },
  });
}
