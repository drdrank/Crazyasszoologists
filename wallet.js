'use strict';
// ================================================================
//  WALLET MODULE  —  Pera Wallet v2 (WalletConnect v2)
//  Exposes: window.WalletAPI
//
//  SETUP CHECKLIST:
//  1. Get a free WalletConnect Project ID:
//       https://cloud.walletconnect.com  → New Project → copy Project ID
//  2. Paste it into WALLETCONNECT_PROJECT_ID below
//  3. (Optional) Add your NFT asset IDs to SUPPORTED_ASSET_IDS
//  4. (Optional) Map asset IDs to animals in ASSET_TO_ANIMAL
// ================================================================

// ──────────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────────

// TODO: paste your WalletConnect Project ID here
// Get one free at https://cloud.walletconnect.com → New Project
const WALLETCONNECT_PROJECT_ID = '3d59dcc2a9ef31507918429417f52823';

// TODO: add your Crazy-ASS Zoologists NFT asset IDs (Algorand ASA IDs)
// Example: [123456789, 987654321]
const SUPPORTED_ASSET_IDS = [];

// TODO: map ASA IDs to in-game animal keys to unlock them for holders
// Example: { 123456789: 'lion', 987654321: 'shark' }
const ASSET_TO_ANIMAL = {};

// ── NFT Collection definitions ────────────────────────────────────
// Each entry maps a collection key to its list of Algorand ASA IDs.
// Replace the empty arrays with your real ASA IDs when your NFTs are minted.
//
// To find an ASA ID:
//   - Open the asset on https://explorer.perawallet.app or https://algoexplorer.io
//   - The number in the URL is the ASA ID
const NFT_COLLECTIONS = {
  donkey:      { name: 'Donkey',         asaIds: [] },  // TODO: add Donkey ASA IDs
  mega_donkey: { name: 'Mega Donkey',    asaIds: [] },  // TODO: add Mega Donkey ASA IDs
  cheetah:     { name: 'Cheetah',        asaIds: [] },  // TODO: add Cheetah ASA IDs
  puffin:      { name: 'Poppin Puffins', asaIds: [] },  // TODO: add Puffin ASA IDs
};

// Free public Algorand indexer (no API key required)
// Switch to 'https://testnet-idx.algonode.cloud' during development
const ALGO_INDEXER = 'https://mainnet-idx.algonode.cloud';

// ──────────────────────────────────────────────────────────────────
//  SDK is pre-bundled in pera-wallet.js (loaded via <script> tag in
//  index.html) and assigns window.PeraWalletConnect synchronously.
//  No CDN or dynamic import needed.
// ──────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────
//  MODULE  (IIFE — private state, exposed via window.WalletAPI)
// ──────────────────────────────────────────────────────────────────
window.WalletAPI = (() => {
  let _peraClient       = null;
  let _address          = null;
  let _assets           = [];
  let _collectionFlags  = {};   // { donkey: bool, mega_donkey: bool, cheetah: bool, puffin: bool }
  let _reconnected      = false;

  // ── Get or create Pera client ────────────────────────────────────
  function _getClient() {
    if (_peraClient) return _peraClient;

    if (!window.PeraWalletConnect) {
      const detail = window._peraLoadError
        ? `Bundle error: ${window._peraLoadError}`
        : 'pera-wallet.js did not assign window.PeraWalletConnect';
      throw new Error(detail);
    }

    _peraClient = new window.PeraWalletConnect();
    _peraClient.connector?.on?.('disconnect', _handleDisconnect);
    return _peraClient;
  }

  // ── Connect ──────────────────────────────────────────────────────
  async function connect() {
    _updateUI('connecting');
    try {
      const client   = _getClient();
      const accounts = await client.connect();
      if (accounts && accounts.length > 0) {
        await _onConnected(accounts[0]);
      } else {
        _updateUI('disconnected');
      }
    } catch (err) {
      const cancelled =
        err?.data?.type === 'CONNECT_MODAL_CLOSED' ||
        err?.message?.toLowerCase().includes('closed') ||
        err?.message?.toLowerCase().includes('cancelled');

      if (!cancelled) {
        console.error('[WalletAPI] connect error:', err);
        alert(`Wallet connection failed:\n${err.message}`);
      }
      _updateUI('disconnected');
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────
  function disconnect() {
    try { _peraClient?.disconnect(); } catch {}
    _handleDisconnect();
  }

  // ── Internal: after successful connection ────────────────────────
  async function _onConnected(address) {
    _address          = address;
    _assets           = await _fetchAssets(address);
    _collectionFlags  = _detectCollections(_assets);
    _updateUI('connected');
    _applyNFTUnlocks();
    // Apply holder perks (holder_perks.js must load before wallet.js)
    if (window.HolderPerks) HolderPerks.apply(_collectionFlags);
    console.log(`[WalletAPI] Connected: ${address} | ${_assets.length} assets | flags:`, _collectionFlags);
  }

  function _handleDisconnect() {
    _address         = null;
    _assets          = [];
    _collectionFlags = {};
    if (window.HolderPerks) HolderPerks.apply({});
    _updateUI('disconnected');
  }

  // ── Try to restore an existing Pera session on page load ─────────
  async function tryReconnect() {
    if (_reconnected) return;
    _reconnected = true;
    try {
      const client   = _getClient();
      const accounts = await client.reconnectSession();
      if (accounts && accounts.length > 0) {
        await _onConnected(accounts[0]);
      }
    } catch {} // no prior session — silently ignore
  }

  // ── Fetch wallet assets from the free Algorand indexer ───────────
  async function _fetchAssets(address) {
    try {
      const res  = await fetch(`${ALGO_INDEXER}/v2/accounts/${address}?include-all=false`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.account?.assets || [];
    } catch (err) {
      console.warn('[WalletAPI] Could not fetch assets:', err);
      return [];
    }
  }

  // ── NFT / collection detection ────────────────────────────────────

  // Compute which named collections the wallet holds
  function _detectCollections(assets) {
    const owned = new Set(assets.map(a => a['asset-id']));
    const flags = {};
    for (const [key, col] of Object.entries(NFT_COLLECTIONS)) {
      flags[key] = col.asaIds.length > 0 && col.asaIds.some(id => owned.has(id));
    }
    return flags;
  }

  function isSupportedHolder() {
    // True if wallet holds at least one asset from any named collection
    if (Object.values(_collectionFlags).some(Boolean)) return true;
    // Fallback: check legacy SUPPORTED_ASSET_IDS list
    if (!SUPPORTED_ASSET_IDS.length) return false;
    const owned = new Set(_assets.map(a => a['asset-id']));
    return SUPPORTED_ASSET_IDS.some(id => owned.has(id));
  }

  function getCollectionFlags() { return { ..._collectionFlags }; }

  // Compact badge string e.g. "🫏🐴🏆" for the status bar / leaderboard
  function getHolderBadges() {
    return window.HolderPerks?.badgesForFlags(_collectionFlags) ?? '';
  }

  function getUnlockedAnimals() {
    const owned = new Set(_assets.map(a => a['asset-id']));
    return Object.entries(ASSET_TO_ANIMAL)
      .filter(([id]) => owned.has(Number(id)))
      .map(([, animal]) => animal);
  }

  // ── Signed message ────────────────────────────────────────────────
  // Signs a score payload with the connected Pera wallet so a backend
  // (e.g. a Supabase Edge Function) can verify authenticity.
  //
  // BACKEND VERIFICATION (Supabase Edge Function / Node.js):
  //   import algosdk from 'algosdk';
  //   const msgBytes  = new TextEncoder().encode(JSON.stringify(payload));
  //   const sigBytes  = Buffer.from(signature, 'base64');
  //   const pubKey    = algosdk.decodeAddress(walletAddress).publicKey;
  //   const valid     = algosdk.verifyBytes(msgBytes, sigBytes, pubKey);
  //   if (!valid) throw new Error('Invalid signature — score rejected');
  async function signScorePayload(payload) {
    if (!_peraClient || !_address) throw new Error('No wallet connected');
    const msgString = JSON.stringify(payload);
    const msgBytes  = new TextEncoder().encode(msgString);
    try {
      // @perawallet/connect v1.x signData API
      const signed = await _peraClient.signData(
        [{ data: msgBytes, message: 'Sign to submit your zoo score to the leaderboard' }],
        _address
      );
      return typeof signed[0] === 'string' ? signed[0] : btoa(String.fromCharCode(...signed[0]));
    } catch (err) {
      // User cancelled the signing request
      if (err?.data?.type === 'SIGN_TRANSACTIONS_CANCELLED') return null;
      console.warn('[WalletAPI] signData failed (wallet may not support it):', err.message);
      return null; // non-fatal — score is submitted unsigned
    }
  }

  // ── Highlight NFT-unlocked animal buttons in the game sidebar ────
  function _applyNFTUnlocks() {
    getUnlockedAnimals().forEach(key => {
      const btn = document.getElementById(`btn-${key}`);
      if (btn) {
        btn.style.borderColor = '#ffd700';
        btn.title = '🔓 Unlocked by your NFT!';
      }
    });
  }

  // ── Format a long Algorand address to ABCD…WXYZ ─────────────────
  function formatAddress(addr) {
    if (!addr || addr.length < 10) return addr || '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  // ── Getters ──────────────────────────────────────────────────────
  function getAddress()    { return _address; }
  function isConnected()   { return !!_address; }
  function getAssets()     { return _assets; }

  // ── Sync every wallet-related DOM element ────────────────────────
  function _updateUI(state) {
    const connected = (state === 'connected');

    // Top bar status badge
    const statusEl = document.getElementById('wallet-status');
    if (statusEl) {
      if (state === 'connected') {
        statusEl.textContent = `🔗 ${formatAddress(_address)}${isSupportedHolder() ? ' 🏆' : ''}`;
        statusEl.className   = 'wallet-status connected';
      } else if (state === 'connecting') {
        statusEl.textContent = '⏳ Connecting…';
        statusEl.className   = 'wallet-status';
      } else {
        statusEl.textContent = '🔌 No wallet';
        statusEl.className   = 'wallet-status';
      }
    }

    // Top bar disconnect button
    const discBtn = document.getElementById('btn-disconnect-wallet');
    if (discBtn) discBtn.style.display = connected ? 'inline-flex' : 'none';

    // Main menu
    const menuConn = document.getElementById('menu-btn-connect');
    const menuInfo = document.getElementById('menu-wallet-info');
    if (menuConn) menuConn.style.display = connected ? 'none'  : 'block';
    if (menuInfo) {
      menuInfo.style.display = connected ? 'block' : 'none';
      menuInfo.textContent   = connected
        ? `✅ ${formatAddress(_address)}${isSupportedHolder() ? '  ·  🏆 Holder' : ''}`
        : '';
    }

    // Score overlay
    const overlayStatus = document.getElementById('overlay-wallet-status');
    if (overlayStatus) {
      overlayStatus.innerHTML = connected
        ? `✅ <strong>${formatAddress(_address)}</strong>` +
          (isSupportedHolder() ? ' &nbsp;<span class="nft-badge">🏆 Holder</span>' : '')
        : 'No wallet connected';
    }

    const oConn = document.getElementById('overlay-btn-connect');
    const oDisc = document.getElementById('overlay-btn-disconnect');
    if (oConn) oConn.style.display = connected ? 'none'         : 'inline-block';
    if (oDisc) oDisc.style.display = connected ? 'inline-block' : 'none';

    const submitSection = document.getElementById('score-submit-section');
    const connectPrompt = document.getElementById('score-connect-prompt');
    if (submitSection) submitSection.style.display = connected ? 'block' : 'none';
    if (connectPrompt) connectPrompt.style.display  = connected ? 'none'  : 'block';

    // Submit button
    const submitBtn = document.getElementById('btn-submit-score');
    if (submitBtn) {
      submitBtn.disabled = !connected;
      submitBtn.title    = connected ? 'Submit your score' : 'Connect wallet first';
    }
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    connect,
    disconnect,
    tryReconnect,
    getAddress,
    isConnected,
    getAssets,
    isSupportedHolder,
    getCollectionFlags,
    getHolderBadges,
    getUnlockedAnimals,
    signScorePayload,
    formatAddress,
    updateUI: _updateUI,
  };
})();

// Try to restore an existing Pera session when the page finishes loading
window.addEventListener('load', () => WalletAPI.tryReconnect());
