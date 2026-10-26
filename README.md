# InsureFlow Angular Frontend

Angular standalone frontend for the provided `insurance-auth-service` Spring Boot backend.

## Requirements
- Node.js 20.11+ (Node 22 LTS recommended)
- npm
- Backend running at `http://localhost:8082`

## Run
1. Extract this folder.
2. Open a terminal in `insurance-auth-frontend`.
3. Install packages:
   ```bash
   npm install
   ```
4. Start Angular with the included development proxy:
   ```bash
   npm start
   ```
5. Open `http://localhost:4200`.

The proxy forwards `/api`, `/oauth2`, and `/login/oauth2` requests to `http://localhost:8082`, so the Angular dev server does not need a separate CORS configuration for these local development requests.

## Included screens
- Login with username/email and password
- Customer registration with send OTP, verify OTP, and register
- GitHub OAuth start link
- Authenticated overview with refresh token and logout
- Admin user list, create-agent form, and update user status/role
- Audit log viewer

## Notes
- This frontend calls the endpoint paths found in the provided backend controllers.
- Admin APIs require the correct backend role. The frontend hides admin navigation for non-admin roles, but the backend remains the actual security boundary.
- OAuth success-handler behavior depends on the backend returning a response/redirect compatible with browser navigation. Test the GitHub flow separately.
- The current backend exposes no forgot/reset password endpoint in `AuthController`, so those screens are not included.
- API error messages are shown in the UI where the backend provides them.
- Tokens are stored in `sessionStorage` for this demo. For production, review token storage and XSS protections with your security requirements.
