'use strict';
// ================================================================
//  WALLET MODULE  —  Pera Wallet (Algorand) + NFT detection
//  Exposes: window.WalletAPI
//
//  HOW TO SET UP:
//  1. No credentials needed for basic wallet connection
//  2. Fill in SUPPORTED_ASSET_IDS to enable NFT holder detection
//  3. Fill in ASSET_TO_ANIMAL to unlock animals from NFT ownership
// ================================================================

// ──────────────────────────────────────────────────────────────────
//  CONFIG  —  Edit these for your Crazy-ASS Zoologists collection
// ──────────────────────────────────────────────────────────────────

// TODO: Add your NFT collection's Algorand Standard Asset (ASA) IDs here
// Example: const SUPPORTED_ASSET_IDS = [123456789, 987654321];
const SUPPORTED_ASSET_IDS = [
  // 123456789,   // example NFT asset ID
];

// TODO: Map specific ASA IDs to in-game animal keys
// When a player holds this asset, that animal is highlighted / unlocked
// Animal keys: 'donkey','mega_donkey','cheetah','lion','tiger','elephant',
//              'giraffe','zebra','monkey','panda','penguin','crocodile',
//              'flamingo','butterfly','spider','snake','fish','dolphin','shark'
const ASSET_TO_ANIMAL = {
  // 123456789: 'lion',
  // 987654321: 'shark',
};

// Free public Algorand indexer — no API key required
// Use 'https://testnet-idx.algonode.cloud' for testnet during development
const ALGO_INDEXER = 'https://mainnet-idx.algonode.cloud';

// ──────────────────────────────────────────────────────────────────
//  MODULE  (IIFE — private state, exposed via window.WalletAPI)
// ──────────────────────────────────────────────────────────────────
window.WalletAPI = (() => {
  let _peraClient  = null;   // PeraWalletConnect instance (lazy)
  let _address     = null;   // connected wallet address string or null
  let _assets      = [];     // raw Algorand asset list from indexer
  let _reconnected = false;  // prevents double-reconnect on page load

  // ── Get (or create) Pera client ─────────────────────────────────
  // PeraWalletConnect is assigned to window by the <script type="module">
  // in index.html. Reading it lazily here means it's always ready by the
  // time a user clicks "Connect Wallet".
  function _getClient() {
    if (_peraClient) return _peraClient;
    if (!window.PeraWalletConnect) {
      throw new Error(
        'Pera Wallet SDK not loaded. ' +
        'Check the <script type="module"> tag in index.html.'
      );
    }
    _peraClient = new window.PeraWalletConnect();
    // Handle wallet-initiated disconnects (e.g. user removes session in Pera app)
    _peraClient.connector?.on('disconnect', _handleDisconnect);
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
      }
    } catch (err) {
      // 'CONNECT_MODAL_CLOSED' = user cancelled — not an error worth alerting
      if (err?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        console.error('[WalletAPI] connect error:', err);
        alert('Wallet connection failed.\nMake sure Pera Wallet is installed and try again.');
      }
      _updateUI('disconnected');
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────
  function disconnect() {
    try { _peraClient?.disconnect(); } catch {}
    _handleDisconnect();
  }

  // ── Internal: after a successful connection ──────────────────────
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

  // ── Auto-reconnect existing Pera session on page load ───────────
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

  // ── Fetch assets from public Algorand indexer ────────────────────
  async function _fetchAssets(address) {
    try {
      const res = await fetch(
        `${ALGO_INDEXER}/v2/accounts/${address}?include-all=false`
      );
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

  // ── Highlight NFT-unlocked animal buttons in the sidebar ─────────
  function _applyNFTUnlocks() {
    getUnlockedAnimals().forEach(animalKey => {
      const btn = document.getElementById(`btn-${animalKey}`);
      if (btn) {
        btn.style.borderColor = '#ffd700';
        btn.setAttribute('title', '🔓 Unlocked by your NFT!');
      }
    });
  }

  // ── Shorten a long Algorand address ─────────────────────────────
  function formatAddress(addr) {
    if (!addr || addr.length < 10) return addr || '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  // ── Getters ──────────────────────────────────────────────────────
  function getAddress() { return _address; }
  function isConnected() { return !!_address; }
  function getAssets()   { return _assets; }

  // ── Sync all wallet-related UI elements ──────────────────────────
  function _updateUI(state) {
    const connected = (state === 'connected');

    // ── Top bar: wallet status badge ────────────────────────────────
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

    // ── Top bar: disconnect button ───────────────────────────────────
    const discBtn = document.getElementById('btn-disconnect-wallet');
    if (discBtn) discBtn.style.display = connected ? 'inline-flex' : 'none';

    // ── Main menu: connect / info ────────────────────────────────────
    const menuConnBtn  = document.getElementById('menu-btn-connect');
    const menuInfoEl   = document.getElementById('menu-wallet-info');
    if (menuConnBtn) menuConnBtn.style.display = connected ? 'none'  : 'block';
    if (menuInfoEl)  {
      menuInfoEl.style.display = connected ? 'block' : 'none';
      menuInfoEl.textContent   = connected
        ? `✅ ${formatAddress(_address)}${isSupportedHolder() ? '  ·  🏆 Holder' : ''}`
        : '';
    }

    // ── Score overlay: wallet status line ────────────────────────────
    const overlayStatus = document.getElementById('overlay-wallet-status');
    if (overlayStatus) {
      overlayStatus.innerHTML = connected
        ? `✅ <strong>${formatAddress(_address)}</strong>` +
          (isSupportedHolder() ? ' &nbsp;<span class="nft-badge">🏆 Holder</span>' : '')
        : 'No wallet connected';
    }

    // ── Score overlay: connect / disconnect buttons ──────────────────
    const oConnBtn = document.getElementById('overlay-btn-connect');
    const oDiscBtn = document.getElementById('overlay-btn-disconnect');
    if (oConnBtn) oConnBtn.style.display = connected ? 'none'  : 'inline-block';
    if (oDiscBtn) oDiscBtn.style.display = connected ? 'inline-block' : 'none';

    // ── Score overlay: submit section vs connect prompt ──────────────
    const submitSection  = document.getElementById('score-submit-section');
    const connectPrompt  = document.getElementById('score-connect-prompt');
    if (submitSection)  submitSection.style.display = connected ? 'block' : 'none';
    if (connectPrompt)  connectPrompt.style.display  = connected ? 'none'  : 'block';

    // ── Submit button enabled state ──────────────────────────────────
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

// Try to restore a previous Pera session on page load.
// Small delay lets the <script type="module"> (Pera SDK) finish executing first.
window.addEventListener('load', () => {
  setTimeout(() => WalletAPI.tryReconnect(), 600);
});
