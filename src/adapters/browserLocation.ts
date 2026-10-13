import { LocationError, type LocationProvider } from '../ports'

const TIMEOUT_MS = 10_000

export function createBrowserLocationProvider(
  geolocation: Geolocation | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.geolocation,
): LocationProvider {
  return {
    getCurrentPosition() {
      return new Promise((resolve, reject) => {
        if (!geolocation) {
          reject(new LocationError('failed', 'geolocation not supported'))
          return
        }

        geolocation.getCurrentPosition(
          (position) =>
            resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) =>
            reject(
              new LocationError(
                error.code === error.PERMISSION_DENIED ? 'denied' : 'failed',
                error.message,
              ),
            ),
          { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
        )
      })
    },
  }
}
