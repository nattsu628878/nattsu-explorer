<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  /** @type {{ slug: string, city: string, name: string, lat: number, lng: number, date: string, photos: string[], notes?: string }[]} */
  export let spots = [];

  const cities = [...new Set(spots.map((s) => s.city))];
  let selectedCity = cities[0] ?? '';

  let mapContainer;
  let map;
  let markers = [];

  function popupHtml(spot) {
    const photo = spot.photos[0]
      ? `<img src="${spot.photos[0]}" alt="${spot.name}" style="width:100%;border-radius:4px;margin-bottom:0.5rem;" />`
      : '';
    const notes = spot.notes ? `<p style="margin:0.25rem 0 0;font-size:0.85em;color:var(--text-secondary);">${spot.notes}</p>` : '';
    return `<div style="font-family:inherit;min-width:180px;">
      <strong>${spot.name}</strong>
      <div style="font-size:0.75em;color:var(--text-muted);">${spot.date}</div>
      ${photo}
      ${notes}
    </div>`;
  }

  function renderMarkers(city) {
    markers.forEach((m) => m.remove());
    markers = [];

    const inCity = spots.filter((s) => s.city === city);
    if (inCity.length === 0) return;

    for (const spot of inCity) {
      const marker = new maplibregl.Marker({ color: '#628878' })
        .setLngLat([spot.lng, spot.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(popupHtml(spot)))
        .addTo(map);
      markers.push(marker);
    }

    const bounds = inCity.reduce(
      (b, s) => b.extend([s.lng, s.lat]),
      new maplibregl.LngLatBounds([inCity[0].lng, inCity[0].lat], [inCity[0].lng, inCity[0].lat])
    );
    map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [139.75, 35.68],
      zoom: 10
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => renderMarkers(selectedCity));

    return () => map.remove();
  });

  function selectCity(city) {
    selectedCity = city;
    if (map && map.loaded()) renderMarkers(city);
  }
</script>

<div class="explorer">
  {#if cities.length > 1}
    <div class="city-selector">
      {#each cities as city}
        <button
          class="city-button"
          class:active={city === selectedCity}
          on:click={() => selectCity(city)}
        >
          {city}
        </button>
      {/each}
    </div>
  {/if}
  <div class="map" bind:this={mapContainer}></div>
</div>

<style>
  .explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .city-selector {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .city-button {
    background: var(--bg-panel);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    cursor: pointer;
    text-transform: capitalize;
  }

  .city-button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .city-button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .map {
    flex: 1;
    min-height: 480px;
  }
</style>
