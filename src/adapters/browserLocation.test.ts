import { describe, expect, it } from 'vitest'
import { LocationError } from '../ports'
import { createBrowserLocationProvider } from './browserLocation'

type SuccessCb = PositionCallback
type ErrorCb = PositionErrorCallback

function fakeGeolocation(behavior: (success: SuccessCb, error: ErrorCb) => void): Geolocation {
  return {
    getCurrentPosition: (success: SuccessCb, error?: ErrorCb | null) =>
      behavior(success, error as ErrorCb),
    watchPosition: () => 0,
    clearWatch: () => {},
  }
}

function positionError(code: number): GeolocationPositionError {
  return {
    code,
    message: 'fake',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }
}

describe('createBrowserLocationProvider', () => {
  it('권한을 허용하면 좌표를 반환한다', async () => {
    const provider = createBrowserLocationProvider(
      fakeGeolocation((success) =>
        success({
          coords: { latitude: 37.5666, longitude: 126.9784 },
        } as GeolocationPosition),
      ),
    )

    await expect(provider.getCurrentPosition()).resolves.toEqual({
      lat: 37.5666,
      lng: 126.9784,
    })
  })

  it('권한을 거부하면 denied로 reject한다', async () => {
    const provider = createBrowserLocationProvider(
      fakeGeolocation((_success, error) => error(positionError(1))),
    )

    const rejection = provider.getCurrentPosition()
    await expect(rejection).rejects.toBeInstanceOf(LocationError)
    await expect(rejection).rejects.toMatchObject({ reason: 'denied' })
  })

  it('시간 초과면 failed로 reject한다', async () => {
    const provider = createBrowserLocationProvider(
      fakeGeolocation((_success, error) => error(positionError(3))),
    )

    await expect(provider.getCurrentPosition()).rejects.toMatchObject({ reason: 'failed' })
  })

  it('geolocation을 지원하지 않으면 failed로 reject한다', async () => {
    const provider = createBrowserLocationProvider(undefined)

    await expect(provider.getCurrentPosition()).rejects.toMatchObject({ reason: 'failed' })
  })
})
