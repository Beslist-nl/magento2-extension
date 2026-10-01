/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./node_modules/@beslist-nl/beslist-tracking-sdk/dist/index.js
// src/cookies/helpers/build-remove-cookie-strings.ts
function buildRemoveCookieStrings(key, options) {
  const path = options.path ?? "/";
  const base = `${key}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}` + (options.secure ? "; Secure" : "") + (options.sameSite ? `; SameSite=${options.sameSite}` : "");
  if (options.domain) {
    return { base, withDomain: `${base}; Domain=${options.domain}` };
  }
  return { base };
}

// src/cookies/helpers/build-set-cookie-string.ts
function buildSetCookieString(key, encodedValue, options) {
  let cookie = `${key}=${encodedValue}`;
  if (typeof options.seconds === "number" && Number.isFinite(options.seconds)) {
    cookie += `; Max-Age=${Math.floor(options.seconds)}`;
  }
  cookie += `; Path=${options.path ?? "/"}`;
  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }
  if (options.secure) {
    cookie += `; Secure`;
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  return cookie;
}

// src/cookies/helpers/normalize-cookie-options.ts
function normalizeCookieOptions(defaults, options = {}) {
  const merged = { ...defaults, ...options };
  merged.path ?? (merged.path = defaults.path ?? "/");
  merged.sameSite ?? (merged.sameSite = defaults.sameSite ?? "Lax");
  merged.secure ?? (merged.secure = defaults.secure ?? true);
  if (merged.sameSite === "None") {
    merged.secure = true;
  }
  return merged;
}

// src/cookies/helpers/read-cookie-value.ts
function readCookieValue(cookieString, key) {
  const cookies = cookieString.split(";");
  const prefix = `${key}=`;
  for (const raw of cookies) {
    const part = raw.trim();
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length).trim();
    }
  }
  return null;
}

// src/cookies/document-raw-cookie-storage.ts
var DocumentRawCookieStorage = class {
  async getCookieString() {
    return document.cookie ?? "";
  }
  async setCookieString(cookie) {
    document.cookie = cookie;
  }
};

// src/client-storage/adapters/cookie-storage-adapter.ts
var VALID_COOKIE_NAME = /^[\w.\-]+$/;
var CookieStorageAdapter = class {
  constructor(raw, options = {}) {
    this.raw = raw;
    this.defaults = {
      path: "/",
      secure: true,
      sameSite: "Lax",
      ...options
    };
  }
  normalizeOptions(options = {}) {
    return normalizeCookieOptions(this.defaults, options);
  }
  assertValidKey(key) {
    if (!VALID_COOKIE_NAME.test(key)) {
      throw new Error(`Invalid cookie name: "${key}". Cookie names must be alphanumeric, hyphens, underscores, or dots.`);
    }
  }
  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  async getItem(key) {
    this.assertValidKey(key);
    const cookieString = await this.raw.getCookieString();
    const value = readCookieValue(cookieString, key);
    return value === null ? null : this.safeDecode(value);
  }
  async setItem(key, value, options = {}) {
    this.assertValidKey(key);
    const cookieOptions = this.normalizeOptions(options);
    const encodedValue = encodeURIComponent(value);
    const cookie = buildSetCookieString(key, encodedValue, cookieOptions);
    await this.raw.setCookieString(cookie);
  }
  async removeItem(key, options = {}) {
    this.assertValidKey(key);
    const cookieOptions = this.normalizeOptions(options);
    const { base, withDomain } = buildRemoveCookieStrings(key, cookieOptions);
    if (withDomain) {
      await this.raw.setCookieString(withDomain);
    }
    await this.raw.setCookieString(base);
  }
};

// src/client-storage/adapters/create-web-storage-adapter.ts
function createWebStorageAdapter(storage) {
  return {
    async getItem(key) {
      return storage.getItem(key);
    },
    async setItem(key, value) {
      storage.setItem(key, value);
    },
    async removeItem(key) {
      storage.removeItem(key);
    }
  };
}

// src/client-storage/adapters/memory-storage.ts
var MemoryStorage = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async getItem(key) {
    return this.store.get(key) ?? null;
  }
  async setItem(key, value) {
    this.store.set(key, value);
  }
  async removeItem(key) {
    this.store.delete(key);
  }
};

// src/client-storage/repositories/array-repository.ts
var ArrayRepository = class {
  constructor(storage, key) {
    this.storage = storage;
    this.key = key;
  }
  async getAll() {
    return await this.storage.getItem(this.key, []);
  }
  async setAll(items) {
    await this.storage.setItem(this.key, items);
  }
  async enqueue(item) {
    const items = await this.getAll();
    items.push(item);
    await this.storage.setItem(this.key, items);
  }
  async removeAt(index) {
    const items = await this.getAll();
    if (index < 0 || index >= items.length) {
      return;
    }
    items.splice(index, 1);
    await this.storage.setItem(this.key, items);
  }
  async clear() {
    await this.storage.removeItem(this.key);
  }
};

// src/client-storage/serialization/json-key-value-storage.ts
var JsonKeyValueStorage = class {
  constructor(storage) {
    this.storage = storage;
  }
  async getItem(key, fallback) {
    const raw = await this.storage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  async setItem(key, value) {
    await this.storage.setItem(key, JSON.stringify(value));
  }
  async removeItem(key) {
    await this.storage.removeItem(key);
  }
};

// src/debug/logger.ts
var PREFIX = "BeslistTrackingSDK";
var LEVEL_RANK = {
  silent: 0,
  warn: 1,
  info: 2,
  debug: 3
};
var Logger = class {
  constructor(level, scope) {
    this.prefix = scope ? `[${PREFIX}:${scope}]` : `[${PREFIX}]`;
    this.rank = LEVEL_RANK[level];
  }
  tag(context) {
    return context ? `${this.prefix.slice(0, -1)}:${context}]` : this.prefix;
  }
  debug(message, context) {
    if (this.rank >= LEVEL_RANK.debug) {
      console.debug(`${this.tag(context)} ${message}`);
    }
  }
  info(message, context) {
    if (this.rank >= LEVEL_RANK.info) {
      console.info(`${this.tag(context)} ${message}`);
    }
  }
  warn(message, context) {
    if (this.rank >= LEVEL_RANK.warn) {
      console.warn(`${this.tag(context)} ${message}`);
    }
  }
  error(message, context) {
    if (this.rank >= LEVEL_RANK.warn) {
      console.error(`${this.tag(context)} ${message}`);
    }
  }
};
var NOOP_LOGGER = new Logger("silent");
function createLogger(level, scope) {
  if (!level || level === "silent") return NOOP_LOGGER;
  return new Logger(level, scope);
}

// src/events/sanitization/event-data-sanitizer.ts
function applyEventDataSanitizers(eventData, sanitizers) {
  return sanitizers.reduce((data, sanitize) => sanitize(data), eventData);
}

// src/constants/query-parameters.ts
var BESLIST_CLICK_ID_PARAMETER = "bl3nlclid";
var CLIENT_UUID_PARAMETER = "clientUuid";

// src/constants/tracking-parameters.ts
var KNOWN_TRACKING_PARAMETERS = [
  "gclid",
  "fbclid",
  "msclkid",
  "dclid",
  "yclid",
  "wbraid",
  "gbraid",
  "__hsfp",
  "__hssc",
  "__hstc",
  "__s",
  "_hsenc",
  "_openstat",
  "hsCtaTracking",
  "mc_eid",
  "mkt_tok",
  "ml_subscriber",
  "ml_subscriber_hash",
  "oly_anon_id",
  "oly_enc_id",
  "rb_clickid",
  "s_cid",
  "vero_conv",
  "vero_id",
  "wickedid"
];

// src/constants/attribution-parameters.ts
var ATTRIBUTION_PARAMETERS = {
  prefixes: ["utm_"],
  exact: [
    ...KNOWN_TRACKING_PARAMETERS,
    CLIENT_UUID_PARAMETER,
    BESLIST_CLICK_ID_PARAMETER
  ]
};

// src/constants/identity.ts
var USER_ID_COOKIE_NAME = "client_bslstuid";
var SESSION_ID_COOKIE_NAME = "client_bslstsid";
var SESSION_EXPIRE_MINUTES = 30;
var USER_EXPIRE_DAYS = 540;

// src/constants/transport.ts
var DEFAULT_ENDPOINT_URL = "https://ct.beslist.nl/ct_event";
var DEFAULT_COOKIELESS_PING_ENDPOINT_URL = "https://ct.beslist.nl/ct_state";

// src/events/sanitization/strip-unknown-query-params.ts
var allowedParams = new Set(ATTRIBUTION_PARAMETERS.exact.map((parameter) => parameter.toLowerCase()));
var allowedPrefixes = ATTRIBUTION_PARAMETERS.prefixes.map((prefix) => prefix.toLowerCase());
function isAllowedParam(key) {
  const lowerKey = key.toLowerCase();
  return allowedParams.has(lowerKey) || allowedPrefixes.some((prefix) => lowerKey.startsWith(prefix));
}
function stripQueryString(query) {
  const withoutLeading = query.startsWith("?") ? query.slice(1) : query;
  if (!withoutLeading) return "";
  const kept = withoutLeading.split("&").filter((param) => isAllowedParam(param.split("=")[0]));
  return kept.length > 0 ? `?${kept.join("&")}` : "";
}
function stripUnknownQueryParams(eventData) {
  return {
    ...eventData,
    location: {
      ...eventData.location,
      query: stripQueryString(eventData.location.query)
    }
  };
}

// src/functions/generate-beslist-id.ts
function generateBeslistID(includeDateSuffix = false, separator = ".") {
  let uuid = Math.floor(1e8 + Math.random() * 9e8).toString();
  if (includeDateSuffix) {
    uuid += separator + (/* @__PURE__ */ new Date()).getTime().toString();
  }
  return uuid;
}

// src/functions/get-attribution-params-present.ts
function getAttributionParamsPresent(query) {
  if (!query) {
    return [];
  }
  let params;
  try {
    params = new URLSearchParams(query);
  } catch {
    return [];
  }
  const exact = new Set(ATTRIBUTION_PARAMETERS.exact.map((parameter) => parameter.toLowerCase()));
  const prefixes = ATTRIBUTION_PARAMETERS.prefixes.map((prefix) => prefix.toLowerCase());
  const matched = [];
  const seen = /* @__PURE__ */ new Set();
  for (const name of params.keys()) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      continue;
    }
    const isMatch = exact.has(lower) || prefixes.some((prefix) => lower.startsWith(prefix));
    if (isMatch) {
      seen.add(lower);
      matched.push(name);
    }
  }
  return matched;
}

// src/functions/is-ip-address.ts
function isIpAddress(hostname) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }
  if (hostname.includes(":")) {
    return true;
  }
  return false;
}

// src/functions/get-cookie-domain-simple.ts
function getCookieDomainSimple(hostname) {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || !host.includes(".") || isIpAddress(host)) {
    return void 0;
  }
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return void 0;
  return parts.slice(-2).join(".");
}

// src/functions/get-event-priority.ts
var ATTRIBUTION_SESSION_START_REASONS = /* @__PURE__ */ new Set([
  "utm detected",
  "advertising param detected",
  "new uuid detected",
  "new bl3nlclid detected"
]);
function getEventPriority(eventData) {
  if (eventData.type === "conversion") {
    return "high";
  }
  if (eventData.type === "session_start") {
    const reasons = eventData.context?.sessionStartReasons ?? [];
    for (const reason of reasons) {
      if (ATTRIBUTION_SESSION_START_REASONS.has(reason)) {
        return "high";
      }
    }
  }
  return "normal";
}

// src/functions/get-session-start-reasons.ts
async function hasSessionIDCookie(cookieStorage) {
  return await cookieStorage.getItem(SESSION_ID_COOKIE_NAME) !== null;
}
function registrableHost(hostname) {
  return getCookieDomainSimple(hostname) ?? hostname;
}
function isExternalReferrer(referrer, currentHost) {
  if (referrer === "") {
    return true;
  }
  let referrerHostname;
  let currentHostname;
  try {
    referrerHostname = new URL(referrer).hostname;
    currentHostname = new URL(`http://${currentHost}`).hostname;
  } catch {
    return true;
  }
  return registrableHost(referrerHostname) !== registrableHost(currentHostname);
}
function resolveSessionStartReasons(hasSessionID, clientData, captureMidSessionReferrer = false) {
  const sessionStartReasons = [];
  if (!hasSessionID) {
    sessionStartReasons.push("no session id");
  }
  const referrer = clientData.location.referrer;
  const host = clientData.location.host;
  const isNewReferrer = captureMidSessionReferrer ? referrer !== "" && isExternalReferrer(referrer, host) : !hasSessionID && isExternalReferrer(referrer, host);
  if (isNewReferrer) {
    sessionStartReasons.push("new referrer");
  }
  const presentParams = getAttributionParamsPresent(clientData.location.query).map((name) => name.toLowerCase());
  const hasParam = (parameter) => presentParams.includes(parameter.toLowerCase());
  if (presentParams.some((name) => ATTRIBUTION_PARAMETERS.prefixes.some((prefix) => name.startsWith(prefix.toLowerCase())))) {
    sessionStartReasons.push("utm detected");
  }
  if (hasParam(CLIENT_UUID_PARAMETER)) {
    sessionStartReasons.push("new uuid detected");
  } else if (hasParam(BESLIST_CLICK_ID_PARAMETER)) {
    sessionStartReasons.push("new bl3nlclid detected");
  }
  if (KNOWN_TRACKING_PARAMETERS.some(hasParam)) {
    sessionStartReasons.push("advertising param detected");
  }
  return sessionStartReasons;
}
async function getSessionStartReasons(cookieStorage, clientData, captureMidSessionReferrer = false) {
  const hasSessionID = await hasSessionIDCookie(cookieStorage);
  return resolveSessionStartReasons(hasSessionID, clientData, captureMidSessionReferrer);
}

// src/functions/sha256-hex.ts
async function sha256Hex(input) {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return null;
    }
    const data = new TextEncoder().encode(input);
    const digest = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// src/events/beslist-event.ts
var BeslistEvent = class _BeslistEvent {
  constructor(eventData, sanitizers) {
    const data = sanitizers?.length ? applyEventDataSanitizers(eventData, sanitizers) : eventData;
    this.id = eventData.id ?? generateBeslistID();
    this.type = eventData.type;
    this.timestamp = eventData.timestamp || (/* @__PURE__ */ new Date()).getTime();
    this.shopID = eventData.shopID;
    this.userID = eventData.userID;
    this.sessionID = eventData.sessionID;
    this.screenWidth = data.screenWidth;
    this.screenHeight = data.screenHeight;
    this.userAgent = data.userAgent.substring(0, 255);
    this.language = data.language;
    this.location = data.location;
    this.context = data.context || {};
    this.ecommerce = data.ecommerce || {};
  }
  static isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  static stableSortValue(value, visiting, depth, maxDepth) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (depth > maxDepth) {
      return "[Max Depth Exceeded]";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (visiting.has(value)) {
        return "[Circular]";
      }
      visiting.add(value);
      const sortedArray = value.map(
        (item) => _BeslistEvent.stableSortValue(item, visiting, depth + 1, maxDepth)
      );
      visiting.delete(value);
      return sortedArray;
    }
    if (!_BeslistEvent.isPlainObject(value)) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    }
    if (visiting.has(value)) {
      return "[Circular]";
    }
    visiting.add(value);
    const keys = Object.keys(value).sort();
    const result = {};
    for (const key of keys) {
      try {
        result[key] = _BeslistEvent.stableSortValue(
          value[key],
          visiting,
          depth + 1,
          maxDepth
        );
      } catch {
      }
    }
    visiting.delete(value);
    return result;
  }
  getFingerPrint() {
    return _BeslistEvent.computeFingerPrintFromData(this.toEventData());
  }
  static computeFingerPrintFromData(data) {
    const normalizedContext = data.context?.sessionStartReasons ? {
      ...data.context,
      sessionStartReasons: [...data.context.sessionStartReasons].sort((a, b) => a.localeCompare(b))
    } : data.context;
    return JSON.stringify({
      type: data.type,
      shopID: data.shopID,
      screenWidth: data.screenWidth,
      screenHeight: data.screenHeight,
      userAgent: data.userAgent,
      language: data.language,
      location: {
        href: data.location.href,
        protocol: data.location.protocol,
        host: data.location.host,
        path: data.location.path,
        query: data.location.query,
        hash: data.location.hash,
        referrer: data.location.referrer
      },
      context: _BeslistEvent.stableSortValue(normalizedContext ?? {}, /* @__PURE__ */ new WeakSet(), 0, 32),
      ecommerce: _BeslistEvent.stableSortValue(data.ecommerce ?? {}, /* @__PURE__ */ new WeakSet(), 0, 32)
    });
  }
  toEventData() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      shopID: this.shopID,
      userID: this.userID,
      sessionID: this.sessionID,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      userAgent: this.userAgent,
      language: this.language,
      location: this.location,
      context: this.context,
      ecommerce: this.ecommerce
    };
  }
  serializeContext(implementationType) {
    const context = {
      implementation_type: implementationType
    };
    if (this.context?.userIP) {
      context.server_side_user_ip = this.context.userIP;
    }
    return context;
  }
  toPostData(implementationType) {
    if (!this.sessionID || !this.userID) {
      throw new Error("[BeslistTrackingSDK] Cannot get BeslistEventPostData without userID and sessionID");
    }
    return {
      client_bslst_eid: `${this.sessionID}-${this.id}`,
      event: this.type,
      timestamp: this.timestamp,
      client_bslst_aid: this.shopID,
      client_bslst_uid: this.userID,
      client_bslst_sid: this.sessionID,
      screen_width: this.screenWidth,
      screen_height: this.screenHeight,
      user_agent: this.userAgent,
      language: this.language,
      location: {
        protocol: this.location.protocol,
        host: this.location.host,
        path: this.location.path,
        query: this.location.query,
        hash: this.location.hash,
        referrer: this.location.referrer
      },
      context: this.serializeContext(implementationType),
      ecommerce: this.ecommerce
    };
  }
};

// src/events/session-start-event.ts
var SessionStartEvent = class extends BeslistEvent {
  constructor(shopID, sessionID, userID, clientData, sessionStartReasons, ecommerce = {}, sanitizers) {
    super({
      type: "session_start",
      shopID,
      sessionID,
      userID,
      ...clientData,
      context: {
        sessionStartReasons
      },
      ecommerce
    }, sanitizers);
  }
  serializeContext(implementationType) {
    const context = super.serializeContext(implementationType);
    if (this.context?.sessionStartReasons) {
      context.shop_session_start_reasons = this.context.sessionStartReasons.join("|") || "";
    }
    return context;
  }
};

// src/events/conversion-event.ts
var ConversionEvent = class extends BeslistEvent {
  constructor(shopID, sessionID, userID, clientData, conversionContext, ecommerce = {}, sanitizers) {
    super({
      type: "conversion",
      shopID,
      sessionID,
      userID,
      ...clientData,
      context: {
        ...conversionContext
      },
      ecommerce
    }, sanitizers);
  }
  serializeContext(implementationType) {
    const context = super.serializeContext(implementationType);
    if (this.context?.value !== void 0) {
      context.value = this.context.value.toString();
    }
    if (this.context?.transactionID) {
      context.transaction_id = this.context.transactionID;
    }
    if (this.context?.includingVAT !== void 0) {
      context.including_vat = this.context.includingVAT ? "true" : "false";
    }
    return context;
  }
};

// src/events/event-factory.ts
function createEventFromData(eventData) {
  switch (eventData.type) {
    case "session_start":
      return new SessionStartEvent(
        eventData.shopID,
        eventData.sessionID,
        eventData.userID,
        {
          screenWidth: eventData.screenWidth,
          screenHeight: eventData.screenHeight,
          userAgent: eventData.userAgent,
          language: eventData.language,
          location: eventData.location
        },
        eventData.context?.sessionStartReasons ?? [],
        eventData.ecommerce
      );
    case "conversion":
      return new ConversionEvent(
        eventData.shopID,
        eventData.sessionID,
        eventData.userID,
        {
          screenWidth: eventData.screenWidth,
          screenHeight: eventData.screenHeight,
          userAgent: eventData.userAgent,
          language: eventData.language,
          location: eventData.location
        },
        {
          value: eventData.context?.value ?? 0,
          transactionID: eventData.context?.transactionID ?? "",
          includingVAT: eventData.context?.includingVAT ?? false
        },
        eventData.ecommerce
      );
    default:
      return new BeslistEvent(eventData);
  }
}

// src/events/cookieless-ping-event.ts
var CookielessPingEvent = class {
  constructor(event, shopID, clientData, sessionStartReasons = [], consent, conversion) {
    this.id = generateBeslistID();
    this.event = event;
    this.shopID = shopID;
    this.clientData = clientData;
    this.sessionStartReasons = sessionStartReasons;
    this.consent = consent;
    this.conversion = conversion;
    this.timestamp = (/* @__PURE__ */ new Date()).getTime();
  }
  resolveReferrerHost() {
    const referrer = this.clientData.location.referrer;
    if (!referrer) {
      return "";
    }
    try {
      return new URL(referrer).hostname;
    } catch {
      return "";
    }
  }
  toPostData(implementationType) {
    const context = {
      implementation_type: implementationType,
      shop_session_start_reasons: this.sessionStartReasons.filter((reason) => reason !== "no session id").join("|"),
      attribution_params_present: getAttributionParamsPresent(this.clientData.location.query).join("|")
    };
    if (this.consent) {
      context.consent = this.consent;
    }
    if (this.event === "conversion" && this.conversion) {
      context.value = this.conversion.value;
      context.including_vat = this.conversion.includingVAT;
      context.transaction_id_hash = this.conversion.transactionIdHash;
    }
    return {
      client_bslst_eid: this.id,
      client_bslst_aid: this.shopID,
      event: this.event,
      timestamp: this.timestamp,
      screen_height: this.clientData.screenHeight,
      screen_width: this.clientData.screenWidth,
      context,
      location: {
        host: this.clientData.location.host,
        path: this.clientData.location.path,
        referrer: {
          host: this.resolveReferrerHost()
        }
      }
    };
  }
};

// src/client-storage/event-queue-manager.ts
var EventQueueManager = class _EventQueueManager {
  constructor(primaryRepository, fallbackRepositories, eventQueueOptions, logger) {
    this.primaryRepository = primaryRepository;
    this.fallbackRepositories = fallbackRepositories;
    this.eventQueueOptions = eventQueueOptions;
    this.logger = logger ?? createLogger();
  }
  async getQueue() {
    const repos = [this.primaryRepository, ...this.fallbackRepositories ?? []];
    const lists = await Promise.all(repos.map((r) => this.safeGetAll(r)));
    const all = lists.flat();
    const canonical = this.mergeToCanonical(all);
    await this.reconcileAllRepos(canonical);
    return Array.from(canonical.values()).sort((a, b) => a.queuedAt - b.queuedAt);
  }
  static isValidQueued(item) {
    if (!item) {
      return false;
    }
    if (typeof item.queuedAt !== "number" || !Number.isFinite(item.queuedAt)) {
      return false;
    }
    if (!item.eventData) {
      return false;
    }
    const e = item.eventData;
    if (!e.type) return false;
    if (!e.shopID) return false;
    if (typeof e.screenWidth !== "number") return false;
    if (typeof e.screenHeight !== "number") return false;
    if (!e.userAgent || typeof e.userAgent !== "string") return false;
    if (!e.language) return false;
    const loc = e.location;
    if (!loc || typeof loc !== "object") return false;
    if (typeof loc.protocol !== "string") return false;
    if (typeof loc.host !== "string") return false;
    if (typeof loc.path !== "string") return false;
    if (item.sentAt != null && (typeof item.sentAt !== "number" || !Number.isFinite(item.sentAt))) {
      return false;
    }
    return true;
  }
  getEventKey(eventData) {
    if (eventData.id) return `id:${eventData.id}`;
    return `fp:${BeslistEvent.computeFingerPrintFromData(eventData)}`;
  }
  async safeGetAll(repo) {
    try {
      return await repo.getAll() ?? [];
    } catch {
      return [];
    }
  }
  mergeToCanonical(all) {
    const map = /* @__PURE__ */ new Map();
    for (const item of all) {
      if (!_EventQueueManager.isValidQueued(item)) continue;
      const key = this.getEventKey(item.eventData);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        continue;
      }
      const existingCompleteness = (existing.eventData.id ? 1 : 0) + (existing.eventData.userID ? 1 : 0) + (existing.eventData.sessionID ? 1 : 0);
      const nextCompleteness = (item.eventData.id ? 1 : 0) + (item.eventData.userID ? 1 : 0) + (item.eventData.sessionID ? 1 : 0);
      const chosenEventData = nextCompleteness > existingCompleteness ? item.eventData : existing.eventData;
      map.set(key, {
        ...existing,
        queuedAt: Math.min(existing.queuedAt, item.queuedAt),
        eventData: chosenEventData,
        sentAt: typeof existing.sentAt === "number" ? existing.sentAt : typeof item.sentAt === "number" ? item.sentAt : void 0
      });
    }
    return map;
  }
  /**
   * Effective priority for queue shaping.
   *
   * Sent events are treated as normal priority regardless of the event type,
   * because their payload has already been delivered — we only retain them as
   * dedupe history. Unsent events keep their domain priority from
   * `getEventPriority`.
   */
  getEffectivePriority(item) {
    const isSent = typeof item.sentAt === "number" && Number.isFinite(item.sentAt);
    if (isSent) {
      return "normal";
    }
    return getEventPriority(item.eventData);
  }
  /**
   * Trim a list of queued events to at most `cap` items, preferring to keep
   * high-priority (attribution-bearing) events.
   *
   * Strategy:
   *   1. Filter out structurally-invalid items.
   *   2. Drop the oldest normal-priority items until the list fits.
   *   3. If high-priority items alone still exceed the cap, drop the oldest
   *      high-priority items as a last resort (logged at info level).
   *
   * Returns items in chronological (queuedAt ascending) order so downstream
   * flush ordering is preserved.
   */
  trimByPriority(items, cap) {
    const valid = items.filter(
      (item) => item && Number.isFinite(item.queuedAt) && item.eventData
    );
    if (valid.length <= cap) {
      return valid.slice().sort((a, b) => a.queuedAt - b.queuedAt);
    }
    const highPriority = [];
    const normalPriority = [];
    for (const item of valid) {
      if (this.getEffectivePriority(item) === "high") {
        highPriority.push(item);
      } else {
        normalPriority.push(item);
      }
    }
    highPriority.sort((a, b) => a.queuedAt - b.queuedAt);
    normalPriority.sort((a, b) => a.queuedAt - b.queuedAt);
    if (highPriority.length >= cap) {
      this.logger.debug(
        `Queue over cap with only high-priority events (${highPriority.length} > ${cap}); dropping oldest high-priority items.`,
        "trimByPriority"
      );
      return highPriority.slice(highPriority.length - cap);
    }
    const normalBudget = cap - highPriority.length;
    const keptNormal = normalPriority.slice(Math.max(0, normalPriority.length - normalBudget));
    return [...highPriority, ...keptNormal].sort((a, b) => a.queuedAt - b.queuedAt);
  }
  async reconcileRepo(repo, canonical) {
    const current = await this.safeGetAll(repo);
    const nextByKey = /* @__PURE__ */ new Map();
    for (const item of current) {
      if (!_EventQueueManager.isValidQueued(item)) {
        continue;
      }
      const key = this.getEventKey(item.eventData);
      nextByKey.set(key, canonical.get(key) ?? item);
    }
    for (const [key, canonItem] of canonical) {
      if (!nextByKey.has(key)) nextByKey.set(key, canonItem);
    }
    const next = Array.from(nextByKey.values()).sort((a, b) => a.queuedAt - b.queuedAt);
    const maxLen = this.eventQueueOptions?.maximumQueuedEvents;
    const finalItems = typeof maxLen === "number" && Number.isFinite(maxLen) ? this.trimByPriority(next, maxLen) : next;
    await repo.setAll(finalItems);
  }
  async reconcileAllRepos(canonical) {
    const repos = [this.primaryRepository, ...this.fallbackRepositories ?? []];
    await Promise.allSettled(repos.map((r) => this.reconcileRepo(r, canonical)));
  }
  async clearQueue() {
    const repositories = [
      this.primaryRepository,
      ...this.fallbackRepositories ?? []
    ];
    await Promise.allSettled(repositories.map((r) => r.clear()));
  }
  async pruneRepository(repo) {
    const now = Date.now();
    const maxAgeMinutes = this.eventQueueOptions?.maxAgeMinutes;
    const maxAgeMs = typeof maxAgeMinutes === "number" && Number.isFinite(maxAgeMinutes) ? maxAgeMinutes * 60 * 1e3 : Infinity;
    const sentRetentionMinutes = this.eventQueueOptions?.sentRetentionMinutes;
    const sentRetentionMs = typeof sentRetentionMinutes === "number" && Number.isFinite(sentRetentionMinutes) ? sentRetentionMinutes * 60 * 1e3 : maxAgeMs;
    const items = await repo.getAll();
    const filtered = (items ?? []).filter((item) => {
      if (!item) return false;
      if (!Number.isFinite(item.queuedAt)) return false;
      if (!item.eventData) return false;
      if (typeof item.sentAt === "number" && Number.isFinite(item.sentAt)) {
        return now - item.sentAt <= sentRetentionMs;
      }
      if (getEventPriority(item.eventData) === "high") {
        return true;
      }
      return now - item.queuedAt <= maxAgeMs;
    });
    filtered.sort((a, b) => a.queuedAt - b.queuedAt);
    const seen = /* @__PURE__ */ new Set();
    const deduped = [];
    for (const item of filtered) {
      const key = this.getEventKey(item.eventData);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    await repo.setAll(deduped);
  }
  async pruneQueue() {
    const repos = [
      this.primaryRepository,
      ...this.fallbackRepositories ?? []
    ];
    for (const repo of repos) {
      try {
        await this.pruneRepository(repo);
      } catch {
      }
    }
  }
  /**
   * should support “don’t enqueue duplicates” for at least session_start (and optionally conversion if you want)
   * should not require cookies
   */
  async enqueueEvent(eventData, options) {
    const repos = [
      this.primaryRepository,
      ...this.fallbackRepositories ?? []
    ];
    const queuedAt = Date.now();
    const targetFingerprint = BeslistEvent.computeFingerPrintFromData(eventData);
    await Promise.allSettled(
      repos.map(async (repo) => {
        if (options?.dedupe === true) {
          const isDuplicate = await this.hasDuplicateInRepo(repo, targetFingerprint);
          if (isDuplicate) {
            this.logger.debug(`Skipped duplicate ${eventData.type}`, "enqueueEvent");
            return;
          }
        }
        await repo.enqueue({
          queuedAt,
          // Deep copy to prevent caller mutations from leaking into stored data. Migrate to structuredClone in the future.
          eventData: JSON.parse(JSON.stringify(eventData))
        });
        const items = await repo.getAll();
        if (items.length > this.eventQueueOptions.maximumQueuedEvents) {
          const trimmed = this.trimByPriority(items, this.eventQueueOptions.maximumQueuedEvents);
          this.logger.debug(`Queue trimmed from ${items.length} to ${trimmed.length}`, "enqueueEvent");
          await repo.setAll(trimmed);
        }
      })
    );
  }
  async hasDuplicateInRepo(repo, targetFingerprint) {
    const items = await repo.getAll();
    for (const item of items) {
      if (!item?.eventData) continue;
      if (typeof item.sentAt === "number" && Number.isFinite(item.sentAt)) {
        continue;
      }
      const fp = BeslistEvent.computeFingerPrintFromData(item.eventData);
      if (fp === targetFingerprint) {
        return true;
      }
    }
    return false;
  }
  /**
   * Synchronous check: does `queue` contain a sent item whose fingerprint
   * matches `eventData`?
   *
   * When both the new event and the sent entry have a sessionID, they must
   * match — otherwise the sent entry belongs to a previous session and
   * should not block a new session_start from being sent.
   */
  static hasSentDuplicateInQueue(queue, eventData) {
    const targetFingerprint = BeslistEvent.computeFingerPrintFromData(eventData);
    for (const item of queue) {
      if (!_EventQueueManager.isValidQueued(item)) continue;
      const fp = BeslistEvent.computeFingerPrintFromData(item.eventData);
      if (fp !== targetFingerprint) continue;
      if (!(typeof item.sentAt === "number" && Number.isFinite(item.sentAt))) continue;
      if (eventData.sessionID && item.eventData.sessionID) {
        if (eventData.sessionID !== item.eventData.sessionID) continue;
      }
      return true;
    }
    return false;
  }
  /**
   * Async version: loads the canonical queue, then delegates to the sync check.
   */
  async hasSentDuplicate(eventData) {
    const queue = await this.getQueue();
    return _EventQueueManager.hasSentDuplicateInQueue(queue, eventData);
  }
  /**
   * ensures session/user exist (by calling identity manager)
   * injects them into eventData
   * ensures id + sessionID relationship for post data (your toPostData already needs both)
   * returns updated queued item (so you can persist if changed)
   */
  async hydrateEvent(queued, identity) {
    const original = queued.eventData;
    const next = { ...original };
    let mutated = false;
    if (!next.id) {
      next.id = new BeslistEvent(next).id;
      mutated = true;
    }
    const ensuredUserId = await identity.ensureUserId();
    const ensuredSessionId = await identity.ensureSessionId();
    if (!next.userID) {
      next.userID = ensuredUserId;
      mutated = true;
    }
    if (!next.sessionID) {
      next.sessionID = ensuredSessionId;
      mutated = true;
    }
    if (original.sessionID && original.sessionID !== ensuredSessionId) {
      next.id = new BeslistEvent({ ...next, id: void 0 }).id;
      next.sessionID = ensuredSessionId;
      mutated = true;
    }
    return mutated ? { ...queued, eventData: next } : queued;
  }
  /**
   * loads queue
   * for each unsent item:
   *  hydrate
   *  build BeslistEvent / postData
   *  send
   *  mark sent
   * persist changes back
   * (optional) prune after send
   */
  async sendQueuedEvents(sender, identity, implementationType) {
    await this.pruneQueue();
    const canonicalQueue = await this.getQueue();
    const unsent = canonicalQueue.filter(
      (item) => _EventQueueManager.isValidQueued(item) && !(typeof item.sentAt === "number" && Number.isFinite(item.sentAt))
    );
    this.logger.debug(`Flushing queue \u2014 ${unsent.length} unsent of ${canonicalQueue.length} total`, "sendQueuedEvents");
    const sentEventIds = [];
    const hydratedItems = [];
    for (const item of canonicalQueue) {
      if (!_EventQueueManager.isValidQueued(item)) continue;
      if (typeof item.sentAt === "number" && Number.isFinite(item.sentAt)) continue;
      let sent = false;
      let hydrated;
      try {
        hydrated = await this.hydrateEvent(item, identity);
        hydratedItems.push(hydrated);
        const event = createEventFromData(hydrated.eventData);
        const postData = event.toPostData(implementationType);
        sent = await sender(postData) !== false;
      } catch {
        this.logger.debug(`Failed to hydrate/send ${item.eventData.type} (id: ${item.eventData.id ?? "none"})`, "sendQueuedEvents");
        continue;
      }
      if (sent && hydrated.eventData.id) {
        sentEventIds.push(hydrated.eventData.id);
      }
    }
    this.logger.debug(`Sent ${sentEventIds.length} of ${unsent.length} queued events`, "sendQueuedEvents");
    if (hydratedItems.length > 0) {
      const canonical = this.mergeToCanonical([...hydratedItems, ...canonicalQueue]);
      await this.reconcileAllRepos(canonical);
    }
    for (const eventId of sentEventIds) {
      await this.markSentById(eventId);
    }
  }
  /**
   * you need some stable identity to update the queued item
   * simplest: use eventData.id (since your BeslistEventData includes id)
   * alternative: use fingerprint (but costs CPU; fine at small scale)
   */
  async markSentById(eventId) {
    const now = Date.now();
    const repos = [this.primaryRepository, ...this.fallbackRepositories ?? []];
    await Promise.allSettled(
      repos.map(async (repo) => {
        const items = await this.safeGetAll(repo);
        let mutated = false;
        const next = items.map((item) => {
          if (!_EventQueueManager.isValidQueued(item)) return item;
          if (item.eventData.id !== eventId) return item;
          if (typeof item.sentAt === "number") return item;
          mutated = true;
          return { ...item, sentAt: now };
        });
        if (mutated) await repo.setAll(next);
      })
    );
    await this.getQueue();
  }
};

// src/configuration/beslist-tracking-configuration.ts
var DEFAULT_EVENT_QUEUE_OPTIONS = {
  storageKey: "bslst_event_queue",
  maximumQueuedEvents: 200,
  maxAgeMinutes: 480,
  sentRetentionMinutes: 30
};
function resolveConfiguration(shopID, overrides) {
  const { eventQueue: eventQueueOverride, ...baseOverrides } = overrides ?? {};
  const eventQueue = eventQueueOverride === false ? void 0 : { ...DEFAULT_EVENT_QUEUE_OPTIONS, ...eventQueueOverride };
  return {
    shopID,
    logLevel: "silent",
    cookielessPingEnabled: false,
    captureMidSessionReferrer: false,
    endpointURL: DEFAULT_ENDPOINT_URL,
    cookielessPingEndpointURL: DEFAULT_COOKIELESS_PING_ENDPOINT_URL,
    ...baseOverrides,
    eventQueue
  };
}
function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`[BeslistTrackingSDK] "${field}" must be a non-empty string.`);
  }
}
function assertPositiveFinite(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[BeslistTrackingSDK] "${field}" must be a positive finite number.`);
  }
}
function assertPositiveInteger(value, field) {
  assertPositiveFinite(value, field);
  if (!Number.isInteger(value)) {
    throw new Error(`[BeslistTrackingSDK] "${field}" must be a positive integer.`);
  }
}
function validateEventQueueOptions(options) {
  assertNonEmptyString(options.storageKey, "eventQueue.storageKey");
  assertPositiveInteger(options.maximumQueuedEvents, "eventQueue.maximumQueuedEvents");
  assertPositiveFinite(options.maxAgeMinutes, "eventQueue.maxAgeMinutes");
  assertPositiveFinite(options.sentRetentionMinutes, "eventQueue.sentRetentionMinutes");
}
function validateConfiguration(config) {
  assertNonEmptyString(config.shopID, "shopID");
  if (config.endpointURL !== void 0) {
    assertNonEmptyString(config.endpointURL, "endpointURL");
    try {
      new URL(config.endpointURL);
    } catch {
      throw new Error(`[BeslistTrackingSDK] "endpointURL" is not a valid URL: "${config.endpointURL}".`);
    }
  }
  if (config.cookielessPingEndpointURL !== void 0) {
    assertNonEmptyString(config.cookielessPingEndpointURL, "cookielessPingEndpointURL");
    try {
      new URL(config.cookielessPingEndpointURL);
    } catch {
      throw new Error(`[BeslistTrackingSDK] "cookielessPingEndpointURL" is not a valid URL: "${config.cookielessPingEndpointURL}".`);
    }
  }
  if (config.implementationType !== void 0) {
    assertNonEmptyString(config.implementationType, "implementationType");
  }
  if (config.logLevel !== void 0) {
    const validLogLevels = ["silent", "warn", "info", "debug"];
    if (!validLogLevels.includes(config.logLevel)) {
      throw new Error(`[BeslistTrackingSDK] "logLevel" must be one of: ${validLogLevels.join(", ")}.`);
    }
  }
  if (config.eventQueue) {
    validateEventQueueOptions(config.eventQueue);
  }
}

// src/consent/always-granted-consent-provider.ts
var AlwaysGrantedConsentProvider = class {
  isGranted() {
    return true;
  }
  onConsentChange(_callback) {
    return () => {
    };
  }
};

// src/consent/deferred-consent-provider.ts
var DeferredConsentProvider = class {
  constructor() {
    this.granted = false;
    this.listeners = /* @__PURE__ */ new Set();
  }
  isGranted() {
    return this.granted;
  }
  onConsentChange(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  /** Flip to granted. No-op if already granted. Fires `onConsentChange` listeners. */
  grant() {
    if (this.granted) {
      return;
    }
    this.granted = true;
    this.notify(true);
  }
  /** Flip to denied. No-op if already denied. Fires `onConsentChange` listeners. */
  revoke() {
    if (!this.granted) {
      return;
    }
    this.granted = false;
    this.notify(false);
  }
  notify(granted) {
    const snapshot = Array.from(this.listeners);
    for (const listener of snapshot) {
      try {
        listener(granted);
      } catch {
      }
    }
  }
};

// src/identity/identity-manager.ts
var IdentityManager = class {
  constructor(storage, logLevel, logger) {
    this.storage = storage;
    this.logger = logger ?? createLogger(logLevel, "Identity");
  }
  /**
   * Ensures a user id exists AND refreshes its expiry ("touch").
   */
  async ensureUserId() {
    let userID = await this.getUserId();
    if (userID === null) {
      userID = generateBeslistID(true, ".");
      this.logger.debug(`Generated new user ID`, "ensureUserId");
    } else {
      this.logger.debug(`Reusing existing user ID`, "ensureUserId");
    }
    await this.touchUserId(userID);
    return userID;
  }
  /**
   * Reads user id without creating or touching.
   */
  getUserId() {
    return this.storage.getItem(USER_ID_COOKIE_NAME);
  }
  /**
   * Ensures a session id exists AND refreshes its expiry ("touch").
   */
  async ensureSessionId() {
    let sessionID = await this.getSessionId();
    if (sessionID === null) {
      sessionID = generateBeslistID();
      this.logger.debug(`Generated new session ID`, "ensureSessionId");
    } else {
      this.logger.debug(`Reusing existing session ID`, "ensureSessionId");
    }
    await this.touchSessionId(sessionID);
    return sessionID;
  }
  /**
   * Reads session id without creating or touching.
   */
  getSessionId() {
    return this.storage.getItem(SESSION_ID_COOKIE_NAME);
  }
  async touchSessionId(sessionID) {
    const maxAgeSeconds = Math.floor(SESSION_EXPIRE_MINUTES * 60);
    await this.storage.setItem(SESSION_ID_COOKIE_NAME, sessionID, {
      seconds: maxAgeSeconds
    });
  }
  async touchUserId(userID) {
    const maxAgeSeconds = Math.floor(USER_EXPIRE_DAYS * 24 * 60 * 60);
    await this.storage.setItem(USER_ID_COOKIE_NAME, userID, {
      seconds: maxAgeSeconds
    });
  }
};

// src/transport/adapters/fallback-transport-adapter.ts
var FallbackTransportAdapter = class {
  constructor(adapters, options = {}) {
    if (!Array.isArray(adapters) || adapters.length === 0) {
      throw new Error("FallbackTransportAdapter requires a non-empty adapters array.");
    }
    this.adapters = adapters;
    this.logger = options.logger ?? createLogger();
    this.shouldFallback = options.shouldFallback ?? ((response) => {
      return response.status === 0;
    });
  }
  async send(request) {
    const errors = [];
    let lastResponse;
    for (const adapter of this.adapters) {
      try {
        const response = await adapter.send(request);
        lastResponse = response;
        if (response.ok) {
          this.logger.debug(`Delivered via ${adapter.constructor.name}`, "send");
          return response;
        }
        if (this.shouldFallback(response)) {
          this.logger.debug(`${adapter.constructor.name} returned status ${response.status}, falling back`, "send");
          continue;
        }
        this.logger.debug(`${adapter.constructor.name} returned status ${response.status}, not retryable`, "send");
        return response;
      } catch (e) {
        this.logger.debug(`${adapter.constructor.name} threw: ${e instanceof Error ? e.message : String(e)}, falling back`, "send");
        errors.push(e);
      }
    }
    if (lastResponse) return lastResponse;
    const message = errors.length ? `All transport adapters failed. Errors: ${errors.map((e) => e instanceof Error ? e.message : String(e)).join(" | ")}` : "All transport adapters failed.";
    throw new Error(message);
  }
};

// src/transport/adapters/fetch-transport-adapter.ts
function combineAbortSignals(signals) {
  if (signals.length === 0) {
    return void 0;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signals.forEach((signal) => signal.addEventListener("abort", onAbort, { once: true }));
  return controller.signal;
}
function normalizeHeaders(headers) {
  const out = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}
var FetchTransportAdapter = class {
  constructor(options = {}) {
    this.options = options;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error("FetchTransportAdapter requires a fetch implementation.");
    }
    this.fetchImpl = options.fetchImpl ? fetchImpl : fetchImpl.bind(globalThis);
  }
  async send(request) {
    const controller = request.timeoutMs != null ? new AbortController() : void 0;
    const timeoutId = controller != null ? setTimeout(() => controller.abort(), request.timeoutMs) : void 0;
    const signals = [];
    if (request.signal) signals.push(request.signal);
    if (controller) signals.push(controller.signal);
    const signal = combineAbortSignals(signals);
    try {
      const res = await this.fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal,
        keepalive: this.options.keepalive,
        credentials: "omit",
        mode: "cors"
      });
      const bodyText = await res.text();
      return {
        status: res.status,
        ok: res.ok,
        headers: normalizeHeaders(res.headers),
        bodyText
      };
    } finally {
      if (timeoutId != null) clearTimeout(timeoutId);
    }
  }
};

// src/transport/adapters/sendbeacon-transport-adapter.ts
var SendBeaconTransportAdapter = class {
  constructor(navigatorImpl = globalThis.navigator) {
    this.navigatorImpl = navigatorImpl;
    if (!this.navigatorImpl || typeof this.navigatorImpl.sendBeacon !== "function") {
      throw new Error("SendBeaconTransportAdapter requires navigator.sendBeacon.");
    }
  }
  /**
   * Note: request.headers are intentionally ignored. sendBeacon with a string
   * body always sends Content-Type: text/plain;charset=UTF-8 (browser default).
   * Using a Blob to control Content-Type breaks the ct_event endpoint pipeline.
   */
  async send(request) {
    if (request.method !== "POST") {
      throw new Error("SendBeaconTransportAdapter only supports POST.");
    }
    const queued = this.navigatorImpl.sendBeacon(request.url, request.body ?? "");
    return {
      status: 0,
      ok: queued,
      headers: {},
      bodyText: ""
    };
  }
};

// src/transport/adapters/xhr-transport-adapter.ts
function parseRawHeaders(raw) {
  const out = {};
  raw.split("\r\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!key) return;
    out[key] = value;
  });
  return out;
}
var XhrTransportAdapter = class {
  constructor(options = {}, createXhr = () => new XMLHttpRequest()) {
    this.options = options;
    this.createXhr = createXhr;
  }
  async send(request) {
    return await new Promise((resolve, reject) => {
      const xhr = this.createXhr();
      xhr.open(request.method, request.url, true);
      if (this.options.withCredentials != null) {
        xhr.withCredentials = this.options.withCredentials;
      }
      if (this.options.responseType != null) {
        try {
          xhr.responseType = this.options.responseType;
        } catch {
        }
      }
      if (request.timeoutMs != null) xhr.timeout = request.timeoutMs;
      const headers = request.headers ?? {};
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }
      const onAbort = () => {
        try {
          xhr.abort();
        } catch {
        }
      };
      if (request.signal) {
        if (request.signal.aborted) {
          onAbort();
          reject(new Error("Request aborted."));
          return;
        }
        request.signal.addEventListener("abort", onAbort, { once: true });
      }
      xhr.onload = () => {
        resolve({
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          headers: parseRawHeaders(xhr.getAllResponseHeaders?.() ?? ""),
          bodyText: xhr.responseText
        });
      };
      xhr.onerror = () => reject(new Error("Network error."));
      xhr.ontimeout = () => reject(new Error("Request timed out."));
      xhr.onabort = () => reject(new Error("Request aborted."));
      try {
        xhr.send(request.body ?? null);
      } catch (e) {
        reject(e);
      }
    });
  }
};

// src/transport/serialization/json-transport-serializer.ts
var JsonTransportSerializer = class {
  constructor() {
    this.contentType = "application/json";
  }
  serialize(value) {
    return JSON.stringify(value);
  }
};

// src/transport/serialization/json-as-text-plain-transport-serializer.ts
var JsonAsTextPlainTransportSerializer = class extends JsonTransportSerializer {
  constructor() {
    super(...arguments);
    this.contentType = "text/plain;charset=UTF-8";
  }
};

// src/transport/utils.ts
function joinUrl(baseUrl, path) {
  if (!baseUrl) {
    return path;
  }
  if (!path) {
    return baseUrl;
  }
  const a = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const b = path.startsWith("/") ? path : `/${path}`;
  return `${a}${b}`;
}
function mergeHeaders(base, extra) {
  if (!base && !extra) {
    return void 0;
  }
  return { ...base ?? {}, ...extra ?? {} };
}
function hasHeader(headers, name) {
  if (!headers) {
    return false;
  }
  const target = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === target);
}

// src/transport/transport-client.ts
var TransportClient = class {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = options;
    this.serializer = options.serializer ?? new JsonTransportSerializer();
  }
  async post(payload, options) {
    const url = this.resolveUrl(options?.path);
    const body = this.serializer.serialize(payload);
    const headers = mergeHeaders(this.options.defaultHeaders, options?.headers);
    const finalHeaders = hasHeader(headers, "content-type") ? headers : { ...headers ?? {}, "Content-Type": this.serializer.contentType };
    return await this.adapter.send({
      url,
      method: "POST",
      headers: finalHeaders,
      body,
      timeoutMs: options?.timeoutMs,
      signal: options?.signal
    });
  }
  async get(options) {
    const url = this.resolveUrl(options?.path);
    return await this.adapter.send({
      url,
      method: "GET",
      headers: mergeHeaders(this.options.defaultHeaders, options?.headers),
      timeoutMs: options?.timeoutMs,
      signal: options?.signal
    });
  }
  resolveUrl(path) {
    if (this.options.baseUrl && path) {
      return joinUrl(this.options.baseUrl, path);
    }
    return this.options.baseUrl ?? path ?? "";
  }
};

// src/tracker/beslist-tracker.ts
function getDefaultClientData() {
  const location = typeof window !== "undefined" ? window.location : void 0;
  const referrer = typeof document !== "undefined" ? document.referrer ?? "" : "";
  const screenValue = typeof screen !== "undefined" ? screen : void 0;
  const navigatorValue = typeof navigator !== "undefined" ? navigator : void 0;
  return {
    screenWidth: screenValue?.width ?? 0,
    screenHeight: screenValue?.height ?? 0,
    userAgent: navigatorValue?.userAgent ?? "",
    language: navigatorValue?.language ?? "",
    location: {
      href: location?.href ?? "",
      protocol: location?.protocol ?? "",
      host: location?.host ?? "",
      path: location?.pathname ?? "",
      query: location?.search ?? "",
      hash: location?.hash ?? "",
      referrer
    }
  };
}
function createDefaultTransportClient(endpointUrl, logger) {
  const adapters = [];
  try {
    adapters.push(new SendBeaconTransportAdapter());
  } catch {
  }
  adapters.push(new FetchTransportAdapter({ keepalive: true }));
  const adapter = new FallbackTransportAdapter(adapters, { logger });
  return new TransportClient(adapter, {
    baseUrl: endpointUrl,
    serializer: new JsonAsTextPlainTransportSerializer()
  });
}
function getSessionStorageSafe() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}
function createQueueRepository(storage, key) {
  if (storage) {
    return new ArrayRepository(
      new JsonKeyValueStorage(createWebStorageAdapter(storage)),
      key
    );
  }
  return new ArrayRepository(new JsonKeyValueStorage(new MemoryStorage()), key);
}
function createDefaultEventQueueManager(config, logger) {
  const sessionStorage = getSessionStorageSafe();
  const primary = createQueueRepository(sessionStorage, config.storageKey);
  const fallbackStorage = sessionStorage ? new MemoryStorage() : void 0;
  const fallback = fallbackStorage ? [new ArrayRepository(new JsonKeyValueStorage(fallbackStorage), config.storageKey)] : void 0;
  return new EventQueueManager(primary, fallback, config, logger);
}
var BeslistTracker = class {
  constructor(configuration, options = {}) {
    this.configuration = configuration;
    this.emittedNewReferrers = /* @__PURE__ */ new Set();
    validateConfiguration(configuration);
    this.logger = createLogger(configuration.logLevel, "Tracker");
    const cookieStorage = options.cookieStorage ?? new CookieStorageAdapter(new DocumentRawCookieStorage());
    this.cookieStorage = cookieStorage;
    this.identityManager = new IdentityManager(cookieStorage, configuration.logLevel);
    this.transportClient = options.transportClient ?? createDefaultTransportClient(configuration.endpointURL ?? DEFAULT_ENDPOINT_URL, createLogger(configuration.logLevel, "Transport"));
    this.cookielessPingTransportClient = options.cookielessPingTransportClient ?? (configuration.cookielessPingEnabled ? createDefaultTransportClient(
      configuration.cookielessPingEndpointURL ?? DEFAULT_COOKIELESS_PING_ENDPOINT_URL,
      createLogger(configuration.logLevel, "CookielessPing")
    ) : void 0);
    this.eventQueueManager = options.eventQueueManager ?? (configuration.eventQueue ? createDefaultEventQueueManager(configuration.eventQueue, createLogger(configuration.logLevel, "EventQueue")) : void 0);
    if (!options.consent && !this.eventQueueManager) {
      throw new Error(
        "[BeslistTrackingSDK] Configuration error: no ConsentProvider was supplied and the event queue is disabled. The default ConsentProvider defers tracking until consent is granted, which requires a queue to hold events. Either enable the event queue (default) or supply an explicit ConsentProvider (e.g. `new AlwaysGrantedConsentProvider()`)."
      );
    }
    this.clientDataProvider = options.clientDataProvider ?? getDefaultClientData;
    this.sanitizers = options.sanitizers ?? [];
    this.sha256Hasher = options.sha256Hasher ?? sha256Hex;
    this.implementationType = configuration.implementationType?.trim() || "fe";
    this.consent = options.consent ?? new DeferredConsentProvider();
    this.unsubscribeConsent = this.consent.onConsentChange((granted) => {
      this.logger.info(`Consent changed: ${granted ? "granted" : "denied"}`);
      if (granted) {
        void this.flushEventQueue();
      }
    });
    const consentLabel = this.consent.constructor?.name ?? "custom";
    this.logger.debug(`Initialized \u2014 shopID: ${configuration.shopID}, consent: ${consentLabel}, eventQueue: ${this.eventQueueManager ? "enabled" : "disabled"}`);
  }
  isConsentGranted() {
    return this.consent.isGranted();
  }
  /** @internal — for legacy shim only, not part of the public API. */
  get _internals() {
    return {
      eventQueueManager: this.eventQueueManager,
      resolveClientData: this.resolveClientData.bind(this)
    };
  }
  resolveClientData(perCallLocation) {
    const clientData = this.clientDataProvider();
    if (!this.customLocation && !perCallLocation) {
      return clientData;
    }
    const location = { ...clientData.location };
    for (const override of [this.customLocation, perCallLocation]) {
      if (!override) {
        continue;
      }
      for (const key of Object.keys(override)) {
        if (override[key] != null) {
          location[key] = String(override[key]).slice(0, 2048);
        }
      }
    }
    return { ...clientData, location };
  }
  async resolveIdentity() {
    if (!this.isConsentGranted()) {
      return {};
    }
    return {
      sessionID: await this.identityManager.ensureSessionId(),
      userID: await this.identityManager.ensureUserId()
    };
  }
  filterAlreadyEmittedNewReferrer(reasons, referrer, channel) {
    if (!(this.configuration.captureMidSessionReferrer ?? false)) {
      return reasons;
    }
    if (!reasons.includes("new referrer")) {
      return reasons;
    }
    if (this.emittedNewReferrers.has(`${channel}|${referrer}`)) {
      this.logger.debug(`Dropped repeated 'new referrer' for ${channel} \u2014 referrer already captured this context`, "filterAlreadyEmittedNewReferrer");
      return reasons.filter((reason) => reason !== "new referrer");
    }
    return reasons;
  }
  markNewReferrerEmitted(referrer, channel) {
    if (!(this.configuration.captureMidSessionReferrer ?? false)) {
      return;
    }
    this.emittedNewReferrers.add(`${channel}|${referrer}`);
  }
  async initializeSession(ecommerce = {}, customLocation, shopID) {
    const clientData = this.resolveClientData(customLocation);
    const reasons = this.filterAlreadyEmittedNewReferrer(
      await getSessionStartReasons(
        this.cookieStorage,
        clientData,
        this.configuration.captureMidSessionReferrer ?? false
      ),
      clientData.location.referrer,
      "session_start"
    );
    if (reasons.length === 0) {
      this.logger.debug("Session already active, skipping session_start");
      return;
    }
    this.logger.info(`Starting session \u2014 reasons: ${reasons.join(", ")}`);
    const { sessionID, userID } = await this.resolveIdentity();
    const event = new SessionStartEvent(
      shopID ?? this.configuration.shopID,
      sessionID,
      userID,
      clientData,
      reasons,
      ecommerce,
      this.sanitizers
    );
    const sent = await this.enqueueOrSend(event, { dedupe: true, checkSent: true });
    if (sent && reasons.includes("new referrer")) {
      this.markNewReferrerEmitted(clientData.location.referrer, "session_start");
    }
  }
  async trackConversion(conversionContext, ecommerce = {}, customLocation, shopID) {
    this.logger.info(`Tracking conversion \u2014 transaction_id: ${conversionContext.transactionID}`);
    this.logger.debug(`Tracking conversion \u2014 transaction_id: ${conversionContext.transactionID}, value: ${conversionContext.value}, including_vat: ${conversionContext.includingVAT}`);
    const clientData = this.resolveClientData(customLocation);
    const { sessionID, userID } = await this.resolveIdentity();
    const event = new ConversionEvent(
      shopID ?? this.configuration.shopID,
      sessionID,
      userID,
      clientData,
      conversionContext,
      ecommerce,
      this.sanitizers
    );
    await this.enqueueOrSend(event, { dedupe: false, checkSent: false });
  }
  async trackEvent(eventName, context = {}, ecommerce = {}, customLocation, shopID) {
    if (!eventName || !eventName.trim()) {
      this.logger.debug("Ignored trackEvent call \u2014 empty event name", "trackEvent");
      return;
    }
    this.logger.info(`Tracking event \u2014 type: ${eventName}`);
    const clientData = this.resolveClientData(customLocation);
    const { sessionID, userID } = await this.resolveIdentity();
    const event = new BeslistEvent({
      ...clientData,
      type: eventName,
      shopID: shopID ?? this.configuration.shopID,
      sessionID,
      userID,
      context,
      ecommerce
    }, this.sanitizers);
    await this.enqueueOrSend(event, { dedupe: false, checkSent: false });
  }
  async sendConversionPing(conversionContext, consent, customLocation, shopID) {
    await this.sendCookielessPing("conversion", conversionContext, consent, customLocation, shopID);
  }
  async sendSessionStartPing(consent, customLocation, shopID) {
    await this.sendCookielessPing("session_start", void 0, consent, customLocation, shopID);
  }
  async sendCookielessPing(event, conversionContext, consent, customLocation, shopID) {
    if (this.configuration.cookielessPingEnabled !== true || !this.cookielessPingTransportClient) {
      return;
    }
    const clientData = this.resolveClientData(customLocation);
    const resolvedShopID = shopID ?? this.configuration.shopID;
    let sessionStartReasons = [];
    if (event === "session_start") {
      sessionStartReasons = this.filterAlreadyEmittedNewReferrer(
        await getSessionStartReasons(this.cookieStorage, clientData, this.configuration.captureMidSessionReferrer ?? false),
        clientData.location.referrer,
        "session_start_ping"
      );
      const attributionReasons = sessionStartReasons.filter((reason) => reason !== "no session id");
      if (attributionReasons.length === 0) {
        this.logger.debug("Skipping session_start ping \u2014 no attribution reason", "sendCookielessPing");
        return;
      }
    }
    let conversion;
    if (event === "conversion" && conversionContext) {
      conversion = {
        value: conversionContext.value,
        includingVAT: conversionContext.includingVAT,
        transactionIdHash: await this.hashTransactionId(conversionContext.transactionID)
      };
    }
    const pingEvent = new CookielessPingEvent(event, resolvedShopID, clientData, sessionStartReasons, consent, conversion);
    const postData = pingEvent.toPostData(this.implementationType);
    this.logger.info(`Sending cookieless ${event} ping`, "sendCookielessPing");
    try {
      const response = await this.cookielessPingTransportClient.post(postData);
      if (!response.ok) {
        this.logger.warn(`Cookieless ${event} ping failed \u2014 status: ${response.status}`, "sendCookielessPing");
      } else if (event === "session_start" && sessionStartReasons.includes("new referrer")) {
        this.markNewReferrerEmitted(clientData.location.referrer, "session_start_ping");
      }
    } catch (error) {
      this.logger.error(`Cookieless ping transport error \u2014 ${error instanceof Error ? error.message : "unknown"}`, "sendCookielessPing");
    }
  }
  async hashTransactionId(transactionID) {
    if (!transactionID) {
      return "";
    }
    try {
      return await this.sha256Hasher(transactionID) ?? "";
    } catch {
      return "";
    }
  }
  async flushEventQueue() {
    if (!this.eventQueueManager) return;
    this.logger.debug("Flushing event queue");
    await this.eventQueueManager.sendQueuedEvents(
      (postData) => this.sendPostData(postData),
      this.identityManager,
      this.implementationType
    );
  }
  setCustomLocation(location) {
    this.customLocation = location;
  }
  clearCustomLocation() {
    this.customLocation = void 0;
  }
  destroy() {
    this.unsubscribeConsent();
  }
  /**
   * Grant consent via the default `DeferredConsentProvider`.
   *
   * No-op (with a debug log) when a custom `ConsentProvider` was supplied —
   * those providers are driven by their own source of truth (CMP, cookie, etc.)
   * and should not be mutated through the tracker.
   */
  grantConsent() {
    if (this.consent instanceof DeferredConsentProvider) {
      this.consent.grant();
      return;
    }
    this.logger.debug("grantConsent() ignored \u2014 consent is managed by a custom ConsentProvider", "grantConsent");
  }
  /** Symmetric counterpart to `grantConsent`. */
  revokeConsent() {
    if (this.consent instanceof DeferredConsentProvider) {
      this.consent.revoke();
      return;
    }
    this.logger.debug("revokeConsent() ignored \u2014 consent is managed by a custom ConsentProvider", "revokeConsent");
  }
  async enqueueOrSend(event, options) {
    const eventData = event.toEventData();
    if (!this.isConsentGranted()) {
      if (this.eventQueueManager) {
        this.logger.debug(`Queued ${eventData.type} \u2014 consent denied`, "enqueueOrSend");
        await this.eventQueueManager.enqueueEvent(eventData, { dedupe: options.dedupe });
        return true;
      }
      this.logger.warn(`Dropped ${eventData.type} \u2014 consent denied, no queue`, "enqueueOrSend");
      return false;
    }
    if (options.checkSent && this.eventQueueManager) {
      const hasSentDuplicate = await this.eventQueueManager.hasSentDuplicate(eventData);
      if (hasSentDuplicate) {
        this.logger.debug(`Skipped ${eventData.type} \u2014 duplicate found in event queue with matching fingerprint (already sent)`, "enqueueOrSend");
        return true;
      }
    }
    this.logger.debug(`Sending ${eventData.type} \u2014 consent granted`, "enqueueOrSend");
    return await this.sendPostData(event.toPostData(this.implementationType));
  }
  async sendPostData(postData) {
    try {
      const response = await this.transportClient.post(postData);
      if (!response.ok) {
        this.logger.warn(`Transport failed \u2014 status: ${response.status}`, "sendPostData");
      }
      return response.ok;
    } catch (error) {
      this.logger.error(`Transport error \u2014 ${error instanceof Error ? error.message : "unknown"}`, "sendPostData");
      return false;
    }
  }
};

//# sourceMappingURL=index.js.map
;// ./ts/ConsentHandler/consent-provider-adapter.ts
/**
 * Adapts this plugin's AbstractConsentHandler to the SDK's ConsentProvider interface, so the
 * consent management platform the merchant already configured drives the SDK too.
 */
var ConsentProviderAdapter = /** @class */ (function () {
    function ConsentProviderAdapter(consentHandler, requiredConsentTypes) {
        var _this = this;
        this.requiredConsentTypes = requiredConsentTypes;
        this.granted = false;
        this.listeners = new Set();
        // subscribe() emits synchronously, so `granted` is accurate once this constructor returns.
        consentHandler.subscribe(function (consentData) {
            var wasGranted = _this.granted;
            _this.granted = _this.isConsentOfTypesGranted(consentData.consent);
            if (_this.granted !== wasGranted) {
                _this.listeners.forEach(function (callback) { return callback(_this.granted); });
            }
        });
    }
    ConsentProviderAdapter.prototype.isGranted = function () {
        return this.granted;
    };
    ConsentProviderAdapter.prototype.onConsentChange = function (callback) {
        var _this = this;
        this.listeners.add(callback);
        return function () {
            _this.listeners.delete(callback);
        };
    };
    ConsentProviderAdapter.prototype.isConsentOfTypesGranted = function (consentStatusData) {
        return this.requiredConsentTypes.every(function (consentType) {
            return consentStatusData[consentType] === 'granted';
        });
    };
    return ConsentProviderAdapter;
}());


;// ./ts/cookie-handler.ts
var CookieHandler = /** @class */ (function () {
    function CookieHandler() {
    }
    CookieHandler.getCookie = function (name) {
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        for (var _i = 0, cookies_1 = cookies; _i < cookies_1.length; _i++) {
            var cookie = cookies_1[_i];
            var _a = cookie.split('='), cookieName = _a[0], rest = _a.slice(1);
            if (decodeURIComponent(cookieName) === name) {
                return decodeURIComponent(rest.join('='));
            }
        }
        return undefined;
    };
    CookieHandler.setCookie = function (name, value, seconds, path, domain, secure, sameSite) {
        if (path === void 0) { path = '/'; }
        if (domain === void 0) { domain = window.location.hostname.split(/\./).slice(-2).join('.'); }
        if (secure === void 0) { secure = 'secure'; }
        if (sameSite === void 0) { sameSite = 'lax'; }
        var expires = '';
        if (seconds) {
            var date = new Date();
            date.setTime(date.getTime() + (seconds * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + value + expires + ';path=' + path + ';domain=' + domain + ';' + secure + ';samesite=' + sameSite;
    };
    return CookieHandler;
}());


;// ./ts/ConsentHandler/abstract.consent-handler.ts
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var AbstractConsentHandler = /** @class */ (function () {
    function AbstractConsentHandler() {
        this.listeners = [];
        var initialConsent = this.getInitialConsent();
        this.consentValues = {
            necessary: initialConsent.necessary || 'denied',
            functional: initialConsent.functional || 'denied',
            analytics: initialConsent.analytics || 'denied',
            performance: initialConsent.performance || 'denied',
            marketing: initialConsent.marketing || 'denied',
        };
    }
    AbstractConsentHandler.prototype.subscribe = function (listener) {
        this.listeners.push(listener);
        this.emit();
    };
    AbstractConsentHandler.prototype.emit = function () {
        var data = {
            consent: __assign({}, this.consentValues),
            handler: this.getConsentHandlerName(),
        };
        this.listeners.forEach(function (listener) { return listener(data); });
    };
    AbstractConsentHandler.prototype.initialize = function () {
        this.initializeConsentUpdateListener();
    };
    AbstractConsentHandler.prototype.updateConsent = function (consentData) {
        if (consentData.necessary) {
            this.consentValues.necessary = consentData.necessary;
        }
        if (consentData.functional) {
            this.consentValues.functional = consentData.functional;
        }
        if (consentData.analytics) {
            this.consentValues.analytics = consentData.analytics;
        }
        if (consentData.performance) {
            this.consentValues.performance = consentData.performance;
        }
        if (consentData.marketing) {
            this.consentValues.marketing = consentData.marketing;
        }
        this.emit();
    };
    AbstractConsentHandler.prototype.mapConsentType = function (consentType) {
        return this.getConsentTypeMapping()[consentType];
    };
    AbstractConsentHandler.prototype.mapCookieName = function (consentType) {
        return this.getCookieNameMapping()[consentType];
    };
    AbstractConsentHandler.prototype.getConsentFromCookie = function (consentType) {
        var cookieName = this.mapCookieName(consentType);
        if (!cookieName) {
            return undefined;
        }
        var consentCookieValue = CookieHandler.getCookie(cookieName);
        if (!consentCookieValue) {
            return undefined;
        }
        return this.parseConsentCookieValue(consentType, consentCookieValue);
    };
    return AbstractConsentHandler;
}());


;// ./ts/ConsentHandler/cookie-yes.consent-handler.ts
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var CookieYesConsentHandler = /** @class */ (function (_super) {
    __extends(CookieYesConsentHandler, _super);
    function CookieYesConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CookieYesConsentHandler.prototype.getConsentHandlerName = function () {
        return CookieYesConsentHandler.consentHandlerName;
    };
    ;
    CookieYesConsentHandler.prototype.getConsentTypeMapping = function () {
        return CookieYesConsentHandler.consentTypeMapping;
    };
    CookieYesConsentHandler.prototype.getCookieNameMapping = function () {
        return CookieYesConsentHandler.cookieNameMapping;
    };
    CookieYesConsentHandler.prototype.getInitialConsent = function () {
        return {
            necessary: this.getConsentFromCookie('necessary') === true ? 'granted' : 'denied',
            functional: this.getConsentFromCookie('functional') === true ? 'granted' : 'denied',
            analytics: this.getConsentFromCookie('analytics') === true ? 'granted' : 'denied',
            performance: this.getConsentFromCookie('performance') === true ? 'granted' : 'denied',
            marketing: this.getConsentFromCookie('marketing') === true ? 'granted' : 'denied',
        };
    };
    CookieYesConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        document.addEventListener('cookieyes_consent_update', function (event) {
            _this.updateConsent({
                necessary: event.detail.accepted.includes(_this.mapConsentType('necessary')) ? 'granted' : 'denied',
                functional: event.detail.accepted.includes(_this.mapConsentType('functional')) ? 'granted' : 'denied',
                analytics: event.detail.accepted.includes(_this.mapConsentType('analytics')) ? 'granted' : 'denied',
                performance: event.detail.accepted.includes(_this.mapConsentType('performance')) ? 'granted' : 'denied',
                marketing: event.detail.accepted.includes(_this.mapConsentType('marketing')) ? 'granted' : 'denied',
            });
        });
    };
    CookieYesConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return cookieValue.includes(this.mapConsentType(consentType) + ':yes');
    };
    CookieYesConsentHandler.consentHandlerName = 'cookie-law-info';
    CookieYesConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'advertisement',
    };
    CookieYesConsentHandler.cookieNameMapping = {
        necessary: 'cookieyes-consent',
        functional: 'cookieyes-consent',
        analytics: 'cookieyes-consent',
        performance: 'cookieyes-consent',
        marketing: 'cookieyes-consent',
    };
    return CookieYesConsentHandler;
}(AbstractConsentHandler));


;// ./ts/ConsentHandler/cookiebot.consent-handler.ts
var cookiebot_consent_handler_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var CookiebotConsentHandler = /** @class */ (function (_super) {
    cookiebot_consent_handler_extends(CookiebotConsentHandler, _super);
    function CookiebotConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CookiebotConsentHandler.prototype.getConsentHandlerName = function () {
        return CookiebotConsentHandler.consentHandlerName;
    };
    ;
    CookiebotConsentHandler.prototype.getConsentTypeMapping = function () {
        return CookiebotConsentHandler.consentTypeMapping;
    };
    CookiebotConsentHandler.prototype.getCookieNameMapping = function () {
        return CookiebotConsentHandler.cookieNameMapping;
    };
    CookiebotConsentHandler.prototype.getInitialConsent = function () {
        return {
            necessary: this.getConsentFromCookie('necessary') === true ? 'granted' : 'denied',
            functional: this.getConsentFromCookie('functional') === true ? 'granted' : 'denied',
            analytics: this.getConsentFromCookie('analytics') === true ? 'granted' : 'denied',
            performance: this.getConsentFromCookie('performance') === true ? 'granted' : 'denied',
            marketing: this.getConsentFromCookie('marketing') === true ? 'granted' : 'denied',
        };
    };
    CookiebotConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        window.addEventListener('CookiebotOnConsentReady', function () {
            if (_this.getConsentFromCookie('marketing') === true) {
                _this.updateConsent({
                    marketing: 'granted',
                });
            }
            else if (_this.getConsentFromCookie('marketing') === false) {
                _this.updateConsent({
                    marketing: 'denied',
                });
            }
        });
    };
    CookiebotConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return cookieValue.includes(this.mapConsentType(consentType) + ':true');
    };
    CookiebotConsentHandler.consentHandlerName = 'cookiebot';
    CookiebotConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'preferences',
        analytics: 'statistics',
        performance: 'preferences',
        marketing: 'marketing',
    };
    CookiebotConsentHandler.cookieNameMapping = {
        necessary: 'CookieConsent',
        functional: 'CookieConsent',
        analytics: 'CookieConsent',
        performance: 'CookieConsent',
        marketing: 'CookieConsent',
    };
    return CookiebotConsentHandler;
}(AbstractConsentHandler));


;// ./ts/ConsentHandler/custom.consent-handler.ts
var custom_consent_handler_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var custom_consent_handler_assign = (undefined && undefined.__assign) || function () {
    custom_consent_handler_assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return custom_consent_handler_assign.apply(this, arguments);
};

var CustomConsentHandler = /** @class */ (function (_super) {
    custom_consent_handler_extends(CustomConsentHandler, _super);
    function CustomConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomConsentHandler.prototype.getConsentHandlerName = function () {
        return CustomConsentHandler.consentHandlerName;
    };
    ;
    CustomConsentHandler.prototype.getConsentTypeMapping = function () {
        return CustomConsentHandler.consentTypeMapping;
    };
    CustomConsentHandler.prototype.getCookieNameMapping = function () {
        return CustomConsentHandler.cookieNameMapping;
    };
    CustomConsentHandler.prototype.getInitialConsent = function () {
        var defaultConsent = {
            necessary: 'denied',
            functional: 'denied',
            analytics: 'denied',
            performance: 'denied',
            marketing: 'denied',
        };
        if (window.beslist_tracking_js_consent) {
            return window.beslist_tracking_js_consent.reduce(function (accumulator, current) {
                return custom_consent_handler_assign(custom_consent_handler_assign({}, accumulator), current);
            }, defaultConsent);
        }
        return defaultConsent;
    };
    CustomConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        document.addEventListener('beslist_tracking_js_consent', function (event) {
            var consentStatusData = {};
            if (event.detail.hasOwnProperty(_this.mapConsentType('necessary'))) {
                consentStatusData.necessary = event.detail[_this.mapConsentType('necessary')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('functional'))) {
                consentStatusData.functional = event.detail[_this.mapConsentType('functional')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('analytics'))) {
                consentStatusData.analytics = event.detail[_this.mapConsentType('analytics')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('performance'))) {
                consentStatusData.performance = event.detail[_this.mapConsentType('performance')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('marketing'))) {
                consentStatusData.marketing = event.detail[_this.mapConsentType('marketing')] === 'granted' ? 'granted' : 'denied';
            }
            _this.updateConsent(consentStatusData);
        });
    };
    CustomConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return undefined;
    };
    CustomConsentHandler.consentHandlerName = 'custom';
    CustomConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'marketing',
    };
    CustomConsentHandler.cookieNameMapping = {
        necessary: undefined,
        functional: undefined,
        analytics: undefined,
        performance: undefined,
        marketing: undefined,
    };
    return CustomConsentHandler;
}(AbstractConsentHandler));


;// ./ts/event-handler.ts

var EventHandler = /** @class */ (function () {
    function EventHandler(configuration) {
        this.known_advertising_params = [
            '__hsfp',
            '__hssc',
            '__hstc',
            '__s',
            '_hsenc',
            '_openstat',
            'dclid',
            'fbclid',
            'gclid',
            'hsCtaTracking',
            'mc_eid',
            'mkt_tok',
            'ml_subscriber',
            'ml_subscriber_hash',
            'msclkid',
            'oly_anon_id',
            'oly_enc_id',
            'rb_clickid',
            's_cid',
            'vero_conv',
            'vero_id',
            'wickedid',
            'yclid'
        ];
        this.configuration = configuration;
    }
    EventHandler.prototype.sendSessionStart = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var eventData = {
                eventName: 'session_start',
                screenHeight: screen.height || undefined,
                screenWidth: screen.width || undefined,
                location: {
                    protocol: window.location.protocol || '',
                    host: window.location.host || '',
                    path: window.location.pathname || '',
                    query: window.location.search || '',
                    hash: window.location.hash || '',
                    referrer: document.referrer || '',
                },
                context: {
                    sessionStartReasons: _this.getSessionStartReasons().join('|'),
                },
            };
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    }
                    else {
                        reject(xmlHttpRequest.status);
                    }
                }
            };
            xmlHttpRequest.open('POST', _this.configuration.eventApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send(JSON.stringify(eventData));
        });
    };
    EventHandler.prototype.sendQueuedEvents = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    }
                    else {
                        reject(xmlHttpRequest.status);
                    }
                }
            };
            xmlHttpRequest.open('POST', _this.configuration.queuedEventsApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send();
        });
    };
    EventHandler.prototype.hasSessionIDCookie = function () {
        return CookieHandler.getCookie(this.configuration.sessionIDCookieName) !== undefined;
    };
    EventHandler.prototype.requiresSessionStart = function () {
        return this.getSessionStartReasons().length >= 1;
    };
    EventHandler.prototype.getSessionStartReasons = function () {
        var sessionStartReasons = [];
        if (!this.hasSessionIDCookie()) {
            sessionStartReasons.push('no session id');
        }
        if (this.isPageReload()) {
            return sessionStartReasons;
        }
        if (document.referrer !== '') {
            var referrerHost = new URL(document.referrer).hostname.split('.').slice(-2).join('.');
            var currentHost = location.hostname.split('.').slice(-2).join('.');
            if (referrerHost !== currentHost) {
                sessionStartReasons.push('new referrer');
            }
        }
        else {
            sessionStartReasons.push('new referrer');
        }
        if (window.location.search.indexOf('utm_') > -1) {
            sessionStartReasons.push('utm detected');
        }
        if (window.location.search.indexOf('clientUuid') > -1) {
            sessionStartReasons.push('new uuid detected');
        }
        else if (window.location.search.indexOf('bl3nlclid') > -1) {
            sessionStartReasons.push('new bl3nlclid detected');
        }
        if (this.known_advertising_params.some(function (param) { return window.location.search.includes(param); }) && window.location.search.indexOf('_gl') === -1) {
            sessionStartReasons.push('advertising param detected');
        }
        return sessionStartReasons;
    };
    EventHandler.prototype.isPageReload = function () {
        // @ts-ignore - See: https://github.com/microsoft/TypeScript/issues/58644
        return (window.performance.navigation && window.performance.navigation.type === 1) || performance.getEntriesByType('navigation').some(function (entry) { return entry.type === 'reload'; });
    };
    return EventHandler;
}());


;// ./ts/beslist-handler.ts







var BeslistHandler = /** @class */ (function () {
    function BeslistHandler(configuration) {
        var _this = this;
        this.hasSentSessionStart = false;
        this.configuration = configuration;
        if (this.configuration.areCustomTriggersEnabled) {
            this.addCustomConsentMethods();
        }
        this.eventHandler = new EventHandler(this.configuration);
        if (!this.configuration.isTrackingEnabled) {
            return;
        }
        this.consentHandler = this.getActiveConsentHandler();
        if (!this.consentHandler) {
            console.info('Beslist Tracking: No ConsentHandler initialized.');
        }
        else {
            this.consentProvider = new ConsentProviderAdapter(this.consentHandler, this.configuration.requiredConsentTypes);
            this.consentHandler.subscribe(function (consentData) { return _this.handleConsentUpdateEvent(consentData); });
            this.consentHandler.initialize();
        }
        this.sendCookielessPings();
    }
    BeslistHandler.prototype.addCustomConsentMethods = function () {
        window.beslist_tracking_js_consent = window.beslist_tracking_js_consent || [];
        var consentFromAction = this.configuration.consentFromAction;
        if (consentFromAction) {
            window.beslist_tracking_js_consent.push(consentFromAction);
        }
        window.beslist_tracking_update_consent = function (value) {
            window.beslist_tracking_js_consent.push(value);
            document.dispatchEvent(new CustomEvent('beslist_tracking_js_consent', { detail: value }));
        };
    };
    BeslistHandler.prototype.handleConsentUpdateEvent = function (consentData) {
        var _this = this;
        this.lastConsent = consentData.consent;
        CookieHandler.setCookie(this.configuration.consentCookieName, JSON.stringify(consentData), 365 * 24 * 60 * 60);
        if (this.configuration.hasQueuedEvents && this.isConsentOfTypesGranted(this.configuration.requiredConsentTypes, consentData.consent)) {
            this.eventHandler.sendQueuedEvents().then(function () {
                _this.configuration.hasQueuedEvents = false;
            });
        }
        if (!this.hasSentSessionStart && this.eventHandler.requiresSessionStart()) {
            this.eventHandler.sendSessionStart().then(function () {
                _this.hasSentSessionStart = true;
                if (!_this.isConsentOfTypesGranted(_this.configuration.requiredConsentTypes, consentData.consent)) {
                    _this.configuration.hasQueuedEvents = true;
                }
            });
        }
    };
    BeslistHandler.prototype.sendCookielessPings = function () {
        if (!this.configuration.cookielessPingsEnabled || !this.configuration.advertiserID) {
            return;
        }
        var tracker;
        try {
            tracker = new BeslistTracker(resolveConfiguration(this.configuration.advertiserID, {
                implementationType: 'magento_plugin-' + this.configuration.pluginVersion,
                cookielessPingEnabled: true,
                captureMidSessionReferrer: true,
            }), this.consentProvider ? { consent: this.consentProvider } : {});
        }
        catch (error) {
            console.error('Beslist Tracking: could not start the cookieless ping tracker.', error);
            return;
        }
        var consent = this.getConsentState();
        tracker.sendSessionStartPing(consent).catch(function (error) { return console.error(error); });
        var conversionData = this.configuration.conversionData;
        if (conversionData) {
            tracker.sendConversionPing(conversionData, consent).catch(function (error) { return console.error(error); });
        }
    };
    /**
     * The visitor's consent as the ping reports it, or undefined when no platform answered.
     */
    BeslistHandler.prototype.getConsentState = function () {
        if (!this.lastConsent) {
            return undefined;
        }
        return {
            functional: this.lastConsent.functional === 'granted',
            analytics: this.lastConsent.analytics === 'granted',
            marketing: this.lastConsent.marketing === 'granted',
        };
    };
    BeslistHandler.prototype.isConsentOfTypesGranted = function (consentTypes, consentStatusData) {
        var _this = this;
        return consentTypes.every(function (consentType) {
            return _this.isConsentOfTypeGranted(consentType, consentStatusData);
        });
    };
    BeslistHandler.prototype.isConsentOfTypeGranted = function (consentType, consentStatusData) {
        switch (true) {
            case consentType === 'necessary':
                return !!(consentStatusData.necessary && consentStatusData.necessary === 'granted');
            case consentType === 'functional':
                return !!(consentStatusData.functional && consentStatusData.functional === 'granted');
            case consentType === 'analytics':
                return !!(consentStatusData.analytics && consentStatusData.analytics === 'granted');
            case consentType === 'performance':
                return !!(consentStatusData.performance && consentStatusData.performance === 'granted');
            case consentType === 'marketing':
                return !!(consentStatusData.marketing && consentStatusData.marketing === 'granted');
            default:
                throw new Error('ConsentType "' + consentType + '" not implemented.');
        }
    };
    BeslistHandler.prototype.getActiveConsentHandler = function () {
        if (this.configuration.activeConsentHandlerName === CustomConsentHandler.consentHandlerName) {
            return new CustomConsentHandler();
        }
        if (this.configuration.activeConsentHandlerName === CookiebotConsentHandler.consentHandlerName) {
            return new CookiebotConsentHandler();
        }
        if (this.configuration.activeConsentHandlerName === CookieYesConsentHandler.consentHandlerName) {
            return new CookieYesConsentHandler();
        }
        return undefined;
    };
    return BeslistHandler;
}());
window.addEventListener('beslistTrackingConfigReady', function (event) {
    var customEvent = event; // type assertion here
    var configData = customEvent.detail;
    new BeslistHandler(configData);
});

/******/ })()
;