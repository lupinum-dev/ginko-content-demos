<template>
  <nav data-testid="navigation" aria-label="Pages">
    <NuxtLink to="/" data-testid="home-link">Home</NuxtLink>
    {{ ' ' }}
    <NuxtLink to="/guide" data-testid="guide-link">Guide</NuxtLink>
  </nav>
  <div data-testid="content-page"><NuxtPage /></div>
</template>
