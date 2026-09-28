/**
 * AutoCoursera / Coursera Assistant Update Manager
 * 
 * Provides remote GitHub-based update management, semantic version comparison,
 * dual-mode mandatory/optional update enforcement, and first-launch onboarding.
 */
(function (global) {
  'use strict';

  const CONFIG_URL = 'https://raw.githubusercontent.com/Cicada33016/coursera-assistant/main/update.json';
  const REPO_URL = 'https://github.com/Cicada33016/coursera-assistant';
  const DEFAULT_RELEASE_URL = 'https://github.com/Cicada33016/coursera-assistant/releases/latest';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache duration
  const FETCH_TIMEOUT_MS = 6000; // 6 seconds timeout

  const STORAGE_KEYS = {
    FIRST_LAUNCH_COMPLETED: 'firstLaunchCompleted',
    STAR_PROMPT_SHOWN: 'githubStarPromptShown',
    LAST_UPDATE_CHECK: 'lastUpdateCheck',
    LATEST_KNOWN_VERSION: 'latestKnownVersion',
    MIN_SUPPORTED_VERSION: 'minimumSupportedVersion',
    KNOWN_UPDATE_REQUIRED: 'knownUpdateRequired',
    CACHED_RELEASE_URL: 'cachedReleaseUrl',
    CACHED_UPDATE_STATE: 'cachedUpdateState'
  };

  /**
   * Parses a semantic version string (e.g., "1.4.0", "v1.2.10", "1.5.0-beta.1")
   * @param {string} versionStr
   * @returns {{ major: number, minor: number, patch: number, prerelease: string|null }|null}
   */
  function parseSemVer(versionStr) {
    if (typeof versionStr !== 'string') return null;
    const clean = versionStr.trim().replace(/^v/i, '');
    if (!clean) return null;

    const [core, prerelease] = clean.split('-');
    const parts = core.split('.').map(p => {
      const num = parseInt(p, 10);
      return isNaN(num) ? 0 : num;
    });

    while (parts.length < 3) parts.push(0);

    return {
      major: parts[0],
      minor: parts[1],
      patch: parts[2],
      prerelease: prerelease || null
    };
  }

  /**
   * Compares two semantic version strings.
   * Returns:
   *   > 0 if v1 > v2
   *   < 0 if v1 < v2
   *   0 if v1 == v2
   *
   * Properly evaluates:
   *   compareVersions("1.2.10", "1.2.9") > 0
   *   compareVersions("1.10.0", "1.9.0") > 0
   *   compareVersions("2.0.0", "1.9.9") > 0
   *   compareVersions("1.4.0", "1.4.0") === 0
   */
  function compareVersions(v1, v2) {
    const p1 = parseSemVer(v1);
    const p2 = parseSemVer(v2);

    if (!p1 && !p2) return 0;
    if (!p1) return -1;
    if (!p2) return 1;

    if (p1.major !== p2.major) return p1.major - p2.major;
    if (p1.minor !== p2.minor) return p1.minor - p2.minor;
    if (p1.patch !== p2.patch) return p1.patch - p2.patch;

    // Prerelease comparison: release > prerelease
    if (!p1.prerelease && p2.prerelease) return 1;
    if (p1.prerelease && !p2.prerelease) return -1;
    if (p1.prerelease && p2.prerelease) {
      return p1.prerelease.localeCompare(p2.prerelease);
    }

    return 0;
  }

  /**
   * Evaluates the update state given an installed version and remote configuration.
   * 
   * Decision Logic:
   * if installedVersion < minimumSupportedVersion:
   *     mandatory update
   *     required target = minimumSupportedVersion
   *     reason = 'BELOW_MINIMUM'
   * 
   * else if updateRequired == true AND installedVersion < latestVersion:
   *     mandatory update
   *     required target = latestVersion
   *     reason = 'UPDATE_REQUIRED_FLAG'
   * 
   * else if installedVersion < latestVersion:
   *     optional update
   *     target = latestVersion
   *     reason = 'NEWER_AVAILABLE'
   * 
   * else:
   *     up to date
   *     target = latestVersion
   *     reason = 'CURRENT'
   * 
   * @param {string} installedVersion
   * @param {object} config - Remote update configuration
   * @returns {object} Evaluated state
   */
  function evaluateUpdateState(installedVersion, config) {
    const installed = String(installedVersion || '1.0.0').trim();

    if (!config || typeof config !== 'object') {
      return {
        status: 'UP_TO_DATE',
        reason: 'INVALID_CONFIG',
        targetVersion: installed,
        releaseUrl: DEFAULT_RELEASE_URL,
        installedVersion: installed,
        latestVersion: installed,
        minimumSupportedVersion: installed,
        updateRequired: false
      };
    }

    const latestVersion = String(config.latestVersion || installed).trim();
    const minimumSupportedVersion = String(config.minimumSupportedVersion || installed).trim();
    const updateRequired = Boolean(config.updateRequired);
    const releaseUrl = (typeof config.releaseUrl === 'string' && config.releaseUrl.trim())
      ? config.releaseUrl.trim()
      : DEFAULT_RELEASE_URL;

    // RULE 1: installedVersion < minimumSupportedVersion => MANDATORY
    if (compareVersions(installed, minimumSupportedVersion) < 0) {
      return {
        status: 'MANDATORY',
        reason: 'BELOW_MINIMUM',
        targetVersion: minimumSupportedVersion,
        releaseUrl: releaseUrl,
        installedVersion: installed,
        latestVersion: latestVersion,
        minimumSupportedVersion: minimumSupportedVersion,
        updateRequired: updateRequired
      };
    }

    // RULE 2: updateRequired == true AND installedVersion < latestVersion => MANDATORY
    if (updateRequired === true && compareVersions(installed, latestVersion) < 0) {
      return {
        status: 'MANDATORY',
        reason: 'UPDATE_REQUIRED_FLAG',
        targetVersion: latestVersion,
        releaseUrl: releaseUrl,
        installedVersion: installed,
        latestVersion: latestVersion,
        minimumSupportedVersion: minimumSupportedVersion,
        updateRequired: updateRequired
      };
    }

    // RULE 3: installedVersion < latestVersion => OPTIONAL
    if (compareVersions(installed, latestVersion) < 0) {
      return {
        status: 'OPTIONAL',
        reason: 'NEWER_AVAILABLE',
        targetVersion: latestVersion,
        releaseUrl: releaseUrl,
        installedVersion: installed,
        latestVersion: latestVersion,
        minimumSupportedVersion: minimumSupportedVersion,
        updateRequired: updateRequired
      };
    }

    // RULE 4: UP_TO_DATE
    return {
      status: 'UP_TO_DATE',
      reason: 'CURRENT',
      targetVersion: latestVersion,
      releaseUrl: releaseUrl,
      installedVersion: installed,
      latestVersion: latestVersion,
      minimumSupportedVersion: minimumSupportedVersion,
      updateRequired: updateRequired
    };
  }

  /**
   * Fetches the remote update configuration from GitHub.
   * @param {string} [url]
   * @param {number} [timeoutMs]
   * @returns {Promise<object>}
   */
  async function fetchRemoteConfig(url = CONFIG_URL, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      // Append cache-busting timestamp to avoid raw.githubusercontent.com CDN caching
      const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const response = await fetch(cacheBustUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('GitHub returned HTTP ' + response.status + ' ' + response.statusText);
      }

      const data = await response.json();

      // Validate parsed JSON
      if (!data || typeof data !== 'object') {
        throw new Error('Malformed JSON payload received from GitHub update endpoint');
      }

      if (typeof data.latestVersion !== 'string' || !data.latestVersion.trim()) {
        throw new Error('Missing or invalid "latestVersion" in remote update configuration');
      }

      if (typeof data.minimumSupportedVersion !== 'string' || !data.minimumSupportedVersion.trim()) {
        throw new Error('Missing or invalid "minimumSupportedVersion" in remote update configuration');
      }

      return {
        latestVersion: data.latestVersion.trim(),
        minimumSupportedVersion: data.minimumSupportedVersion.trim(),
        updateRequired: Boolean(data.updateRequired),
        releaseUrl: (typeof data.releaseUrl === 'string' && data.releaseUrl.trim())
          ? data.releaseUrl.trim()
          : DEFAULT_RELEASE_URL
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Storage helper for chrome.storage.local
   */
  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      } else {
        resolve({});
      }
    });
  }

  function storageSet(items) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(items, () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Retrieves installed extension version.
   */
  function getInstalledVersion() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version || '1.0.0';
      }
    } catch (e) {}
    return '1.0.0';
  }

  // In-flight promise to avoid duplicate concurrent update checks
  let inFlightCheck = null;

  /**
   * Performs an update check with caching, storage fallback, and error handling.
   * 
   * @param {boolean} [forceRefresh=false]
   * @param {string} [customInstalledVersion]
   * @returns {Promise<object>} Evaluated update state
   */
  async function checkForUpdates(forceRefresh = false, customInstalledVersion = null) {
    if (inFlightCheck && !forceRefresh) {
      return inFlightCheck;
    }

    inFlightCheck = (async () => {
      const installed = customInstalledVersion || getInstalledVersion();
      const storage = await storageGet([
        STORAGE_KEYS.LAST_UPDATE_CHECK,
        STORAGE_KEYS.CACHED_UPDATE_STATE,
        STORAGE_KEYS.LATEST_KNOWN_VERSION,
        STORAGE_KEYS.MIN_SUPPORTED_VERSION,
        STORAGE_KEYS.KNOWN_UPDATE_REQUIRED,
        STORAGE_KEYS.CACHED_RELEASE_URL
      ]);

      const lastCheck = storage[STORAGE_KEYS.LAST_UPDATE_CHECK] || 0;
      const isFresh = (Date.now() - lastCheck) < CACHE_TTL_MS;
      const cachedState = storage[STORAGE_KEYS.CACHED_UPDATE_STATE];

      // Return fresh cached result if not force-refreshing
      if (!forceRefresh && isFresh && cachedState && typeof cachedState === 'object') {
        // Re-evaluate against the current installed version in case of extension updates
        return evaluateUpdateState(installed, {
          latestVersion: cachedState.latestVersion,
          minimumSupportedVersion: cachedState.minimumSupportedVersion,
          updateRequired: cachedState.updateRequired,
          releaseUrl: cachedState.releaseUrl
        });
      }

      // Attempt live fetch from GitHub
      try {
        const config = await fetchRemoteConfig();
        const state = evaluateUpdateState(installed, config);

        // Persist fresh verified state to local storage
        await storageSet({
          [STORAGE_KEYS.LAST_UPDATE_CHECK]: Date.now(),
          [STORAGE_KEYS.LATEST_KNOWN_VERSION]: config.latestVersion,
          [STORAGE_KEYS.MIN_SUPPORTED_VERSION]: config.minimumSupportedVersion,
          [STORAGE_KEYS.KNOWN_UPDATE_REQUIRED]: config.updateRequired,
          [STORAGE_KEYS.CACHED_RELEASE_URL]: config.releaseUrl,
          [STORAGE_KEYS.CACHED_UPDATE_STATE]: state
        });

        return state;
      } catch (networkError) {
        console.warn('[AutoCoursera UpdateManager] Remote check failed:', networkError.message);

        // Fail-safe handling:
        // If a mandatory update was already confirmed and cached, preserve enforcement so restarts don't drop it.
        if (cachedState && cachedState.status === 'MANDATORY') {
          return evaluateUpdateState(installed, {
            latestVersion: cachedState.latestVersion,
            minimumSupportedVersion: cachedState.minimumSupportedVersion,
            updateRequired: cachedState.updateRequired,
            releaseUrl: cachedState.releaseUrl
          });
        }

        // If no confirmed mandatory state, DO NOT lock out the user due to temporary network issues.
        // Return cached optional or UP_TO_DATE fallback.
        if (cachedState && typeof cachedState === 'object') {
          return evaluateUpdateState(installed, {
            latestVersion: cachedState.latestVersion,
            minimumSupportedVersion: cachedState.minimumSupportedVersion,
            updateRequired: cachedState.updateRequired,
            releaseUrl: cachedState.releaseUrl
          });
        }

        return {
          status: 'UP_TO_DATE',
          reason: 'NETWORK_FALLBACK',
          targetVersion: installed,
          releaseUrl: DEFAULT_RELEASE_URL,
          installedVersion: installed,
          latestVersion: installed,
          minimumSupportedVersion: installed,
          updateRequired: false,
          networkError: true
        };
      }
    })();

    try {
      return await inFlightCheck;
    } finally {
      inFlightCheck = null;
    }
  }

  /**
   * First-launch GitHub onboarding:
   * Detects first launch, opens the GitHub repo in a new tab once,
   * and indicates whether to show the star prompt.
   * 
   * @returns {Promise<{ isFirstLaunch: boolean, showStarPrompt: boolean }>}
   */
  async function handleFirstLaunch() {
    const data = await storageGet([
      STORAGE_KEYS.FIRST_LAUNCH_COMPLETED,
      STORAGE_KEYS.STAR_PROMPT_SHOWN
    ]);

    if (!data[STORAGE_KEYS.FIRST_LAUNCH_COMPLETED]) {
      // Mark completed immediately to prevent race conditions from opening multiple tabs
      await storageSet({
        [STORAGE_KEYS.FIRST_LAUNCH_COMPLETED]: true,
        [STORAGE_KEYS.STAR_PROMPT_SHOWN]: true
      });

      // Open official GitHub repository in a new browser tab
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: REPO_URL });
        }
      } catch (e) {
        console.warn('[AutoCoursera UpdateManager] Could not open first-launch tab:', e);
      }

      return {
        isFirstLaunch: true,
        showStarPrompt: true
      };
    }

    return {
      isFirstLaunch: false,
      showStarPrompt: false
    };
  }

  const AutoCourseraUpdateManager = {
    CONFIG_URL,
    REPO_URL,
    DEFAULT_RELEASE_URL,
    STORAGE_KEYS,
    parseSemVer,
    compareVersions,
    evaluateUpdateState,
    fetchRemoteConfig,
    checkForUpdates,
    handleFirstLaunch,
    getInstalledVersion
  };

  // Export to global scope for browser & service worker
  global.AutoCourseraUpdateManager = AutoCourseraUpdateManager;

  // Export for CommonJS / Node.js automated test runner
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoCourseraUpdateManager;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
