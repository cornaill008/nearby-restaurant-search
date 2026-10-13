import { LocationError, type LocationProvider } from '../ports'

/** 토스 SDK 중 위치 조회에 필요한 부분. 테스트에서는 가짜로 바꿔 끼운다. */
export interface TossLocationApi {
  getCurrentLocation: (options: {
    accuracy: number
  }) => Promise<{ coords: { latitude: number; longitude: number } }>
  accuracy: number
  isPermissionError: (error: unknown) => boolean
}

async function loadTossApi(): Promise<TossLocationApi> {
  // 웹 버전 번들에 SDK가 들어가지 않도록 필요할 때만 불러온다.
  const sdk = await import('@apps-in-toss/web-framework')
  return {
    getCurrentLocation: sdk.getCurrentLocation,
    accuracy: sdk.Accuracy.Balanced,
    isPermissionError: (error) => error instanceof sdk.GetCurrentLocationPermissionError,
  }
}

export function createTossLocationProvider(
  loadApi: () => Promise<TossLocationApi> = loadTossApi,
): LocationProvider {
  return {
    async getCurrentPosition() {
      let api: TossLocationApi
      try {
        api = await loadApi()
      } catch (error) {
        throw new LocationError('failed', error instanceof Error ? error.message : String(error))
      }

      try {
        const { coords } = await api.getCurrentLocation({ accuracy: api.accuracy })
        return { lat: coords.latitude, lng: coords.longitude }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new LocationError(api.isPermissionError(error) ? 'denied' : 'failed', message)
      }
    },
  }
}
