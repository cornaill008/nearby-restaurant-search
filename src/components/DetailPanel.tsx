import { formatDistance, type Restaurant } from '../domain/restaurant'

export interface DetailPanelProps {
  restaurant: Restaurant
  onClose: () => void
}

export function DetailPanel({ restaurant, onClose }: DetailPanelProps) {
  const { name, category, address, phone, distance, placeUrl } = restaurant

  return (
    <section className="detail-panel" aria-label={`${name} 상세 정보`}>
      <div className="detail-header">
        <h2>{name}</h2>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <dl className="detail-fields">
        <dt>카테고리</dt>
        <dd>{category || '정보 없음'}</dd>

        <dt>주소</dt>
        <dd>{address || '정보 없음'}</dd>

        {phone && (
          <>
            <dt>전화번호</dt>
            <dd>{phone}</dd>
          </>
        )}

        {distance !== null && (
          <>
            <dt>거리</dt>
            <dd>{formatDistance(distance)}</dd>
          </>
        )}
      </dl>

      <div className="detail-actions">
        {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>전화 걸기</a>}
        {placeUrl && (
          <a href={placeUrl} target="_blank" rel="noopener noreferrer">
            카카오맵에서 보기
          </a>
        )}
      </div>
    </section>
  )
}
