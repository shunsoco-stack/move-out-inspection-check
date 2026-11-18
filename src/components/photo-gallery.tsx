/* eslint-disable @next/next/no-img-element -- IndexedDBの端末内画像を直接表示するため。 */
import { japanDate, japanTime } from "@/lib/dates";
import type { Photo } from "@/lib/types";

export function PhotoGallery({
  photos,
  onRemove,
}: {
  photos: Photo[];
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <figure className="photo-card" key={photo.id}>
          <div className="photo-image">
            <img src={photo.data} alt={`${photo.label}の記録写真`} width="800" height="560" />
            <span className="photo-overlay">{photo.label}</span>
          </div>
          <figcaption>
            <span>
              {japanDate(new Date(photo.takenAt))} {japanTime(new Date(photo.takenAt))}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                aria-label={`${photo.label}の写真を削除`}
              >
                削除
              </button>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
