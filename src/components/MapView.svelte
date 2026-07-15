<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  /** @type {{ slug: string, lat: number, lng: number, date: string, photo: string, notes?: string }[]} */
  export let spots = [];

  let mapContainer;
  let map;
  let markers = [];

  function popupHtml(spot) {
    const notes = spot.notes ? `<p style="margin:0.25rem 0 0;font-size:0.85em;color:var(--text-secondary);">${spot.notes}</p>` : '';
    return `<div style="font-family:inherit;min-width:180px;">
      <img src="${spot.photo}" alt="" style="width:100%;border-radius:4px;margin-bottom:0.5rem;" />
      <div style="font-size:0.75em;color:var(--text-muted);">${spot.date}</div>
      ${notes}
    </div>`;
  }

  function renderMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];

    if (spots.length === 0) return;

    for (const spot of spots) {
      const marker = new maplibregl.Marker({ color: '#628878' })
        .setLngLat([spot.lng, spot.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(popupHtml(spot)))
        .addTo(map);
      markers.push(marker);
    }

    const bounds = spots.reduce(
      (b, s) => b.extend([s.lng, s.lat]),
      new maplibregl.LngLatBounds([spots[0].lng, spots[0].lat], [spots[0].lng, spots[0].lat])
    );
    map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 });
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/positron',
      // 初期表示は日本全体
      center: [138.5, 37.0],
      zoom: 4.5
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => renderMarkers());

    return () => map.remove();
  });
</script>

<div class="explorer">
  <div class="map" bind:this={mapContainer}></div>
</div>

<style>
  .explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .map {
    flex: 1;
    min-height: 480px;
  }

  /* MapLibreが自前でDOMに挿入するUI（ポップアップ・コントロール）は
     Svelteのスコープ外なので:globalで、tokens.cssの変数に合わせる */
  :global(.maplibregl-popup-content) {
    background: var(--bg-panel);
    color: var(--text-primary);
    box-shadow: var(--shadow-md);
  }

  :global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
    border-top-color: var(--bg-panel);
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
