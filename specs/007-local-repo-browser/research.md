# Research: Local Repository Mode

## Decision: Read an explicitly selected directory in the browser

**Rationale**: The user chose a folder-selection dialog rather than entering a path. A directory
input gives the browser access only to files the user selected and allows the same local viewer
to work in development and static builds without a server filesystem endpoint.

**Alternatives considered**:
- A server endpoint accepting an arbitrary path: rejected because it would expose the server's
  filesystem to HTTP callers and would send local paths to the server.
- A typed path field: rejected because browser pages cannot read arbitrary local paths from text.
- Persisting a filesystem handle: rejected because this feature needs only the current session,
  and persisting access complicates revocation and lifetime.

## Decision: Keep the selected file snapshot in memory

**Rationale**: The browser-provided files can be read with their existing `File` objects and
discarded when the user leaves or selects another repository. This avoids copying private
repository content into browser storage or an application cache.

**Alternatives considered**:
- `localStorage` or IndexedDB: rejected because the selected documents can contain private
  project information and do not need to survive reload.
- Uploading files to the server for parsing: rejected because local contents must not be sent
  over the network.

## Decision: Reuse the existing pure Spec Kit parsing and project model

**Rationale**: GitHub mode already parses the supported Spec Kit files into `Project` and
`SpecFeature`. Reusing the same transformations keeps phase status, titles, and task data
consistent without inventing another parser.

**Alternatives considered**:
- A separate local-only parser: rejected because it would produce inconsistent document and task
  semantics.
- Have local mode call GitHub APIs: rejected because local mode must work without credentials and
  must not transmit local content or paths.

## Decision: Keep local mode read-only and disable network-backed actions

**Rationale**: Gate decisions are stored in GitHub issues, and Copilot may transmit context to an
AI service. Neither action belongs in a mode whose local repository data must remain local.
Navigation and copyable Spec Kit commands remain useful without the app writing files.

**Alternatives considered**:
- Local gate persistence: rejected because it creates a second source of truth.
- Sending local context to configured Copilot: rejected by the local privacy requirement.

## Decision: Treat unsupported folder-selection browsers as a recoverable limitation

**Rationale**: Do not introduce a filesystem library or server fallback solely for a browser that
cannot select directories. Explain the limitation and leave demo/GitHub routes available.

**Alternatives considered**:
- Server-side path entry fallback: rejected because it violates the local-content boundary.
