import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerIdentity } from '../../../public/js/config/PlayerIdentity.js';

describe('PlayerIdentity', () => {
  let originalLocation;
  let originalCookie;

  beforeEach(() => {
    // Save originals
    originalLocation = window.location;
    originalCookie = document.cookie;

    // Clear cookies
    document.cookie = 'neonflap_playerName=; max-age=0; path=/';
  });

  afterEach(() => {
    // Restore
    if (originalLocation !== window.location) {
      window.location = originalLocation;
    }
    document.cookie = 'neonflap_playerName=; max-age=0; path=/';
  });

  function createPlayerIdentityWithUrl(search) {
    // Mock window.location.search
    delete window.location;
    window.location = { search };
    return new PlayerIdentity();
  }

  describe('initialization from URL parameter', () => {
    it('should read name from URL parameter', () => {
      const identity = createPlayerIdentityWithUrl('?name=Fredrik');

      expect(identity.hasPlayer()).toBe(true);
      expect(identity.getName()).toBe('Fredrik');
    });

    it('should handle URL-encoded names', () => {
      const identity = createPlayerIdentityWithUrl('?name=Erik%20Svensson');

      expect(identity.hasPlayer()).toBe(true);
      expect(identity.getName()).toBe('Erik Svensson');
    });

    it('should trim whitespace from name', () => {
      const identity = createPlayerIdentityWithUrl('?name=%20%20Anna%20%20');

      expect(identity.getName()).toBe('Anna');
    });

    it('should truncate names longer than 20 characters', () => {
      const longName = 'A'.repeat(25);
      const identity = createPlayerIdentityWithUrl(`?name=${longName}`);

      expect(identity.getName()).toBe('A'.repeat(20));
    });

    it('should not initialize with empty name parameter', () => {
      const identity = createPlayerIdentityWithUrl('?name=');

      expect(identity.hasPlayer()).toBe(false);
      expect(identity.getName()).toBeNull();
    });

    it('should not initialize with whitespace-only name', () => {
      const identity = createPlayerIdentityWithUrl('?name=%20%20%20');

      expect(identity.hasPlayer()).toBe(false);
    });

    it('should save name to cookie when provided via URL', () => {
      createPlayerIdentityWithUrl('?name=TestUser');

      expect(document.cookie).toContain('neonflap_playerName=TestUser');
    });
  });

  describe('initialization from cookie', () => {
    it('should read name from cookie when no URL parameter', () => {
      document.cookie = 'neonflap_playerName=CookieUser; path=/';
      const identity = createPlayerIdentityWithUrl('');

      expect(identity.hasPlayer()).toBe(true);
      expect(identity.getName()).toBe('CookieUser');
    });

    it('should handle URL-encoded cookie values', () => {
      document.cookie = 'neonflap_playerName=' + encodeURIComponent('Olle Karlsson') + '; path=/';
      const identity = createPlayerIdentityWithUrl('');

      expect(identity.getName()).toBe('Olle Karlsson');
    });

    it('should prefer URL parameter over cookie', () => {
      document.cookie = 'neonflap_playerName=CookieUser; path=/';
      const identity = createPlayerIdentityWithUrl('?name=URLUser');

      expect(identity.getName()).toBe('URLUser');
    });

    it('should not initialize when no URL parameter and no cookie', () => {
      const identity = createPlayerIdentityWithUrl('');

      expect(identity.hasPlayer()).toBe(false);
      expect(identity.getName()).toBeNull();
    });
  });

  describe('name sanitization', () => {
    it('should remove HTML tags', () => {
      const identity = createPlayerIdentityWithUrl('?name=%3Cb%3EBold%3C%2Fb%3EUser');

      expect(identity.getName()).toBe('BoldUser');
    });

    it('should allow Swedish characters', () => {
      const identity = createPlayerIdentityWithUrl('?name=%C3%85sa%20%C3%96stberg');

      expect(identity.getName()).toBe('Åsa Östberg');
    });

    it('should allow hyphens', () => {
      const identity = createPlayerIdentityWithUrl('?name=Anna-Karin');

      expect(identity.getName()).toBe('Anna-Karin');
    });

    it('should remove special characters', () => {
      const identity = createPlayerIdentityWithUrl('?name=User@123!');

      expect(identity.getName()).toBe('User123');
    });
  });

  describe('getUpperName', () => {
    it('should return uppercase name', () => {
      const identity = createPlayerIdentityWithUrl('?name=Fredrik');

      expect(identity.getUpperName()).toBe('FREDRIK');
    });

    it('should return null when no player', () => {
      const identity = createPlayerIdentityWithUrl('');

      expect(identity.getUpperName()).toBeNull();
    });
  });
});
