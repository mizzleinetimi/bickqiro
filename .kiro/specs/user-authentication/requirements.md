# Requirements Document

## Introduction

This document defines the requirements for implementing user authentication in Bickqr using email OTP (magic link/code) sign-in only. The feature enables users to sign up and sign in using a one-time code sent to their email address, without requiring passwords. Authenticated users can upload bicks linked to their profile, view their uploaded content in a "My Bicks" dashboard, and have a personalized experience with proper session management across server and client components.

## Glossary

- **Auth_System**: The Supabase Auth service integrated with Next.js SSR helpers for session management
- **OTP**: One-Time Password - a temporary code sent via email for authentication
- **Magic_Link**: An email containing a link that automatically signs the user in when clicked
- **Profile**: A user record in the `profiles` table linked to `auth.users`
- **Session**: An authenticated user's session managed via Supabase SSR cookies
- **Protected_Route**: A page or API route that requires authentication to access
- **Auth_State**: The current authentication status (authenticated or unauthenticated)
- **User_Menu**: A dropdown component showing authenticated user options
- **My_Bicks_Dashboard**: A page showing all bicks uploaded by the authenticated user
- **Bick**: A short audio clip uploaded to the platform

## Requirements

### Requirement 1: Email OTP Sign In

**User Story:** As a user, I want to sign in using a code sent to my email, so that I can access my account without remembering a password.

#### Acceptance Criteria

1. WHEN a user enters their email address and submits the sign-in form, THE Auth_System SHALL send a one-time code to that email address
2. WHEN a user enters a valid OTP code within the expiration window, THE Auth_System SHALL authenticate the user and establish a Session
3. WHEN a user enters an invalid or expired OTP code, THE Auth_System SHALL display an error message and allow retry
4. WHEN a user requests a new code before the previous one expires, THE Auth_System SHALL invalidate the previous code and send a new one
5. IF the email address does not exist in the system, THEN THE Auth_System SHALL create a new user account and send the OTP code
6. WHEN a new user account is created via OTP sign-in, THE Auth_System SHALL automatically create a corresponding Profile record with a generated username

### Requirement 2: Magic Link Alternative

**User Story:** As a user, I want the option to sign in via a magic link in my email, so that I can authenticate with a single click.

#### Acceptance Criteria

1. WHEN a user requests sign-in, THE Auth_System SHALL include a magic link in the OTP email
2. WHEN a user clicks a valid magic link, THE Auth_System SHALL authenticate the user and redirect to the application
3. WHEN a user clicks an expired or invalid magic link, THE Auth_System SHALL redirect to the sign-in page with an error message
4. THE Auth_System SHALL configure magic links to expire after 1 hour

### Requirement 3: User Sign Out

**User Story:** As an authenticated user, I want to sign out of my account, so that I can secure my session on shared devices.

#### Acceptance Criteria

1. WHEN an authenticated user clicks sign out, THE Auth_System SHALL invalidate the current Session
2. WHEN a Session is invalidated, THE Auth_System SHALL clear all authentication cookies
3. WHEN sign out completes, THE Auth_System SHALL redirect the user to the homepage

### Requirement 4: Session Management

**User Story:** As a user, I want my session to persist across page loads and be refreshed automatically, so that I don't have to sign in repeatedly.

#### Acceptance Criteria

1. WHILE a valid Session exists, THE Auth_System SHALL maintain authentication state across page navigations
2. WHEN a Session token is near expiration, THE Auth_System SHALL automatically refresh the token via middleware
3. WHEN a Session token cannot be refreshed, THE Auth_System SHALL clear the invalid session and treat the user as unauthenticated
4. THE Auth_System SHALL use Supabase SSR helpers for cookie-based session management in Server Components

### Requirement 5: Protected Routes

**User Story:** As a platform operator, I want certain routes to require authentication, so that only registered users can upload content.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the upload page, THE Auth_System SHALL redirect to the sign-in page
2. WHEN an unauthenticated user attempts to access the My_Bicks_Dashboard, THE Auth_System SHALL redirect to the sign-in page
3. WHEN a redirect to sign-in occurs, THE Auth_System SHALL preserve the original destination URL for post-login redirect
4. WHEN an authenticated user accesses a Protected_Route, THE Auth_System SHALL allow access without redirect

### Requirement 6: Navigation Auth State

**User Story:** As a user, I want the navigation to reflect my authentication status, so that I can easily access login or my account.

#### Acceptance Criteria

1. WHILE a user is unauthenticated, THE Navigation SHALL display a "Sign In" link
2. WHILE a user is authenticated, THE Navigation SHALL display a User_Menu with the user's email or display name
3. WHEN a user clicks the User_Menu, THE Navigation SHALL show options for "My Bicks" and "Sign Out"
4. WHEN Auth_State changes, THE Navigation SHALL update immediately without requiring a page refresh

### Requirement 7: My Bicks Dashboard

**User Story:** As an authenticated user, I want to view a dashboard showing my uploaded bicks, so that I can manage my content.

#### Acceptance Criteria

1. WHEN an authenticated user visits the My_Bicks_Dashboard, THE Dashboard SHALL display a list of their uploaded bicks
2. WHEN displaying user bicks, THE Dashboard SHALL show bicks in all statuses (processing, live, failed, removed)
3. WHEN displaying each bick, THE Dashboard SHALL show the title, status, duration, and creation date
4. WHEN a user has no uploaded bicks, THE Dashboard SHALL display an empty state with a prompt to upload
5. THE Dashboard SHALL use cursor-based pagination for the bick list

### Requirement 8: Link Bicks to Authenticated User

**User Story:** As an authenticated user, I want my uploaded bicks to be linked to my account, so that I can manage them later.

#### Acceptance Criteria

1. WHEN an authenticated user uploads a bick, THE Upload_System SHALL set the bick's owner_id to the user's profile ID
2. WHEN an unauthenticated user attempts to access the upload page, THE Upload_System SHALL redirect to sign-in
3. WHEN a bick is linked to a user, THE Bick_Page SHALL display the owner's display name or username with attribution

### Requirement 9: Auth Callback Route

**User Story:** As a developer, I want a secure callback route for authentication, so that magic links and OTP verification work correctly.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a callback route at `/auth/callback` to handle magic link redirects
2. WHEN the callback route receives a valid auth code, THE Auth_System SHALL exchange it for a session and redirect to the intended destination
3. IF the callback route receives an invalid or expired code, THEN THE Auth_System SHALL redirect to sign-in with an error message
4. THE Auth_System SHALL handle the `next` query parameter to redirect users to their original destination after authentication

### Requirement 10: Profile Auto-Creation

**User Story:** As a new user signing in for the first time, I want my profile to be created automatically, so that I can start using the platform immediately.

#### Acceptance Criteria

1. WHEN a new user authenticates for the first time, THE Auth_System SHALL create a Profile record linked to their auth.users ID
2. WHEN creating a new Profile, THE Auth_System SHALL generate a unique username based on the email prefix
3. IF the generated username already exists, THEN THE Auth_System SHALL append a random suffix to ensure uniqueness
4. WHEN a Profile is created, THE Auth_System SHALL set the display_name to the email prefix initially
