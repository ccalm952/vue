type AMapGlobal = any;

declare global {
  interface Window {
    AMap?: AMapGlobal;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const LOCATION_CACHE_MAX_AGE_MS = 30_000;

type CachedLocation = {
  latitude: number;
  longitude: number;
  address: string;
  cachedAt: number;
};

let amapLoaderPromise: Promise<AMapGlobal> | null = null;
let lastLocationCache: CachedLocation | null = null;

function getAmapEnv() {
  const key = (import.meta.env.VITE_AMAP_JS_API_KEY || "").trim();
  const securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE || "").trim();
  return { key, securityJsCode };
}

function getValidCachedLocation() {
  if (!lastLocationCache) return null;
  if (Date.now() - lastLocationCache.cachedAt > LOCATION_CACHE_MAX_AGE_MS) {
    lastLocationCache = null;
    return null;
  }
  return lastLocationCache;
}

function setCachedLocation(location: { latitude: number; longitude: number; address: string }) {
  lastLocationCache = {
    ...location,
    cachedAt: Date.now(),
  };
}

export function loadAmap(): Promise<AMapGlobal> {
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (amapLoaderPromise) {
    return amapLoaderPromise;
  }

  const { key, securityJsCode } = getAmapEnv();
  if (!key) {
    return Promise.reject(new Error("未配置 VITE_AMAP_JS_API_KEY"));
  }

  if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode };
  }

  amapLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-amap-jsapi="true"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.AMap) resolve(window.AMap);
      });
      existing.addEventListener("error", () => reject(new Error("高德地图 JS API 加载失败")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Geolocation,AMap.Geocoder,AMap.ToolBar`;
    script.async = true;
    script.defer = true;
    script.dataset.amapJsapi = "true";
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        reject(new Error("高德地图 JS API 未正确挂载"));
      }
    };
    script.onerror = () => reject(new Error("高德地图 JS API 加载失败"));
    document.head.appendChild(script);
  });

  return amapLoaderPromise;
}

export async function geolocateWithAmap(): Promise<{
  latitude: number;
  longitude: number;
  address: string;
}> {
  const cached = getValidCachedLocation();
  if (cached) {
    return {
      latitude: cached.latitude,
      longitude: cached.longitude,
      address: cached.address,
    };
  }

  const AMap = await loadAmap();

  return new Promise((resolve, reject) => {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: LOCATION_CACHE_MAX_AGE_MS,
      convert: true,
      showButton: false,
      showMarker: false,
      showCircle: false,
      panToLocation: false,
      zoomToAccuracy: false,
    });

    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status !== "complete" || !result?.position) {
        reject(new Error(result?.message || "高德定位失败"));
        return;
      }

      const location = {
        longitude: Number(result.position.lng),
        latitude: Number(result.position.lat),
        address: String(result.formattedAddress || ""),
      };
      setCachedLocation(location);
      resolve(location);
    });
  });
}

export async function reverseGeocodeWithAmap(lat: number, lng: number): Promise<string> {
  const cached = getValidCachedLocation();
  if (
    cached &&
    Math.abs(cached.latitude - lat) < 0.000001 &&
    Math.abs(cached.longitude - lng) < 0.000001 &&
    cached.address
  ) {
    return cached.address;
  }

  const AMap = await loadAmap();

  return new Promise((resolve, reject) => {
    const geocoder = new AMap.Geocoder();
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status !== "complete") {
        reject(new Error(result?.info || "高德逆地理编码失败"));
        return;
      }

      const address = String(result?.regeocode?.formattedAddress || "");
      if (address) {
        setCachedLocation({ latitude: lat, longitude: lng, address });
      }
      resolve(address);
    });
  });
}
