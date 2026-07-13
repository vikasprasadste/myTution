# Phase 3: Asset & Content Management

## Goal

Make education content reusable, ownership-aware, and access-controlled while keeping MVP storage repo-backed.

## Phase 3 Slice 1: Resource Asset Metadata and Entitlement

Status: Pushed to `main`.

This slice adds the first platform boundary around learning content:

- Resource asset provider metadata
- Resource access level metadata
- Resource asset version metadata
- Repo-backed asset metadata response
- Entitlement checks for resource detail APIs
- Entitlement checks for quiz payload APIs
- Parent read-only metadata on entitled child content

## DB Migration

New migration:

- `202607130003_add_resource_asset_access`

Adds:

- `Resource.assetProvider`
- `Resource.accessLevel`
- `Resource.assetVersion`

Defaults:

- `assetProvider = repo`
- `accessLevel = program`
- `assetVersion = v1`

## API Behavior

### Resource Detail

```http
GET /api/v1/resources/:id?role=student
Authorization: Bearer <accessToken>
```

Access is allowed when:

- resource is public
- tutor owns the resource or its program
- student has selected the program containing the resource
- parent is linked to a student who has selected the program

Denied requests return `403`.

### AMS Asset Metadata

```http
GET /api/v1/ams/assets/:id?role=student
Authorization: Bearer <accessToken>
```

Returns the resource plus:

- `assetUrls`
- `assetMetadata.provider`
- `assetMetadata.accessLevel`
- `assetMetadata.version`
- `assetMetadata.storageType`
- `assetMetadata.entitled`
- `assetMetadata.readonly`

## Phase 3 Slice 2: Private Repo-Backed Asset URLs

Status: Implemented locally, not yet committed.

This slice keeps repo-backed storage for MVP, but routes authenticated asset access through AMS instead of exposing raw repo/static paths from resource detail APIs.

### Private Asset File

```http
GET /api/v1/ams/assets/:id/file/:kind?role=student&accessToken=<accessToken>
```

Supported `kind` values:

- `thumbnail`
- `banner`
- `vtt`
- `metadata`

Behavior:

- Looks up the resource by `id`
- Applies the same entitlement rules as resource detail
- Resolves the requested repo-backed file safely under `services/api/assets`
- Streams the file with `sendFile`

The legacy static route remains available for default/mock cards:

```http
GET /api/v1/ams/files/:path
```

Authenticated resource detail responses now return private AMS URLs for `assetUrls.thumbnail`, `assetUrls.banner`, `assetUrls.vtt`, and `assetUrls.metadata`.

### Quiz Payload

```http
GET /api/v1/resources/:id/quiz?role=student
Authorization: Bearer <accessToken>
```

Quiz content now uses the same entitlement check as resource detail.

## Test Checklist

1. Run the Neon migration.
2. Deploy API to Render.
3. Login as a student with a selected program and open video/article/flashcard/quiz content.
4. Login as a parent linked to that student and confirm the same child content opens read-only.
5. Login as a tutor and confirm own draft/published program content opens.
6. Try opening a resource outside the selected program and confirm the API returns `403`.
7. Open a resource detail response and confirm `assetUrls.banner` uses `/api/v1/ams/assets/:id/file/banner`.
8. Paste that private URL without a valid `accessToken` and confirm it is rejected.
9. Paste it with a valid access token and confirm the file loads.

## Next Phase 3 Slices

1. Tutor upload/create APIs for article, video metadata, thumbnail, banner, VTT, flashcard JSON, and quiz JSON.
2. Storage adapter interface for repo now and S3/R2 later.
3. Content versioning before program publish.
4. Content reaction analytics scoped to entitled students.
