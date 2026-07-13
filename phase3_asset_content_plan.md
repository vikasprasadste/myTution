# Phase 3: Asset & Content Management

## Goal

Make education content reusable, ownership-aware, and access-controlled while keeping MVP storage repo-backed.

## Phase 3 Slice 1: Resource Asset Metadata and Entitlement

Status: Implemented locally, not yet committed.

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

## Next Phase 3 Slices

1. Private file URL mediation instead of direct static paths.
2. Tutor upload/create APIs for article, video metadata, thumbnail, banner, VTT, flashcard JSON, and quiz JSON.
3. Storage adapter interface for repo now and S3/R2 later.
4. Content versioning before program publish.
5. Content reaction analytics scoped to entitled students.
