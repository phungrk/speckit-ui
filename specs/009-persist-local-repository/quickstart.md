# Quickstart: Persist Local Repository

## Prerequisites

- Run the speckit-ui app in a supported desktop browser. Persistent directory access requires a secure context; localhost and HTTPS deployments qualify.
- Prepare a synthetic local fixture with at least two spec directories containing supported Spec Kit documents. Do not use private repository content in tests or screenshots.
- Use one browser with File System Access API support to validate persistent handles and one browser/path using the existing directory-input fallback.

## Automated validation

After implementation, run the focused local persistence and local workspace tests, followed by the repository gates:

```sh
npm test
npm run typecheck
npm run build
npm run build:pages
```

The persistence tests should mock IndexedDB, directory handles, and permission states; no test should access the real filesystem or network.

## Manual scenarios

1. **Restore with permission already granted**: Choose the fixture directory, open a spec other than the first one, confirm the URL carries only the `local` mode marker (no directory name or path), reload the page, and verify the app returns directly to local mode with the same repository and spec without opening the folder picker.
2. **Resume when permission needs confirmation**: Save a directory handle, make the browser report that read permission requires a user action, reload, and verify a resume action appears. Activate it and verify the same directory opens without re-selecting it.
3. **Permission denied or folder unavailable**: Deny permission or make the selected folder unavailable, reload, and verify the app explains the issue and offers choose/forget actions without showing stale content.
4. **Choose another directory**: Open fixture A, successfully choose fixture B, reload, and verify only B is restored.
5. **Forget selection**: Forget the saved folder, reload, and verify the app stays in the no-selection state.
6. **Fallback browser**: Open a directory through the existing `webkitdirectory` input, reload, and verify the app asks the user to choose the folder again rather than claiming it restored access.
7. **No content persistence or network transfer**: Change a fixture file between selection and reload and verify the newly read content appears. Confirm the app has not stored file text in its persistence record or sent local paths/content over the network.
8. **Demo and GitHub regression**: Verify demo mode renders as before and GitHub mode selection, credentials, and approvals are unaffected.

9. **Exit local mode**: Use **Exit local mode** and verify the `local` URL marker is removed. Re-enter local mode and confirm the saved repository can still be restored until the user forgets it.
