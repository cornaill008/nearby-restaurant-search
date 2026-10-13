import type { KakaoSdk } from './kakaoTypes'

declare global {
  interface Window {
    kakao?: KakaoSdk & { maps: { load(callback: () => void): void } }
  }
}

let pending: Promise<KakaoSdk> | null = null

/** 카카오맵 JS SDK(services 라이브러리 포함)를 한 번만 불러온다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadKakaoSdk(appKey: string | undefined = import.meta.env.VITE_KAKAO_JS_KEY): Promise<KakaoSdk> {
  if (pending) return pending

  const attempt = new Promise<KakaoSdk>((resolve, reject) => {
    if (!appKey) {
      reject(new Error('VITE_KAKAO_JS_KEY is not set'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`
    script.onerror = () => {
      script.remove()
      reject(new Error('failed to load Kakao Maps SDK'))
    }
    script.onload = () => {
      const kakao = window.kakao
      if (!kakao) {
        reject(new Error('Kakao Maps SDK did not initialize'))
        return
      }
      kakao.maps.load(() => resolve(kakao))
    }
    document.head.appendChild(script)
  })

  pending = attempt
  attempt.catch(() => {
    if (pending === attempt) pending = null
  })
  return attempt
}
