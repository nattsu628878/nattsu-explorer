<script>
  import { onMount } from 'svelte';

  let dark = false;

  onMount(() => {
    const current = document.documentElement.getAttribute('data-theme');
    dark = current ? current === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  function toggle() {
    dark = !dark;
    const theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
</script>

<button class="theme-toggle" on:click={toggle} aria-label="ライト/ダーク切り替え" title="ライト/ダーク切り替え">
  {dark ? '🌙' : '☀️'}
</button>

<style>
  .theme-toggle {
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    width: 2rem;
    height: 2rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
  }

  .theme-toggle:hover {
    border-color: var(--accent);
  }
</style>
