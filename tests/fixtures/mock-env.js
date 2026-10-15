/**
 * Lightweight mock browser environment for testing Coursera Assistant in Node.js
 */

function createMockChrome() {
  const listeners = {
    message: [],
    installed: [],
    command: [],
    tabRemoved: []
  };

  const storage = {
    local: {},
    sync: {}
  };

  return {
    runtime: {
      lastError: null,
      onInstalled: {
        addListener(fn) { listeners.installed.push(fn); }
      },
      onMessage: {
        addListener(fn) { listeners.message.push(fn); }
      },
      openOptionsPage() {},
      sendMessage(msg, cb) {
        if (typeof cb === "function") cb({ ok: true });
      }
    },
    tabs: {
      sendMessage(tabId, msg, cb) {
        if (typeof cb === "function") cb({ ok: true });
      },
      onRemoved: {
        addListener(fn) { listeners.tabRemoved.push(fn); }
      }
    },
    windows: {
      get: async (id) => ({ id, focused: true }),
      create: async (opts) => ({ id: 999, ...opts }),
      update: async (id, opts) => ({ id, ...opts })
    },
    commands: {
      onCommand: {
        addListener(fn) { listeners.command.push(fn); }
      }
    },
    action: {
      openPopup: async () => {}
    },
    storage: {
      local: {
        get(keys, cb) {
          const res = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => { res[k] = storage.local[k]; });
          } else if (typeof keys === "string") {
            res[keys] = storage.local[keys];
          } else if (keys && typeof keys === "object") {
            Object.keys(keys).forEach(k => { res[k] = storage.local[k] ?? keys[k]; });
          }
          if (typeof cb === "function") cb(res);
          return Promise.resolve(res);
        },
        set(obj, cb) {
          Object.assign(storage.local, obj);
          if (typeof cb === "function") cb();
          return Promise.resolve();
        }
      },
      sync: {
        get(keys, cb) {
          const res = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => { res[k] = storage.sync[k]; });
          }
          if (typeof cb === "function") cb(res);
          return Promise.resolve(res);
        },
        set(obj, cb) {
          Object.assign(storage.sync, obj);
          if (typeof cb === "function") cb();
          return Promise.resolve();
        }
      }
    },
    _listeners: listeners,
    _storage: storage
  };
}

module.exports = {
  createMockChrome
};
