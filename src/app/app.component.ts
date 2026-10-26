
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  role: string;
}

interface UserRecord {
  userId: number;
  username: string;
  email: string;
  mobile: string;
  status: string;
  roleName: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent {

  mode: 'login' | 'register' = 'login';

  section:
    | 'overview'
    | 'users'
    | 'create-agent'
    | 'create-customer'
    | 'audit' = 'overview';

  busy = false;
  message = '';
  error = '';

  currentUser = '';
  currentRole = '';
  accessToken = '';
  refreshToken = '';

  users: UserRecord[] = [];
  auditLogs: Record<string, unknown>[] = [];
  selectedUser: UserRecord | null = null;

  loginForm = {
    usernameOrEmail: '',
    password: ''
  };

  registerForm = {
    username: '',
    email: '',
    password: '',
    mobile: ''
  };

  otpEmail = '';
  otp = '';
  otpSent = false;
  otpVerified = false;

  // Agent-created customer activation
  customerSetupMode = false;
  setupEmail = '';
  setupOtp = '';
  activationToken = '';

  customerForm = {
    username: '',
    email: '',
    mobile: ''
  };

  setPasswordForm = {
    password: '',
    confirmPassword: ''
  };

  agentForm = {
    username: '',
    password: '',
    email: '',
    mobile: ''
  };

  editForm = {
    status: 'Active',
    roleName: 'CUSTOMER'
  };

  constructor(private http: HttpClient) {
    this.accessToken = sessionStorage.getItem('accessToken') ?? '';
    this.refreshToken = sessionStorage.getItem('refreshToken') ?? '';
    this.currentUser = sessionStorage.getItem('username') ?? '';
    this.currentRole = sessionStorage.getItem('role') ?? '';
  }

  get loggedIn(): boolean {
    return !!this.accessToken;
  }

  get isAdmin(): boolean {
    return this.currentRole.toUpperCase().includes('ADMIN');
  }

  get isAgent(): boolean {
    return this.currentRole.toUpperCase().includes('AGENT');
  }

  setMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.clearNotice();
  }

  clearNotice(): void {
    this.message = '';
    this.error = '';
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`
    });
  }

  private fail(err: HttpErrorResponse): void {
    const body = err.error;

    this.error =
      (body && (body.message || body.error)) ||
      (typeof body === 'string' ? body : '') ||
      `Request failed (${err.status || 'network error'}). Check that the backend is running on port 8082.`;

    this.busy = false;
  }

  login(): void {
    this.clearNotice();
    this.busy = true;

    this.http.post<AuthResponse>('/api/auth/login',
      this.loginForm
    ).subscribe({
      next: r => {
        this.storeAuth(r);
        this.message = 'Welcome back! You are signed in.';
        this.busy = false;
        this.section = 'overview';
      },
      error: e => this.fail(e)
    });
  }

  sendOtp(): void {
    this.clearNotice();
    this.busy = true;

    this.http.post<{ message: string }>(
      '/api/auth/send-otp',
      { email: this.registerForm.email }
    ).subscribe({
      next: r => {
        this.otpEmail = this.registerForm.email;
        this.otpSent = true;
        this.message = r.message || 'OTP sent. Check your email.';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  verifyOtp(): void {
    this.clearNotice();
    this.busy = true;

    this.http.post<{ message: string }>(
      '/api/auth/verify-otp',
      {
        email: this.otpEmail,
        otp: this.otp
      }
    ).subscribe({
      next: r => {
        this.otpVerified = true;
        this.message = r.message || 'Email verified.';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  register(): void {
    this.clearNotice();

    if (
      !this.otpVerified ||
      this.otpEmail.toLowerCase() !==
        this.registerForm.email.toLowerCase()
    ) {
      this.error =
        'Verify this email address with OTP before registering.';
      return;
    }

    this.busy = true;

    this.http.post(
      '/api/auth/register',
      this.registerForm
    ).subscribe({
      next: () => {
        this.message =
          'Registration successful. You can now log in.';

        this.mode = 'login';
        this.loginForm.usernameOrEmail =
          this.registerForm.username;

        this.busy = false;

        this.registerForm = {
          username: '',
          email: '',
          password: '',
          mobile: ''
        };

        this.otp = '';
        this.otpSent = false;
        this.otpVerified = false;
      },
      error: e => this.fail(e)
    });
  }

  storeAuth(r: AuthResponse): void {
    this.accessToken = r.accessToken;
    this.refreshToken = r.refreshToken;
    this.currentUser = r.username;
    this.currentRole = r.role;

    sessionStorage.setItem('accessToken', r.accessToken);
    sessionStorage.setItem('refreshToken', r.refreshToken);
    sessionStorage.setItem('username', r.username);
    sessionStorage.setItem('role', r.role);
  }

  refresh(): void {
    this.clearNotice();

    if (!this.refreshToken) {
      this.error =
        'No refresh token is available. Please log in again.';
      return;
    }

    this.busy = true;

    this.http.post<AuthResponse>(
      '/api/auth/refresh',
      { refreshToken: this.refreshToken }
    ).subscribe({
      next: r => {
        this.storeAuth(r);
        this.message = 'Session refreshed successfully.';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  logout(): void {
    this.clearNotice();
    this.busy = true;

    this.http.post(
      '/api/auth/logout',
      { refreshToken: this.refreshToken }
    ).subscribe({
      next: () => this.finishLogout('You have been logged out.'),
      error: () => this.finishLogout(
        'Signed out locally. The server could not confirm token revocation.'
      )
    });
  }

  private finishLogout(msg: string): void {
    sessionStorage.clear();

    this.accessToken = '';
    this.refreshToken = '';
    this.currentUser = '';
    this.currentRole = '';
    this.users = [];
    this.auditLogs = [];
    this.message = msg;
    this.busy = false;
    this.mode = 'login';
    this.section = 'overview';
  }

  githubLogin(): void {
    window.location.href = '/oauth2/authorization/github';
  }

  loadUsers(): void {
    this.clearNotice();
    this.busy = true;

    this.http.get<UserRecord[]>(
      '/api/admin/users',
      { headers: this.headers() }
    ).subscribe({
      next: r => {
        this.users = r;
        this.busy = false;
        this.section = 'users';
      },
      error: e => this.fail(e)
    });
  }

  createAgent(): void {
    this.clearNotice();
    this.busy = true;

    this.http.post<UserRecord>(
      '/api/admin/users/agents',
      this.agentForm,
      { headers: this.headers() }
    ).subscribe({
      next: r => {
        this.message = `Agent account created for ${r.username}.`;

        this.agentForm = {
          username: '',
          password: '',
          email: '',
          mobile: ''
        };

        this.busy = false;
        this.loadUsers();
      },
      error: e => this.fail(e)
    });
  }

  // Agent creates a customer without setting a password.
  createCustomer(): void {
    this.clearNotice();

    if (!this.isAgent) {
      this.error = 'Only an authenticated agent can create customers.';
      return;
    }

    this.busy = true;

    this.http.post<{ message: string }>(
      '/api/agent/customers',
      this.customerForm,
      { headers: this.headers() }
    ).subscribe({
      next: r => {
        this.message =
          r.message || 'Customer created. The customer can now verify their email.';

        this.customerForm = {
          username: '',
          email: '',
          mobile: ''
        };

        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  // Customer opens the activation form.
  openCustomerSetup(): void {
    this.customerSetupMode = true;
    this.setupEmail = '';
    this.setupOtp = '';
    this.activationToken = '';

    this.setPasswordForm = {
      password: '',
      confirmPassword: ''
    };

    this.clearNotice();
  }

  sendCustomerSetupOtp(): void {
    this.clearNotice();

    if (!this.setupEmail.trim()) {
      this.error = 'Enter your registered email address.';
      return;
    }

    this.busy = true;

    this.http.post<{ message: string }>(
      '/api/auth/customer-setup/send-otp',
      { email: this.setupEmail.trim() }
    ).subscribe({
      next: r => {
        this.message =
          r.message || 'OTP sent to your registered email.';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  verifyCustomerSetupOtp(): void {
    this.clearNotice();

    if (!/^\d{6}$/.test(this.setupOtp)) {
      this.error = 'Enter the six-digit OTP.';
      return;
    }

    this.busy = true;

    this.http.post<{
      message: string;
      activationToken: string;
    }>(
      '/api/auth/customer-setup/verify-otp',
      {
        email: this.setupEmail.trim(),
        otp: this.setupOtp
      }
    ).subscribe({
      next: r => {
        this.activationToken = r.activationToken;
        this.message =
          r.message || 'Email verified. You can now set your password.';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  setCustomerPassword(): void {
    this.clearNotice();

    if (!this.activationToken) {
      this.error = 'Verify your email OTP first.';
      return;
    }

    if (
      this.setPasswordForm.password !==
      this.setPasswordForm.confirmPassword
    ) {
      this.error = 'Passwords do not match.';
      return;
    }

    if (
      this.setPasswordForm.password.length < 8 ||
      this.setPasswordForm.password.length > 72
    ) {
      this.error = 'Password must be between 8 and 72 characters.';
      return;
    }

    this.busy = true;

    this.http.post<{ message: string }>(
      '/api/auth/customer-setup/set-password',
      {
        email: this.setupEmail.trim(),
        password: this.setPasswordForm.password,
        activationToken: this.activationToken
      }
    ).subscribe({
      next: r => {
        this.message =
          r.message || 'Password set successfully. You can now log in.';

        this.activationToken = '';
        this.setupOtp = '';

        this.setPasswordForm = {
          password: '',
          confirmPassword: ''
        };

        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  chooseUser(user: UserRecord): void {
    this.selectedUser = user;

    this.editForm = {
      status: user.status || 'Active',
      roleName: user.roleName || 'CUSTOMER'
    };

    this.clearNotice();
  }

  updateUser(): void {
    if (!this.selectedUser) {
      return;
    }

    this.clearNotice();
    this.busy = true;

    this.http.put<UserRecord>(
      `/api/admin/users/${this.selectedUser.userId}`,
      this.editForm,
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.message = 'User updated successfully.';
        this.selectedUser = null;
        this.busy = false;
        this.loadUsers();
      },
      error: e => this.fail(e)
    });
  }

  loadAudit(): void {
    this.clearNotice();
    this.busy = true;

    this.http.get<Record<string, unknown>[]>(
      '/api/admin/audit-logs',
      { headers: this.headers() }
    ).subscribe({
      next: r => {
        this.auditLogs = r;
        this.section = 'audit';
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  showSection(
    section:
      | 'overview'
      | 'users'
      | 'create-agent'
      | 'create-customer'
      | 'audit'
  ): void {
    this.section = section;
    this.clearNotice();

    if (section === 'users') {
      this.loadUsers();
    }

    if (section === 'audit') {
      this.loadAudit();
    }
  }
}
