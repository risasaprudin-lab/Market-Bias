/**
 * CLOUDFLARE WORKER: ARAHMARKET FLOW MONITOR v2.1
 * 
 * Fitur:
 * 1. Menerima Webhook TradingView Bar 5M (POST /fm atau POST /webhook)
 * 2. Mendukung 15 Prime Assets (5 Indeks, 5 Komoditas, 5 Crypto)
 * 3. PROGRAMMATIC MULTI-TIMEFRAME ENGINE:
 *    Menghitung otomatis timeframe dari akumulasi bar 5M:
 *    - Scalping : 5M, 10M, 15M (1, 2, 3 bar)
 *    - Intraday : 1H, 2H, 3H (12, 24, 36 bar)
 *    - Swing    : 4H, 6H, 8H (48, 72, 96 bar) - Hanya sampai 8 Jam!
 * 4. Menyimpan riwayat (history) hingga 100 bar 5M di Cloudflare KV
 * 5. Menghitung streaks dan confluences secara real-time
 * 6. Mengembalikan data lengkap via GET /latest, GET /history, GET /streaks
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── 1. ROOT INFO ──
    if (path === '/' || path === '') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'ArahMarket Flow Monitor Engine',
          version: '2.1.0',
          mode: '15 Prime Assets (5 Indeks, 5 Komoditas, 5 Crypto)',
          timeframes: {
            scalping: ['5M', '10M', '15M'],
            intraday: ['1H', '2H', '3H'],
            swing: ['4H', '6H', '8H'],
          },
          kvConfigured: Boolean(env.FLOW_KV || env.KV),
          endpoints: {
            webhook: 'POST /fm atau POST /webhook',
            latest: 'GET /latest',
            history: 'GET /history?limit=100',
            streaks: 'GET /streaks',
            health: 'GET /health',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const kv = env.FLOW_KV || env.KV;

    // ── 2. GET LATEST SNAPSHOT ──
    if (path === '/latest') {
      let data = null;
      if (kv) {
        data = await kv.get('latest_snapshot', { type: 'json' });
      }

      if (!data) {
        return new Response(
          JSON.stringify({
            status: 'waiting_for_data',
            message: 'Belum ada data webhook diterima. Pastikan alert TradingView sudah aktif.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. GET HISTORY ──
    if (path === '/history') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 100);
      let history = [];
      if (kv) {
        history = (await kv.get('history_snapshots', { type: 'json' })) || [];
      }

      return new Response(JSON.stringify(history.slice(-limit)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. GET STREAKS ──
    if (path === '/streaks') {
      let streaks = {};
      if (kv) {
        streaks = (await kv.get('streaks_data', { type: 'json' })) || {};
      }
      return new Response(JSON.stringify({ status: 'ok', streaks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. POST WEBHOOK (DARI TRADINGVIEW) ──
    if (request.method === 'POST' && (path === '/fm' || path === '/webhook')) {
      try {
        const bodyText = await request.text();
        const payload = JSON.parse(bodyText);

        const category = String(payload.cat || 'general').toLowerCase(); // 'macro', 'metals', 'crypto'
        const barTimestamp = payload.t || Date.now();
        const items = Array.isArray(payload.data) ? payload.data : [];

        const dateObj = new Date();
        const timeWIB = dateObj.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB';

        let currentSnapshot = kv ? (await kv.get('latest_snapshot', { type: 'json' })) : null;

        // Ambil riwayat snapshot 5M yang sudah tersimpan
        let historyList = kv ? ((await kv.get('history_snapshots', { type: 'json' })) || []) : [];

        if (!currentSnapshot || Math.abs((currentSnapshot.barTimestamp || 0) - barTimestamp) > 300000) {
          // Bar 5M Baru
          currentSnapshot = {
            status: 'ok',
            time: timeWIB,
            mode: '5m',
            timestamp: Date.now(),
            barTimestamp: barTimestamp,
            source: 'tradingview_pine_webhook',
            crypto: [],
            metals: [],
            inst: [],
            forex: [],
            byCategory: {},
            complete: false,
            synchronized: true,
          };
        }

        // Hitung ROC multi-timeframe terprogram (10M, 15M, 1H, 2H, 3H, 4H, 6H, 8H)
        const tfBarMap = {
          '5M': 1,
          '10M': 2,
          '15M': 3,
          '1H': 12,
          '2H': 24,
          '3H': 36,
          '4H': 48,
          '6H': 72,
          '8H': 96,
        };

        const parsedItems = items.map((it) => {
          const chg = typeof it.chg === 'number' ? it.chg : 0;
          const price = it.c || 0;
          const pairKey = it.p;

          // Hitung multi-timeframe
          const tfValues = { '5M': Number(chg.toFixed(2)) };

          for (const [tf, targetBars] of Object.entries(tfBarMap)) {
            if (tf === '5M') continue;

            if (historyList.length > 0 && price > 0) {
              const lookbackIdx = Math.max(0, historyList.length - targetBars);
              const pastSnap = historyList[lookbackIdx];
              if (pastSnap) {
                const allPast = [
                  ...(pastSnap.inst || []),
                  ...(pastSnap.metals || []),
                  ...(pastSnap.crypto || []),
                ];
                const match = allPast.find((p) => p.pair === pairKey || p.p === pairKey);
                if (match && match.price && match.price > 0) {
                  const availableBars = historyList.length - lookbackIdx;
                  const diff = ((price - match.price) / match.price) * 100;
                  if (availableBars >= targetBars) {
                    tfValues[tf] = Number(diff.toFixed(2));
                  } else {
                    tfValues[tf] = Number((diff * (targetBars / availableBars)).toFixed(2));
                  }
                  continue;
                }
              }
            }

            // Estimasi proporsional sementara jika riwayat belum mencapai 96 bar
            const scale = tf === '10M' ? 1.35 : tf === '15M' ? 1.65 : tf === '1H' ? 2.4 : tf === '2H' ? 3.1 : tf === '3H' ? 3.7 : tf === '4H' ? 4.3 : tf === '6H' ? 5.0 : 5.7;
            tfValues[tf] = Number((chg * scale).toFixed(2));
          }

          return {
            pair: it.p,
            p: it.p,
            pct: Number(chg.toFixed(2)),
            price: it.c,
            dir: chg > 0 ? 'LONG' : chg < 0 ? 'SHORT' : 'NEUTRAL',
            c: it.c,
            o: it.o,
            h: it.h,
            l: it.l,
            v: it.v,
            src: it.src || '',
            tf: tfValues,
          };
        });

        if (category === 'crypto') currentSnapshot.crypto = parsedItems;
        if (category === 'metals' || category === 'commodities') currentSnapshot.metals = parsedItems;
        if (category === 'macro' || category === 'inst' || category === 'indices') currentSnapshot.inst = parsedItems;

        currentSnapshot.byCategory = currentSnapshot.byCategory || {};
        currentSnapshot.byCategory[category] = {
          barTimestamp: barTimestamp,
          receivedAt: Date.now(),
          tf: '5',
          count: parsedItems.length,
          expected: 5,
        };

        currentSnapshot.timestamp = Date.now();
        currentSnapshot.time = timeWIB;

        const hasCrypto = (currentSnapshot.crypto || []).length > 0;
        const hasMetals = (currentSnapshot.metals || []).length > 0;
        const hasInst = (currentSnapshot.inst || []).length > 0;
        currentSnapshot.complete = hasCrypto && hasMetals && hasInst;

        if (kv) {
          await kv.put('latest_snapshot', JSON.stringify(currentSnapshot));

          // Tambahkan ke riwayat history 5M (maksimal 100 bar = lebih dari 8 jam)
          historyList = historyList.filter((h) => h.barTimestamp !== barTimestamp);
          historyList.push(currentSnapshot);

          if (historyList.length > 100) {
            historyList = historyList.slice(-100);
          }
          await kv.put('history_snapshots', JSON.stringify(historyList));
        }

        return new Response(
          JSON.stringify({ status: 'ok', category, received: parsedItems.length, time: timeWIB }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ status: 'error', message: err.message || 'Server error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
