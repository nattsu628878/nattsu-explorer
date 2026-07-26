<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  /** @type {{ slug: string, lat: number, lng: number, date: string, photo: string, notes?: string }[]} */
  export let spots = [];

  let mapContainer;
  let map;
  let markerMap = new Map(); // slug -> { marker, element }
  let activeSpot = null;
  let distancePx = null;
  let mousePos = null;

  let prevActiveSlug = null;
  let rafId = null;
  let isDraggingMap = false;

  // ハーバーサイン公式による地球表面上の距離計算 (km)
  function getGeoDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatDistance(distKm) {
    if (distKm === null || distKm === undefined) return '';
    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} m`;
    }
    return `${distKm.toFixed(1)} km`;
  }

  function popupHtml(spot) {
    const notes = spot.notes
      ? `<p style="margin:0.25rem 0 0;font-size:0.85em;color:var(--text-secondary);">${spot.notes}</p>`
      : '';
    return `<div style="font-family:inherit;min-width:180px;">
      <img src="${spot.photo}" alt="" style="width:100%;border-radius:4px;margin-bottom:0.5rem;display:block;" />
      <div style="font-size:0.75em;color:var(--text-muted);">${spot.date}</div>
      ${notes}
    </div>`;
  }

  function updateNearestSpot(point) {
    if (!spots.length || !map || isDraggingMap) return;

    let minPixelDist = Infinity;
    let closestSpot = null;

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      const proj = map.project([spot.lng, spot.lat]);
      const dx = point.x - proj.x;
      const dy = point.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minPixelDist) {
        minPixelDist = dist;
        closestSpot = spot;
      }
    }

    if (closestSpot) {
      const isNewSpot = !activeSpot || activeSpot.slug !== closestSpot.slug;
      activeSpot = closestSpot;
      distancePx = Math.round(minPixelDist);

      if (isNewSpot) {
        updateMarkerStyles();
      }
    }
  }

  // 全マーカーのDOMループを回避し、変更があった2要素のみを超高速更新
  function updateMarkerStyles() {
    const currentSlug = activeSpot ? activeSpot.slug : null;
    if (prevActiveSlug === currentSlug) return;

    if (prevActiveSlug && markerMap.has(prevActiveSlug)) {
      markerMap.get(prevActiveSlug).element.classList.remove('is-active');
    }
    if (currentSlug && markerMap.has(currentSlug)) {
      markerMap.get(currentSlug).element.classList.add('is-active');
    }
    prevActiveSlug = currentSlug;
  }

  function renderMarkers() {
    markerMap.forEach(({ marker }) => marker.remove());
    markerMap.clear();

    if (spots.length === 0) return;

    for (const spot of spots) {
      const marker = new maplibregl.Marker({ color: '#628878' })
        .setLngLat([spot.lng, spot.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml(spot)))
        .addTo(map);

      const el = marker.getElement();
      el.classList.add('spot-marker');

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        activeSpot = spot;
        updateMarkerStyles();
      });

      markerMap.set(spot.slug, { marker, element: el });
    }

    const bounds = spots.reduce(
      (b, s) => b.extend([s.lng, s.lat]),
      new maplibregl.LngLatBounds([spots[0].lng, spots[0].lat], [spots[0].lng, spots[0].lat])
    );
    map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 });

    setTimeout(() => {
      if (mapContainer && map) {
        map.resize();
        const centerPoint = { x: mapContainer.clientWidth / 2, y: mapContainer.clientHeight / 2 };
        updateNearestSpot(centerPoint);
      }
    }, 150);
  }

  function focusActiveSpot() {
    if (activeSpot && map) {
      map.flyTo({
        center: [activeSpot.lng, activeSpot.lat],
        zoom: Math.max(map.getZoom(), 12),
        duration: 800
      });
    }
  }

  function scheduleNearestSpotUpdate(point) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateNearestSpot(point);
    });
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [138.5, 37.0],
      zoom: 4.5
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      renderMarkers();
    });

    map.on('dragstart', () => {
      isDraggingMap = true;
    });

    map.on('dragend', () => {
      isDraggingMap = false;
      if (mousePos) {
        scheduleNearestSpotUpdate(mousePos);
      }
    });

    map.on('mousemove', (e) => {
      mousePos = e.point;
      if (!isDraggingMap) {
        scheduleNearestSpotUpdate(e.point);
      }
    });

    map.on('moveend', () => {
      if (!isDraggingMap && mousePos) {
        scheduleNearestSpotUpdate(mousePos);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (map) map.resize();
    });
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      map.remove();
    };
  });

  $: cursorGeoDist = (activeSpot && mousePos && map && !isDraggingMap)
    ? getGeoDistanceKm(
        map.unproject(mousePos).lat,
        map.unproject(mousePos).lng,
        activeSpot.lat,
        activeSpot.lng
      )
    : null;
</script>

<div class="explorer-layout">
  <div class="map-pane">
    <div class="map" bind:this={mapContainer}></div>
    {#if activeSpot}
      <div class="map-status-overlay">
        <span class="pulse-icon"></span>
        <span>最寄りピンに追従中</span>
      </div>
    {/if}
  </div>

  <aside class="side-pane">
    {#if activeSpot}
      <div class="spot-card">
        <div class="card-header">
          <div class="badge-group">
            <span class="badge active-badge">最寄りピン</span>
            {#if distancePx !== null}
              <span class="badge dist-badge">{distancePx}px</span>
            {/if}
            {#if cursorGeoDist !== null}
              <span class="badge geo-badge">{formatDistance(cursorGeoDist)}</span>
            {/if}
          </div>
          <button class="focus-btn" on:click={focusActiveSpot} title="ピンの位置へ移動">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            ズーム
          </button>
        </div>

        <div class="photo-wrapper" on:click={focusActiveSpot}>
          <img src={activeSpot.photo} alt="Spot photo" class="spot-photo" />
          <div class="photo-overlay">
            <span>クリックでピンへ移動</span>
          </div>
        </div>

        <div class="spot-meta">
          <div class="meta-row date-row">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="date-text">{activeSpot.date}</span>
          </div>

          <div class="meta-row coords-row">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="coords-text">{activeSpot.lat.toFixed(4)}, {activeSpot.lng.toFixed(4)}</span>
          </div>

          {#if activeSpot.notes}
            <div class="notes-box">
              <p>{activeSpot.notes}</p>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <p>地図上にカーソルを合わせると<br />最寄りのピンの写真が表示されます</p>
      </div>
    {/if}
  </aside>
</div>

<style>
  .explorer-layout {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .map-pane {
    position: relative;
    flex: 1;
    height: 100%;
    min-width: 0;
  }

  .map {
    width: 100%;
    height: 100%;
  }

  .map-status-overlay {
    position: absolute;
    bottom: 16px;
    left: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-panel);
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    pointer-events: none;
  }

  .pulse-icon {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--accent);
    box-shadow: 0 0 0 0 rgba(98, 136, 120, 0.7);
    animation: pulse-ring 2s infinite;
  }

  @keyframes pulse-ring {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(98, 136, 120, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 6px rgba(98, 136, 120, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(98, 136, 120, 0);
    }
  }

  .side-pane {
    width: 360px;
    height: 100%;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1rem;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .spot-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .badge-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .active-badge {
    background: var(--accent);
    color: #fff;
  }

  .dist-badge {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .geo-badge {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .focus-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .focus-btn:hover {
    background: var(--accent-bg);
    color: var(--accent);
    border-color: var(--accent);
  }

  .photo-wrapper {
    position: relative;
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-tertiary);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .spot-photo {
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }

  .photo-wrapper:hover .spot-photo {
    transform: scale(1.02);
  }

  .photo-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .photo-wrapper:hover .photo-overlay {
    opacity: 1;
  }

  .spot-meta {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .date-text {
    font-weight: 600;
    color: var(--text-primary);
  }

  .coords-text {
    font-family: monospace;
    font-size: 0.8rem;
  }

  .notes-box {
    margin-top: 0.4rem;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .notes-box p {
    margin: 0;
    white-space: pre-wrap;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
    font-size: 0.9rem;
  }

  /* MapLibre標準ピンのスタイルカスタム */
  :global(.spot-marker) {
    cursor: pointer;
  }

  :global(.spot-marker svg) {
    transition: transform 0.2s ease, filter 0.2s ease;
  }

  :global(.spot-marker svg path) {
    transition: fill 0.2s ease;
  }

  :global(.spot-marker.is-active) {
    z-index: 10 !important;
  }

  :global(.spot-marker.is-active svg) {
    transform: scale(1.4) translateY(-4px);
    filter: drop-shadow(0 4px 8px rgba(230, 57, 70, 0.6));
  }

  :global(.spot-marker.is-active svg path) {
    fill: #e63946 !important;
  }

  /* ポップアップのグローバルスタイル */
  :global(.maplibregl-popup-content) {
    background: var(--bg-panel);
    color: var(--text-primary);
    box-shadow: var(--shadow-md);
    border-radius: 6px;
    padding: 10px;
  }

  :global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
    border-top-color: var(--bg-panel);
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .explorer-layout {
      flex-direction: column;
    }

    .side-pane {
      width: 100%;
      height: 260px;
      border-left: none;
      border-top: 1px solid var(--border-color);
    }
  }

  :global(.maplibregl-ctrl-group) {
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
  }

  :global(.maplibregl-ctrl-group button) {
    background: transparent;
  }

  :global(.maplibregl-ctrl-icon) {
    filter: var(--map-ctrl-icon-filter, none);
  }
</style>

