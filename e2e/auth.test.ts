import { device, element, by, expect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show auth screen when not logged in', async () => {
    await expect(element(by.text('Welcome to Spending Tracker'))).toBeVisible();
    await expect(element(by.text('Sign in with Google'))).toBeVisible();
  });

  it('should show loading state during authentication', async () => {
    const signInButton = element(by.text('Sign in with Google'));
    await signInButton.tap();
    await expect(signInButton).toBeNotTappable();
  });

  it('should navigate to main screen after successful authentication', async () => {
    // This test requires manual Google Sign In setup
    // We'll use test user authentication for E2E testing
    const testSignInButton = element(by.text('Sign in as Test User'));
    await testSignInButton.tap();
    await expect(element(by.text('Main Screen'))).toBeVisible();
  });

  it('should return to auth screen after sign out', async () => {
    // First sign in
    const testSignInButton = element(by.text('Sign in as Test User'));
    await testSignInButton.tap();
    await expect(element(by.text('Main Screen'))).toBeVisible();

    // Then sign out
    const signOutButton = element(by.text('Sign Out'));
    await signOutButton.tap();
    await expect(element(by.text('Welcome to Spending Tracker'))).toBeVisible();
  });
});
