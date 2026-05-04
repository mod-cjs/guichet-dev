# Guichet Jeunesse — Référence Stack Technique

---

## 1. Laravel 11 — API Backend

### Patterns obligatoires

**Controller slim — logique dans les services :**
```php
class OpportunityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'type'   => ['nullable', Rule::in(['emploi','stage','formation','bourse','volontariat'])],
            'region' => ['nullable', 'string', 'max:100'],
            'q'      => ['nullable', 'string', 'max:100'],
            'page'   => ['nullable', 'integer', 'min:1'],
        ])->validate();

        $opportunities = Opportunity::published()
            ->filter($validated)
            ->paginate(20);

        return response()->json($opportunities);
    }
}
```

**Service SSO :**
```php
class SsoService
{
    public function exchangeCode(string $code, string $verifier): array
    {
        $response = Http::timeout(10)->post(config('sso.token_url'), [
            'grant_type'    => 'authorization_code',
            'client_id'     => config('sso.client_id'),
            'code'          => $code,
            'code_verifier' => $verifier,
            'redirect_uri'  => config('sso.redirect_uri'),
        ]);

        throw_unless($response->successful(), new SsoException('Token exchange failed'));

        return $response->json();
    }

    public function userinfo(string $accessToken): array
    {
        return Http::timeout(5)
            ->withToken($accessToken)
            ->get(config('sso.userinfo_url'))
            ->throw()
            ->json();
    }
}
```

**Handler webhook idempotent :**
```php
class SsoWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        // 1. Vérifier HMAC
        $signature = hash_hmac('sha256',
            $request->getContent(),
            config('sso.webhook_secret')
        );
        abort_unless(hash_equals($signature, $request->header('X-CJS-Signature')), 403);

        // 2. Idempotence
        $eventId = $request->input('event_id');
        if (cache()->has("webhook:{$eventId}")) {
            return response()->json(['ok' => true]);
        }
        cache()->put("webhook:{$eventId}", true, now()->addHours(24));

        // 3. Dispatch
        match($request->input('event')) {
            'user.provisioned' => $this->handleProvisioned($request->all()),
            'user.anonymized'  => $this->handleAnonymized($request->all()),
            default            => null,
        };

        return response()->json(['ok' => true]);
    }
}
```

**Service App Centres avec timeout + fallback :**
```php
class CentresApiService
{
    public function getCentres(): array
    {
        return cache()->remember('centres:list', 300, function () {
            $response = Http::timeout(5)
                ->withHeaders($this->hmacHeaders('GET', '/api/centres'))
                ->get(config('centres.api_url') . '/api/centres');

            throw_unless($response->successful(), new CentresApiException());
            return $response->json();
        });
    }

    private function hmacHeaders(string $method, string $path): array
    {
        $nonce = Str::random(32);
        $timestamp = now()->timestamp;
        $signature = hash_hmac('sha256',
            "{$method}\n{$path}\n{$timestamp}\n{$nonce}",
            config('centres.api_secret')
        );
        return [
            'X-CJS-Api-Key'   => config('centres.api_key'),
            'X-CJS-Timestamp' => $timestamp,
            'X-CJS-Nonce'     => $nonce,
            'X-CJS-Signature' => $signature,
        ];
    }
}
```

### Routes API — structure

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    // Publics (rate limit 60/min)
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/opportunities', [OpportunityController::class, 'index']);
        Route::get('/opportunities/{slug}', [OpportunityController::class, 'show']);
        Route::get('/centres', [CentreController::class, 'index']);
        Route::get('/centres/{id}', [CentreController::class, 'show']);
    });

    // Authentifiés (rate limit 300/min)
    Route::middleware(['auth:session', 'throttle:300,1'])->group(function () {
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/opportunities/{id}/apply', [ApplicationController::class, 'store']);
        Route::post('/reservations', [ReservationController::class, 'store']);
    });

    // Admin uniquement
    Route::middleware(['auth:session', 'role:admin'])->group(function () {
        Route::apiResource('/admin/opportunities', AdminOpportunityController::class);
    });

    // Webhooks (HMAC, pas de session)
    Route::post('/webhooks/sso', [SsoWebhookController::class, 'handle']);
    Route::post('/webhooks/centres', [CentresWebhookController::class, 'handle']);
});
```

---

## 2. Nuxt.js 3 — Frontend SSR

### Structure pages

```
pages/
  index.vue              → Tableau de bord (auth requise)
  auth/
    callback.vue         → Handler OAuth callback (pas de middleware auth)
  onboarding/
    index.vue            → Étape 1 — Identité
    localisation.vue     → Étape 2 — Région
    parcours.vue         → Étape 3 — Compétences
  opportunites/
    index.vue            → Catalogue (public, SSR pour SEO)
    [slug].vue           → Détail (public, SSR pour SEO)
  centres/
    index.vue            → Liste centres (public)
    [id]/
      index.vue          → Détail centre
      reserver.vue       → Formulaire réservation (auth)
  admin/
    index.vue            → Dashboard (rôle admin)
```

### Middleware auth

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated } = useAuth()
    if (!isAuthenticated.value) {
        return navigateTo('/auth/login')
    }
})
```

### Composable auth

```typescript
// composables/useAuth.ts
export const useAuth = () => {
    const user = useState<User | null>('user', () => null)
    const isAuthenticated = computed(() => !!user.value)

    const login = () => {
        const { codeVerifier, codeChallenge } = generatePKCE()
        const state = generateState()

        sessionStorage.setItem('pkce_verifier', codeVerifier)
        sessionStorage.setItem('oauth_state', state)

        navigateTo(buildAuthUrl({ codeChallenge, state }), { external: true })
    }

    return { user, isAuthenticated, login }
}
```

### SEO — pattern obligatoire

```vue
<!-- pages/opportunites/[slug].vue -->
<script setup lang="ts">
const { data: opportunity } = await useFetch(`/api/v1/opportunities/${route.params.slug}`)

useHead({
    title: () => `${opportunity.value?.title} — Guichet Jeunesse CJS`,
    meta: [
        { name: 'description', content: () => opportunity.value?.description?.substring(0, 160) },
        { property: 'og:title', content: () => opportunity.value?.title },
        { property: 'og:image', content: '/og-default.png' },
    ]
})
</script>
```

### Images — obligatoire

```vue
<!-- JAMAIS <img src="..."> -->
<NuxtImg
    src="/avatars/user.jpg"
    format="webp"
    quality="80"
    width="120"
    height="120"
    alt="Avatar utilisateur"
/>
```

---

## 3. Charte Graphique CJS

```css
/* Couleurs principales */
--cjs-vert:  #2E7D32;   /* Couleur principale */
--cjs-or:    #F9A825;   /* Accent */
--cjs-rouge: #C62828;   /* Danger / Sénégal */

/* Police */
font-family: 'Lexend', sans-serif;
```

```javascript
// tailwind.config.js
theme: {
    extend: {
        colors: {
            cjs: {
                vert:  '#2E7D32',
                or:    '#F9A825',
                rouge: '#C62828',
            }
        },
        fontFamily: {
            sans: ['Lexend', 'sans-serif'],
        }
    }
}
```

---

## 4. Calcul completion_score

```php
// app/Services/ProfileCompletionService.php
private array $weights = [
    'date_of_birth'    => 10,
    'gender'           => 10,
    'region'           => 15,
    'diplomes'         => 15,
    'competences'      => 20,
    'domaines_interet' => 20,
    'disponibilite'    => 10,
];

public function calculate(UserProfile $profile): int
{
    $score = 0;
    foreach ($this->weights as $field => $weight) {
        $value = $profile->$field;
        if (!empty($value) && $value !== null) {
            $score += $weight;
        }
    }
    return $score; // 0-100
}
```

---

## 5. Algorithme Recommandation (M12 — MVP)

```php
// app/Services/RecommendationService.php
public function score(UserProfile $profile, Opportunity $opportunity): int
{
    $score = 0;

    // +30 si domaine d'intérêt correspond
    if (in_array($opportunity->domaine, $profile->domaines_interet ?? [])) {
        $score += 30;
    }

    // +25 si région correspond (ou opportunité nationale)
    if ($opportunity->region === null || $opportunity->region === $profile->region) {
        $score += 25;
    }

    // +20 si intersection compétences
    $intersection = array_intersect(
        $profile->competences ?? [],
        $opportunity->requirements ?? []
    );
    if (!empty($intersection)) {
        $score += 20;
    }

    // +15 si type correspond à l'historique
    if ($this->matchesPreference($profile->cjs_uid, $opportunity->type)) {
        $score += 15;
    }

    // +10 si deadline > aujourd'hui + 7 jours
    if ($opportunity->deadline > now()->addDays(7)) {
        $score += 10;
    }

    return $score;
}
```

---

## 6. Contraintes Mobile-First (3G Sénégal)

| Contrainte | Règle |
|-----------|-------|
| Payload JSON | Max 50KB par réponse |
| Pagination | 20 items/page max |
| Images | WebP, max 200KB, lazy loading |
| Bundle Nuxt | Max 200KB gzipped (premier chargement) |
| Cache Redis | TTL 5min sur données centres, 1h sur contenu statique |
| Polices | Subset latin uniquement, `font-display: swap` |
| Requêtes | Éviter les N+1, eager loading systématique |
