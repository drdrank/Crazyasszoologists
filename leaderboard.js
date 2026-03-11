'use strict';
// ================================================================
//  LEADERBOARD MODULE  —  Supabase storage + display
//  Exposes: window.LeaderboardAPI
//
//  ── SUPABASE SETUP ─────────────────────────────────────────────
//  1. Create a free project at https://supabase.com
//  2. Go to Dashboard → SQL Editor → paste the SQL below → Run
//  3. Go to Dashboard → Settings → API → copy URL + anon key
//  4. Paste them into SUPABASE_URL and SUPABASE_ANON_KEY below
//
//  ── SQL (run once in Supabase Dashboard → SQL Editor) ──────────
/*
  ── Run this in Supabase Dashboard → SQL Editor ─────────────────

  create table if not exists leaderboard_scores (
    id               bigserial    primary key,
    run_id           text         not null unique,
    wallet_address   text         not null,
    display_name     text         not null default 'Anonymous',
    score            integer      not null check (score >= 0),
    total_earned     integer      not null default 0,
    level            smallint     not null default 1,
    beauty           smallint     not null default 0,
    animals_count    smallint     not null default 0,
    nft_holder       boolean      not null default false,
    -- collection_flags: JSON map of which NFT collections the player holds
    -- e.g. {"donkey":true,"mega_donkey":false,"cheetah":true,"puffin":false}
    collection_flags jsonb,
    -- signed_message: Algorand signature of the score payload.
    -- A Supabase Edge Function can verify this with algosdk.verifyBytes()
    -- before inserting, making scores tamper-proof even without a custom backend.
    signed_message   text,
    created_at       timestamptz  not null default now()
  );

  create index if not exists idx_lb_score   on leaderboard_scores (score desc);
  create index if not exists idx_lb_wallet  on leaderboard_scores (wallet_address);
  create index if not exists idx_lb_nft     on leaderboard_scores (nft_holder, score desc);
  create index if not exists idx_lb_weekly  on leaderboard_scores (created_at desc, score desc);

  alter table leaderboard_scores enable row level security;

  create policy "public_read" on leaderboard_scores for select using (true);

  -- BACKEND VERIFICATION NOTE:
  -- The insert policy below trusts the client.  For tamper-proof scores, replace
  -- this with a Supabase Edge Function that:
  --   1. Receives { payload, signature, walletAddress }
  --   2. Verifies: algosdk.verifyBytes(msgBytes, sigBytes, pubKey)
  --   3. Only inserts if the signature is valid
  create policy "public_insert" on leaderboard_scores
    for insert with check (score >= 0 and char_length(display_name) <= 20);

  -- If you already created the table without the new columns, run:
  -- alter table leaderboard_scores add column if not exists collection_flags jsonb;
  -- alter table leaderboard_scores add column if not exists signed_message text;
*/
// ================================================================

// ──────────────────────────────────────────────────────────────────
//  CONFIG  —  Paste your Supabase credentials here
//  Find them at: Supabase Dashboard → Settings → API
// ──────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co'; // TODO
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';             // TODO

// ──────────────────────────────────────────────────────────────────
//  ANTI-CHEAT NOTE
//  This is a static GitHub Pages site — no custom server exists.
//  Client-side protections applied here:
//    • Unique run_id per game session (crypto.randomUUID) → DB UNIQUE constraint
//      prevents the same run from appearing twice regardless of UI tricks
//    • Cooldown timer blocks rapid re-submissions within a page session
//    • Score must be > 0 to submit
//    • Wallet must be connected
//  For a production leaderboard, move score submission to a Supabase Edge
//  Function that verifies the wallet signature before writing to the DB.
// ──────────────────────────────────────────────────────────────────

const TABLE = 'leaderboard_scores';
const SUBMIT_COOLDOWN_MS = 10_000; // 10 s between submissions

window.LeaderboardAPI = (() => {
  let _db              = null;
  let _lastSubmitMs    = 0;
  let _submittedRunIds = new Set(); // tracks run IDs submitted this page session
  let _activeTab       = 'global';

  // ── Lazy Supabase client ─────────────────────────────────────────
  function _getDb() {
    if (_db) return _db;
    if (!window.supabase) throw new Error('Supabase SDK not loaded.');
    if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
      throw new Error(
        'Supabase not configured — paste your URL and anon key into leaderboard.js'
      );
    }
    _db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _db;
  }

  // ── Submit current game score ─────────────────────────────────────
  async function submit() {
    const btn = document.getElementById('btn-submit-score');
    _setSubmitState(btn, 'loading');

    // ── Guards ────────────────────────────────────────────────────────
    if (!window.WalletAPI?.isConnected()) {
      _showError('Connect your Pera Wallet first.');
      _setSubmitState(btn, 'idle');
      return;
    }

    const now = Date.now();
    if (now - _lastSubmitMs < SUBMIT_COOLDOWN_MS) {
      const wait = Math.ceil((SUBMIT_COOLDOWN_MS - (now - _lastSubmitMs)) / 1000);
      _showError(`Please wait ${wait}s before submitting again.`);
      _setSubmitState(btn, 'idle');
      return;
    }

    if (!window.ScoreModal) {
      _showError('Game not ready — play a round first.');
      _setSubmitState(btn, 'idle');
      return;
    }

    const payload = ScoreModal.getPayload();

    if (payload.score <= 0) {
      _showError('Score must be greater than $0 to submit.');
      _setSubmitState(btn, 'idle');
      return;
    }

    if (_submittedRunIds.has(payload.runId)) {
      _showError('This run has already been submitted!');
      _setSubmitState(btn, 'idle');
      return;
    }

    // ── Sign the payload (non-fatal if wallet doesn't support signData) ──
    const signingPayload = {
      wallet:    WalletAPI.getAddress(),
      score:     payload.score,
      run_id:    payload.runId,
      timestamp: Date.now(),
    };
    const signature = await WalletAPI.signScorePayload(signingPayload);

    // ── Submit to Supabase ────────────────────────────────────────────
    const displayName = (
      document.getElementById('score-name')?.value.trim() || 'Anonymous'
    ).slice(0, 20);

    const collectionFlags = WalletAPI.getCollectionFlags?.() ?? {};

    try {
      const { error } = await _getDb().from(TABLE).upsert({
        run_id:           payload.runId,
        wallet_address:   WalletAPI.getAddress(),
        display_name:     displayName,
        score:            payload.score,
        total_earned:     payload.totalEarned,
        level:            payload.level,
        beauty:           payload.beauty,
        animals_count:    payload.animals,
        nft_holder:       WalletAPI.isSupportedHolder(),
        collection_flags: collectionFlags,
        signed_message:   signature ?? null,
      }, { onConflict: 'run_id' });

      if (error) throw error;

      _lastSubmitMs = Date.now();
      _submittedRunIds.add(payload.runId);
      _setSubmitState(btn, 'done');
      _clearError();

      // Reload preview board then close overlay after 1.8 s
      await loadTop10('leaderboard-preview-body');
      setTimeout(() => ScoreModal.complete(), 1800);

    } catch (err) {
      console.error('[Leaderboard] submit error:', err);
      _showError(`Submission failed: ${err.message}`);
      _setSubmitState(btn, 'idle');
    }
  }

  // ── Load top-10 preview (used inside score overlay) ─────────────
  async function loadTop10(tbodyId = 'leaderboard-preview-body') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:8px">Loading…</td></tr>';

    try {
      const { data, error } = await _getDb()
        .from(TABLE)
        .select('display_name, score, level, nft_holder')
        .order('score',      { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      const rows = (data || []).map((r, i) => {
        const cls = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '';
        return `<tr class="${cls}">
          <td>${i + 1}</td>
          <td>${_esc(r.display_name)}${r.nft_holder ? ' 🏆' : ''}</td>
          <td>Lv${r.level}</td>
          <td>$${r.score.toLocaleString()}</td>
        </tr>`;
      }).join('');

      tbody.innerHTML = rows ||
        '<tr><td colspan="4" style="text-align:center;padding:8px">No scores yet — be first!</td></tr>';

    } catch (err) {
      tbody.innerHTML =
        `<tr><td colspan="4" style="color:#e94560;text-align:center">${err.message}</td></tr>`;
    }
  }

  // ── Load full leaderboard for the modal ──────────────────────────
  async function loadLeaderboard(filter = 'global') {
    _activeTab = filter;
    const tbody = document.getElementById('leaderboard-modal-body');
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:16px">Loading…</td></tr>';

    try {
      let query = _getDb()
        .from(TABLE)
        .select('wallet_address, display_name, score, level, nft_holder, collection_flags, created_at')
        .order('score',      { ascending: false })
        .order('created_at', { ascending: true }) // tie-break: older score wins
        .limit(25);

      if (filter === 'holders') {
        query = query.eq('nft_holder', true);
      } else if (filter === 'weekly') {
        // Last 7 days
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;

      renderLeaderboard(data || [], tbody);

    } catch (err) {
      console.error('[Leaderboard] load error:', err);
      tbody.innerHTML =
        `<tr><td colspan="7" style="text-align:center;color:#e94560">` +
        `Error: ${err.message}</td></tr>`;
    }
  }

  // ── Load current wallet's personal best ──────────────────────────
  async function loadMyBestScore() {
    const walletAddress = window.WalletAPI?.getAddress();
    const el = document.getElementById('my-best-score');
    if (!el) return;

    if (!walletAddress) { el.textContent = 'Connect wallet to see your best score'; return; }
    el.textContent = 'Loading…';

    try {
      const { data, error } = await _getDb()
        .from(TABLE)
        .select('score, level, display_name, created_at')
        .eq('wallet_address', walletAddress)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) { el.textContent = 'No scores yet — play a round!'; return; }

      el.innerHTML =
        `<strong style="color:#ffd700">$${data.score.toLocaleString()}</strong>` +
        ` &nbsp;·&nbsp; Lv${data.level}` +
        ` &nbsp;·&nbsp; ${_esc(data.display_name)}`;
    } catch {
      el.textContent = 'Could not load.';
    }
  }

  // ── Render entries into a <tbody> element ─────────────────────────
  function renderLeaderboard(entries, tbodyEl) {
    if (!entries.length) {
      tbodyEl.innerHTML =
        '<tr><td colspan="7" style="text-align:center;padding:16px">' +
        'No scores yet — be the first!</td></tr>';
      return;
    }

    tbodyEl.innerHTML = entries.map((r, i) => {
      const cls    = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '';
      const wallet = window.WalletAPI?.formatAddress(r.wallet_address)
                     ?? (r.wallet_address.slice(0, 6) + '…' + r.wallet_address.slice(-4));
      const date   = new Date(r.created_at).toLocaleDateString();
      const badges = window.HolderPerks?.badgesForFlags(r.collection_flags) ?? '';
      return `<tr class="${cls}">
        <td class="lb-rank">${i + 1}</td>
        <td>${_esc(r.display_name)}${r.nft_holder ? ' <span class="nft-badge">🏆</span>' : ''}</td>
        <td class="lb-wallet">${wallet}</td>
        <td>Lv${r.level}</td>
        <td class="lb-score">$${r.score.toLocaleString()}</td>
        <td class="lb-badges">${badges}</td>
        <td class="lb-date">${date}</td>
      </tr>`;
    }).join('');
  }

  // ── Show / hide full leaderboard modal ───────────────────────────
  function showBoard() {
    const modal = document.getElementById('leaderboard-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    _setActiveTab('global');
    loadLeaderboard('global');
    if (window.WalletAPI?.isConnected()) loadMyBestScore();
  }

  function hideBoard() {
    document.getElementById('leaderboard-modal')?.classList.add('hidden');
  }

  // ── Tab switcher (called from HTML onclick) ───────────────────────
  function switchTab(filter) {
    _setActiveTab(filter);
    loadLeaderboard(filter);
    if (filter === 'my' && window.WalletAPI?.isConnected()) loadMyBestScore();
  }

  function _setActiveTab(filter) {
    document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function _esc(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _showError(msg) {
    const el = document.getElementById('submit-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else      alert(msg);
  }

  function _clearError() {
    const el = document.getElementById('submit-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }

  function _setSubmitState(btn, state) {
    if (!btn) return;
    if (state === 'loading') {
      btn.disabled     = true;
      btn.textContent  = '⏳ Submitting…';
    } else if (state === 'done') {
      btn.disabled     = true;
      btn.textContent  = '✅ Submitted!';
    } else { // idle
      btn.disabled     = !window.WalletAPI?.isConnected();
      btn.textContent  = '📤 Submit Score';
    }
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    submit,
    loadTop10,
    loadLeaderboard,
    loadMyBestScore,
    renderLeaderboard,
    showBoard,
    hideBoard,
    switchTab,
  };
})();

// Expose switchTab as a plain global so HTML onclick="switchLBTab(...)" works
function switchLBTab(filter) {
  if (window.LeaderboardAPI) LeaderboardAPI.switchTab(filter);
}
