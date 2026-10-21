# Local Repository Persistence Contract

This is a browser UI and privacy contract. The feature adds no HTTP endpoint or remote storage interface.

## Choose a directory

- In browsers with the File System Access API, offer explicit directory selection with read-only access.
- Save the selected handle for the current app origin and browser profile after the directory is validated and opened successfully.
- In browsers without persistent directory-handle support, use the current directory input and explain that the folder must be selected again after a reload.
- Choosing a new directory replaces the prior saved choice only after the new selection opens successfully.

## Restore after startup or reload

- If no saved selection exists, show the existing choose-folder state.
- If a saved handle has read permission, read the current supported files and restore the last selected spec and view when they remain available.
- If permission requires user activation, show a **Resume local repository** action. Do not display stale repository content as current and do not open a permission prompt automatically on page load.
- If permission is denied or the handle/directory cannot be read, explain the recovery path and offer **Choose another folder** and **Forget saved folder**.
- If the previously selected spec or document no longer exists, open the repository using its normal first available document and show no stale path as selected.

## Forget selection

- Provide a user-accessible action that removes the saved directory handle and saved view location.
- After forgetting, reload must show the no-selection state and must not reopen the forgotten repository.
- Forgetting does not modify any files in the user's directory.

## Privacy and access

- Store only the browser-native directory handle and minimal view preference required for restoration.
- Keep file contents and parsed project state in memory for the current page session; do not copy them into persistent browser storage.
- Request read permission only. Do not write or modify selected files.
- Never transmit the directory handle, local path, file contents, or permission state to the server or another network service.
- GitHub credentials and other secrets are not part of this record.

## Concurrency

- If a user selects another repository while an earlier read is pending, discard late results from the earlier selection.
- A restored repository read must not overwrite a newer user selection.
