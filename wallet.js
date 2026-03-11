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
const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID';

// TODO: add your Crazy-ASS Zoologists NFT asset IDs (Algorand ASA IDs)
// Example: [123456789, 987654321]
const SUPPORTED_ASSET_IDS = [];

// TODO: map ASA IDs to in-game animal keys to unlock them for holders
// Example: { 123456789: 'lion', 987654321: 'shark' }
const ASSET_TO_ANIMAL = {};

// Free public Algorand indexer (no API key required)
// Switch to 'https://testnet-idx.algonode.cloud' during development
const ALGO_INDEXER = 'https://mainnet-idx.algonode.cloud';

// ──────────────────────────────────────────────────────────────────
//  SDK READINESS
//  The Pera ESM module script fires 'peraSDKReady' when done.
//  We queue connect() calls until that event fires.
// ──────────────────────────────────────────────────────────────────
let _sdkReady   = false;
let _sdkPromise = new Promise(resolve => {
  // If the SDK already loaded before this script ran, resolve immediately
  if (window.PeraWalletConnect) {
    _sdkReady = true;
    resolve();
    return;
  }
  window.addEventListener('peraSDKReady', () => {
    _sdkReady = true;
    resolve();
  }, { once: true });
});

// ──────────────────────────────────────────────────────────────────
//  MODULE  (IIFE — private state, exposed via window.WalletAPI)
// ──────────────────────────────────────────────────────────────────
window.WalletAPI = (() => {
  let _peraClient  = null;
  let _address     = null;
  let _assets      = [];
  let _reconnected = false;

  // ── Create Pera client (called once after SDK is ready) ──────────
  function _createClient() {
    if (_peraClient) return _peraClient;

    if (!window.PeraWalletConnect) {
      throw new Error(
        window._peraSDKError
          ? `Pera SDK failed to load: ${window._peraSDKError}`
          : 'Pera SDK not ready yet — try again in a moment.'
      );
    }

    if (WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') {
      throw new Error(
        'Missing WalletConnect Project ID.\n' +
        'Get a free one at cloud.walletconnect.com and paste it\n' +
        'into WALLETCONNECT_PROJECT_ID in wallet.js.'
      );
    }

    _peraClient = new window.PeraWalletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      // Metadata shown inside the Pera Wallet app during connection
      metadata: {
        name:        'Crazy-ASS Zoologists',
        description: 'NFT Zoo Tycoon',
        url:         window.location.origin,
        icons:       ['https://drdrank.github.io/Crazyasszoologists/favicon.ico'],
      },
    });

    // v2 disconnect event
    _peraClient.connector?.on?.('disconnect', _handleDisconnect);

    return _peraClient;
  }

  // ── Connect ──────────────────────────────────────────────────────
  async function connect() {
    _updateUI('connecting');
    try {
      // Wait for the ESM module to finish loading (usually instant after page load)
      await _sdkPromise;
      const client   = _createClient();
      const accounts = await client.connect();
      if (accounts && accounts.length > 0) {
        await _onConnected(accounts[0]);
      } else {
        _updateUI('disconnected');
      }
    } catch (err) {
      // User closed the QR modal — not an error worth showing
      const cancelled =
        err?.data?.type === 'CONNECT_MODAL_CLOSED' ||
        err?.message?.includes('closed') ||
        err?.message?.includes('cancelled');

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
    _address = address;
    _assets  = await _fetchAssets(address);
    _updateUI('connected');
    _applyNFTUnlocks();
    console.log(`[WalletAPI] Connected: ${address} | ${_assets.length} assets`);
  }

  function _handleDisconnect() {
    _address = null;
    _assets  = [];
    _updateUI('disconnected');
  }

  // ── Try to restore an existing Pera session on page load ─────────
  async function tryReconnect() {
    if (_reconnected) return;
    _reconnected = true;
    try {
      await _sdkPromise;
      if (window._peraSDKError) return; // SDK failed — skip silently
      const client   = _createClient();
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

  // ── NFT detection ────────────────────────────────────────────────
  function isSupportedHolder() {
    if (!SUPPORTED_ASSET_IDS.length) return false;
    const owned = new Set(_assets.map(a => a['asset-id']));
    return SUPPORTED_ASSET_IDS.some(id => owned.has(id));
  }

  function getUnlockedAnimals() {
    const owned = new Set(_assets.map(a => a['asset-id']));
    return Object.entries(ASSET_TO_ANIMAL)
      .filter(([id]) => owned.has(Number(id)))
      .map(([, animal]) => animal);
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
    getUnlockedAnimals,
    formatAddress,
    updateUI: _updateUI,
  };
})();

// Try to restore an existing Pera session when the page finishes loading
window.addEventListener('load', () => WalletAPI.tryReconnect());
