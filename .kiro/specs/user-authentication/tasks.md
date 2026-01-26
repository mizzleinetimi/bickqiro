# Implementation Plan: User Authentication

## Overview

This plan implements email OTP authentication for Bickqr using Supabase Auth. The implementation follows a progressive approach: first setting up the auth infrastructure, then building the UI components, and finally integrating with existing features (upload, navigation).

## Tasks

- [x] 1. Set up auth infrastructure
  - [x] 1.1 Create middleware for session refresh and route protection
    - Create `middleware.ts` at project root
    - Implement session token refresh using Supabase SSR
    - Define protected routes array (`/upload`, `/my-bicks`)
    - Redirect unauthenticated users with `next` parameter preservation
    - _Requirements: 4.2, 5.1, 5.2, 5.3_

  - [x] 1.2 Create auth service functions
    - Create `src/lib/auth/actions.ts`
    - Implement `sendOTP(email)` using `signInWithOtp`
    - Implement `verifyOTP(email, code)` using `verifyOtp`
    - Implement `signOut()` to clear session
    - Implement `getUser()` to get current user server-side
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1_

  - [x] 1.3 Create profile service for auto-creation
    - Create `src/lib/auth/profile.ts`
    - Implement `generateUsername(email)` to extract email prefix
    - Implement `ensureUniqueUsername(base)` to handle duplicates
    - Implement `createProfile(userId, email)` for new users
    - Implement `getOrCreateProfile(userId, email)` for on-demand creation
    - _Requirements: 1.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 1.4 Write property tests for username generation
    - **Property 3: New User Profile Creation**
    - **Property 12: Username Uniqueness**
    - **Validates: Requirements 10.2, 10.3**

- [x] 2. Create auth callback route
  - [x] 2.1 Implement callback route handler
    - Create `src/app/auth/callback/route.ts`
    - Extract `token_hash`, `type`, and `next` from query params
    - Exchange token for session using `verifyOtp`
    - Redirect to `next` URL on success
    - Redirect to sign-in with error on failure
    - _Requirements: 2.2, 2.3, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.2 Write property tests for callback handling
    - **Property 4: Valid Callback Exchanges Code for Session**
    - **Property 5: Invalid Callback Redirects with Error**
    - **Validates: Requirements 2.2, 2.3, 9.2, 9.3**

- [x] 3. Checkpoint - Ensure auth infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build auth UI components
  - [x] 4.1 Create SignInForm component
    - Create `src/components/auth/SignInForm.tsx`
    - Email input with validation
    - Loading state during OTP send
    - Success state showing "check your email"
    - Error display with retry option
    - Handle `redirectTo` prop for post-login redirect
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 4.2 Create OTPVerifyForm component
    - Create `src/components/auth/OTPVerifyForm.tsx`
    - 6-digit code input
    - Auto-submit on complete entry
    - Loading state during verification
    - Error display with retry
    - Resend code option
    - _Requirements: 1.2, 1.3_

  - [x] 4.3 Create sign-in page
    - Create `src/app/auth/sign-in/page.tsx`
    - Two-step flow: email entry → OTP verification
    - Extract `next` param from URL for redirect
    - Handle error messages from callback failures
    - _Requirements: 1.1, 1.2, 2.3_

  - [x] 4.4 Write unit tests for auth components
    - Test SignInForm states (initial, loading, sent, error)
    - Test OTPVerifyForm states (initial, loading, error)
    - Test error message display
    - _Requirements: 1.3_

- [x] 5. Build UserMenu and update navigation
  - [x] 5.1 Create UserMenu component
    - Create `src/components/auth/UserMenu.tsx`
    - Display user email or display name
    - Dropdown with "My Bicks" and "Sign Out" options
    - Handle sign-out action
    - _Requirements: 6.2, 6.3_

  - [x] 5.2 Update NavShell with auth state
    - Modify `src/components/layout/NavShell.tsx`
    - Fetch user session server-side
    - Show "Sign In" link when unauthenticated
    - Show UserMenu when authenticated
    - _Requirements: 6.1, 6.2_

  - [x] 5.3 Create auth components barrel export
    - Create `src/components/auth/index.ts`
    - Export SignInForm, OTPVerifyForm, UserMenu
    - _Requirements: N/A (code organization)_

- [x] 6. Checkpoint - Ensure auth UI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build My Bicks dashboard
  - [x] 7.1 Create My Bicks page
    - Create `src/app/my-bicks/page.tsx`
    - Protect route with auth check
    - Fetch user's bicks (all statuses)
    - Display bick list with title, status, duration, date
    - Show empty state when no bicks
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Create getUserBicks query function
    - Add to `src/lib/supabase/queries.ts`
    - Query bicks where owner_id matches user
    - Include all statuses (no status filter)
    - Implement cursor-based pagination
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 7.3 Write property tests for My Bicks query
    - **Property 10: My Bicks Query Isolation**
    - **Validates: Requirements 7.1, 7.2**

- [x] 8. Integrate auth with upload flow
  - [x] 8.1 Protect upload page
    - Modify `src/app/upload/page.tsx`
    - Add auth check at page level
    - Redirect to sign-in if unauthenticated
    - _Requirements: 5.1, 8.2_

  - [x] 8.2 Update upload session API to set owner_id
    - Modify `src/app/api/bicks/upload-session/route.ts`
    - Get authenticated user from session
    - Set owner_id on bick creation
    - _Requirements: 8.1_

  - [x] 8.3 Write property tests for upload owner association
    - **Property 11: Upload Owner Association**
    - **Validates: Requirements 8.1**

- [x] 9. Update bick page with owner attribution
  - [x] 9.1 Display owner on bick page
    - Modify `src/app/bick/[slugId]/page.tsx`
    - Fetch owner profile with bick data
    - Display owner username/display_name
    - _Requirements: 8.3_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript strict mode as per project standards
- All components use Tailwind CSS for styling
