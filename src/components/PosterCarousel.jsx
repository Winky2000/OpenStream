'use client';

import { useEffect, useState } from 'react';
import styles from './PosterCarousel.module.css';

export default function PosterCarousel({ durationSeconds = 55 }) {
  const [posters, setPosters] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const durationSecondsNumber =
    Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
      ? Number(durationSeconds)
      : 55;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posters?type=${encodeURIComponent(filter)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data?.posters) ? data.posters : [];
        if (!cancelled) setPosters(list);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (error) return null;
  if (!posters || posters.length === 0) return null;

  const safePosters = posters.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.url !== 'string') return false;
    const u = p.url.trim();
    if (!u) return false;
    // We only expect absolute URLs from /api/posters.
    if (!/^https?:\/\//i.test(u)) return false;
    return true;
  });

  if (safePosters.length === 0) return null;

  const doubled = safePosters.concat(safePosters);

  return (
    <div className={styles.wrap} aria-label="Posters">
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ '--posterMarqueeDuration': `${durationSecondsNumber}s` }}
        >
          {doubled.map((p, idx) => (
            <img
              key={`${p.url}-${idx}`}
              className={styles.poster}
              src={p.url}
              alt={p.title || 'Poster'}
              width={300}
              height={450}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
        </div>
      </div>

      <div className={styles.controls} aria-label="Poster filter">
        <button
          type="button"
          className={`${styles.pill} ${filter === 'all' ? styles.pillActiveAll : ''}`}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Random
        </button>
        <button
          type="button"
          className={`${styles.pill} ${filter === 'movies' ? styles.pillActiveMovies : ''}`}
          aria-pressed={filter === 'movies'}
          onClick={() => setFilter('movies')}
        >
          Movies
        </button>
        <button
          type="button"
          className={`${styles.pill} ${filter === 'tv' ? styles.pillActiveTv : ''}`}
          aria-pressed={filter === 'tv'}
          onClick={() => setFilter('tv')}
        >
          TV Shows
        </button>
      </div>
    </div>
  );
}
