# Security Specification: GogoCurrency & Flow Monitor

## Data Invariants
1. A user profile document `/user_profiles/{userId}` can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid == userId`.
2. A user settings document `/user_settings/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`.
3. Subcollection `/users/{userId}/journal/{entryId}` can only be read, created, updated, or deleted by the user where `request.auth.uid == userId`.
4. Subcollection `/users/{userId}/alerts/{alertId}` can only be read, created, updated, or deleted by the user where `request.auth.uid == userId`.
5. All mutations must validate types, lengths, and required fields. Unauthenticated or foreign users cannot read or write data.

## Dirty Dozen Payloads (Designed to Fail)
1. Write to `/user_profiles/{victimId}` from `attackerUid` -> PERMISSION_DENIED
2. Blanket list queries without `userId` scoping -> PERMISSION_DENIED
3. Writing a user profile with `displayName` > 100 characters -> PERMISSION_DENIED
4. Creating a journal entry with missing `userId` or `userId != request.auth.uid` -> PERMISSION_DENIED
5. Writing to `/users/{victimId}/journal/{entryId}` from `attackerUid` -> PERMISSION_DENIED
6. Spoofing user settings for another user -> PERMISSION_DENIED
7. Unauthenticated read of any user settings or profile -> PERMISSION_DENIED
8. Creating a streak alert with negative or non-integer `streakCount` -> PERMISSION_DENIED
9. Injecting oversized payload (> 1000 chars) into journal `notes` -> PERMISSION_DENIED
10. Creating invalid path document IDs with special symbols / path poisoning -> PERMISSION_DENIED
11. Modifying another user's alert logs -> PERMISSION_DENIED
12. Attempting to bypass rules with ghost fields -> PERMISSION_DENIED
