# 주변 식당 찾기

내 위치 주변의 식당을 거리순으로 보여주고, 지도에 표시하고, 키워드로 검색할 수 있는 웹앱입니다.
한국 지역만 지원하며, 데이터와 지도는 카카오 로컬 API와 카카오맵을 사용합니다.

- React + TypeScript + Vite
- 서버 없이 브라우저에서 카카오맵 JavaScript SDK로 직접 검색합니다.

## 실행 방법

### 1. 카카오 앱 만들기 (처음 한 번)

1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 **내 애플리케이션 > 애플리케이션 추가**로 앱을 만듭니다.
2. 앱 설정에서 **카카오맵 서비스를 사용 설정(ON)** 합니다. 꺼져 있으면 SDK가 거부됩니다.
3. **플랫폼 키**에서 **JavaScript 키**를 확인하고, JavaScript SDK 도메인에 아래 주소를 등록합니다.
   - 개발: `http://localhost:5173`
   - 배포 후: 배포된 주소 (예: `https://내앱.vercel.app`)

### 2. 키 설정

`.env.example`을 `.env.local`로 복사하고 JavaScript 키를 채웁니다.

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

```
VITE_KAKAO_JS_KEY=발급받은_JavaScript_키
```

- `=` 앞뒤에 공백이나 따옴표를 넣지 마세요.
- `.env.local`은 git에 올라가지 않습니다. 키를 저장소에 커밋하지 마세요.
- REST API 키가 아니라 **JavaScript 키**입니다.

### 3. 설치하고 실행

```powershell
npm install
npm run dev
```

브라우저에서 <http://localhost:5173>을 엽니다. 위치 권한을 허용하면 주변 식당이 나타납니다.
도메인을 등록한 주소(`localhost:5173`)와 포트가 다르면 지도가 뜨지 않습니다.

## 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (포트 5173) |
| `npm test` | 테스트 실행 |
| `npm run build` | 배포용 빌드 (`dist/`) |
| `npm run lint` | 린트 |

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 지도와 목록이 모두 "불러오지 못했어요" | 카카오 앱의 **카카오맵 사용 설정**이 켜져 있는지, `.env.local`의 키가 맞는지, 현재 주소가 JavaScript SDK 도메인에 등록돼 있는지 |
| 위치 권한 안내가 나옴 | 브라우저의 사이트 설정에서 위치 권한을 허용하세요. 키워드 검색은 위치 없이도 됩니다. |
| 지도만 안 뜸 | 화면의 **지도 다시 시도** 버튼을 누르세요. |
| 키를 바꿨는데 반영이 안 됨 | 개발 서버를 껐다가 다시 실행하세요 (`.env.local`은 시작할 때만 읽습니다). |

## 구조

화면은 외부 SDK를 직접 알지 못하고 아래 인터페이스(`src/ports.ts`)만 사용합니다.
나중에 위치 조회나 지도를 다른 것으로 바꾸려면 어댑터만 교체하면 됩니다.

```
LocationProvider   현재 위치 조회        src/adapters/browserLocation.ts
PlaceSearchService 식당 검색            src/adapters/kakaoPlaceSearch.ts
MapView            지도와 마커 표시      src/adapters/kakaoMapView.ts
```

- `src/domain/` 식당 모델과 카카오 응답 변환
- `src/state/` 화면 상태 (`useRestaurants`)
- `src/components/` 목록, 지도, 검색창, 상세 패널

## 명세

기능 명세와 설계는 `openspec/changes/nearby-restaurant-search/`에 있습니다.
