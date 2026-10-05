<script setup lang="ts">const route = useRoute()</script><template><h1>Pricing</h1><p data-testid="plan">{{ route.params.plan }}</p><p data-testid="ref">{{ route.query.ref }}</p></template>
