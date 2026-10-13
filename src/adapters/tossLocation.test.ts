import { describe, expect, it, vi } from 'vitest'
import { LocationError } from '../ports'
import { createTossLocationProvider, type TossLocationApi } from './tossLocation'

class FakePermissionError extends Error {}

function fakeApi(getCurrentLocation: TossLocationApi['getCurrentLocation']): TossLocationApi {
  return {
    getCurrentLocation,
    accuracy: 3,
    isPermissionError: (error) => error instanceof FakePermissionError,
  }
}

describe('createTossLocationProvider', () => {
  it('토스 SDK가 준 좌표를 위도/경도로 돌려준다', async () => {
    const getCurrentLocation = vi
      .fn()
      .mockResolvedValue({ coords: { latitude: 37.5, longitude: 127.1 } })
    const provider = createTossLocationProvider(async () => fakeApi(getCurrentLocation))

    await expect(provider.getCurrentPosition()).resolves.toEqual({ lat: 37.5, lng: 127.1 })
    expect(getCurrentLocation).toHaveBeenCalledWith({ accuracy: 3 })
  })

  it('권한 거부 에러는 denied로 바꾼다', async () => {
    const provider = createTossLocationProvider(async () =>
      fakeApi(vi.fn().mockRejectedValue(new FakePermissionError('no permission'))),
    )

    await expect(provider.getCurrentPosition()).rejects.toMatchObject({
      name: 'LocationError',
      reason: 'denied',
    })
  })

  it('그 밖의 에러는 failed로 바꾼다', async () => {
    const provider = createTossLocationProvider(async () =>
      fakeApi(vi.fn().mockRejectedValue(new Error('gps off'))),
    )

    const error = await provider.getCurrentPosition().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LocationError)
    expect(error).toMatchObject({ reason: 'failed', message: 'gps off' })
  })

  it('SDK를 불러오지 못해도 failed로 바꾼다', async () => {
    const provider = createTossLocationProvider(async () => {
      throw new Error('not in toss')
    })

    await expect(provider.getCurrentPosition()).rejects.toMatchObject({ reason: 'failed' })
  })
})
