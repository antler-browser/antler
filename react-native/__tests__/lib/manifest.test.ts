import { validateManifest } from '../../lib/webview/manifest';

describe('Manifest Validation', () => {
  describe('validateManifest', () => {
    describe('Valid manifests', () => {
      it('should accept valid manifest with all fields', () => {
        const manifest = {
          name: 'Coffee Shop',
          description: 'A cozy coffee shop',
          location: '123 Main St, Vancouver',
          icon: 'https://example.com/icon.png',
          type: 'place',
        };

        const result = validateManifest(manifest);

        expect(result).toEqual({
          name: 'Coffee Shop',
          description: 'A cozy coffee shop',
          location: '123 Main St, Vancouver',
          icon: 'https://example.com/icon.png',
          type: 'place',
        });
      });

      it('should accept manifest with only required name field', () => {
        const manifest = {
          name: 'Coffee Shop',
        };

        const result = validateManifest(manifest);

        expect(result).toEqual({
          name: 'Coffee Shop',
          description: null,
          location: null,
          icon: null,
          type: null,
        });
      });

      it('should accept any non-empty type string', () => {
        const manifest = {
          name: 'Test App',
          type: 'place',
        };

        const result = validateManifest(manifest);
        expect(result?.type).toBe('place');
      });
    });

    describe('Invalid manifests', () => {
      it('should reject null manifest', () => {
        const result = validateManifest(null);
        expect(result).toBeNull();
      });

      it('should reject undefined manifest', () => {
        const result = validateManifest(undefined);
        expect(result).toBeNull();
      });

      it('should reject non-object manifest', () => {
        expect(validateManifest('not an object')).toBeNull();
        expect(validateManifest(123)).toBeNull();
        expect(validateManifest(true)).toBeNull();
      });

      it('should reject manifest without name', () => {
        const manifest = {
          description: 'A description',
        };

        const result = validateManifest(manifest);
        expect(result).toBeNull();
      });

      it('should reject manifest with empty name', () => {
        const manifest = {
          name: '',
        };

        const result = validateManifest(manifest);
        expect(result).toBeNull();
      });

      it('should reject manifest with whitespace-only name', () => {
        const manifest = {
          name: '   ',
        };

        const result = validateManifest(manifest);
        expect(result).toBeNull();
      });
    });

    describe('HTML stripping (XSS protection)', () => {
      it('should strip HTML tags from name', () => {
        const manifest = {
          name: '<script>alert("xss")</script>Coffee Shop',
        };

        const result = validateManifest(manifest);
        expect(result?.name).toBe('alert("xss")Coffee Shop');
      });

      it('should strip HTML tags from description', () => {
        const manifest = {
          name: 'Coffee Shop',
          description: '<b>Bold</b> and <i>italic</i> text',
        };

        const result = validateManifest(manifest);
        expect(result?.description).toBe('Bold and italic text');
      });

      it('should strip HTML tags from location', () => {
        const manifest = {
          name: 'Coffee Shop',
          location: '123 <script>alert(1)</script> Main St',
        };

        const result = validateManifest(manifest);
        expect(result?.location).toBe('123 alert(1) Main St');
      });

      it('should strip HTML tags from type', () => {
        const manifest = {
          name: 'Coffee Shop',
          type: '<b>place</b>',
        };

        const result = validateManifest(manifest);
        expect(result?.type).toBe('place');
      });
    });

    describe('Length limits', () => {
      it('should truncate name to 100 characters', () => {
        const longName = 'a'.repeat(150);
        const manifest = {
          name: longName,
        };

        const result = validateManifest(manifest);
        expect(result?.name).toHaveLength(100);
        expect(result?.name).toBe('a'.repeat(100));
      });

      it('should truncate description to 500 characters', () => {
        const longDescription = 'a'.repeat(600);
        const manifest = {
          name: 'Coffee Shop',
          description: longDescription,
        };

        const result = validateManifest(manifest);
        expect(result?.description).toHaveLength(500);
        expect(result?.description).toBe('a'.repeat(500));
      });

      it('should truncate location to 200 characters', () => {
        const longLocation = 'a'.repeat(250);
        const manifest = {
          name: 'Coffee Shop',
          location: longLocation,
        };

        const result = validateManifest(manifest);
        expect(result?.location).toHaveLength(200);
        expect(result?.location).toBe('a'.repeat(200));
      });

      it('should truncate icon URL to 500 characters', () => {
        const longIcon = 'https://example.com/' + 'a'.repeat(600);
        const manifest = {
          name: 'Coffee Shop',
          icon: longIcon,
        };

        const result = validateManifest(manifest);
        expect(result?.icon).toHaveLength(500);
      });

      it('should truncate type to 50 characters', () => {
        const longType = 'place' + 'a'.repeat(60);
        const manifest = {
          name: 'Coffee Shop',
          type: longType,
        };

        const result = validateManifest(manifest);
        // Type is truncated to 50 characters
        expect(result?.type).toHaveLength(50);
      });
    });

    describe('Icon URL validation', () => {
      it('should accept valid HTTPS icon URLs', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: 'https://example.com/icon.png',
        };

        const result = validateManifest(manifest);
        expect(result?.icon).toBe('https://example.com/icon.png');
      });

      it('should reject HTTP icon URLs', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: 'http://example.com/icon.png',
        };

        const result = validateManifest(manifest);
        expect(result?.icon).toBeNull();
      });

      it('should reject invalid icon URLs', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: 'not a url',
        };

        const result = validateManifest(manifest);
        expect(result?.icon).toBeNull();
      });

      it('should reject relative icon URLs without base URL', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: '/icon.png',
        };

        const result = validateManifest(manifest);
        expect(result?.icon).toBeNull();
      });

      it('should resolve relative icon URL with ./ prefix', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: './icon.png',
        };

        const result = validateManifest(manifest, 'https://example.com/local-first-auth-manifest.json');
        expect(result?.icon).toBe('https://example.com/icon.png');
      });

      it('should resolve relative icon URL with / prefix', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: '/assets/icon.png',
        };

        const result = validateManifest(manifest, 'https://example.com/app/manifest.json');
        expect(result?.icon).toBe('https://example.com/assets/icon.png');
      });

      it('should resolve relative icon URL with ../ prefix', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: '../images/icon.png',
        };

        const result = validateManifest(manifest, 'https://example.com/app/manifest.json');
        expect(result?.icon).toBe('https://example.com/images/icon.png');
      });

      it('should resolve relative icon URL without prefix', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: 'icon.png',
        };

        const result = validateManifest(manifest, 'https://example.com/app/manifest.json');
        expect(result?.icon).toBe('https://example.com/app/icon.png');
      });

      it('should reject relative icon that resolves to HTTP', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: './icon.png',
        };

        const result = validateManifest(manifest, 'http://example.com/manifest.json');
        expect(result?.icon).toBeNull();
      });

      it('should keep absolute HTTPS URL even with base URL provided', () => {
        const manifest = {
          name: 'Coffee Shop',
          icon: 'https://cdn.example.com/icon.png',
        };

        const result = validateManifest(manifest, 'https://example.com/manifest.json');
        expect(result?.icon).toBe('https://cdn.example.com/icon.png');
      });
    });

    describe('Type validation', () => {
      it('should accept any non-empty type string', () => {
        const manifest = {
          name: 'Coffee Shop',
          type: 'custom_type',
        };

        const result = validateManifest(manifest);
        expect(result?.type).toBe('custom_type');
      });

      it('should reject empty type', () => {
        const manifest = {
          name: 'Coffee Shop',
          type: '',
        };

        const result = validateManifest(manifest);
        expect(result?.type).toBeNull();
      });
    });

    describe('Optional field handling', () => {
      it('should return null for missing optional fields', () => {
        const manifest = {
          name: 'Coffee Shop',
        };

        const result = validateManifest(manifest);
        expect(result?.description).toBeNull();
        expect(result?.location).toBeNull();
        expect(result?.icon).toBeNull();
        expect(result?.type).toBeNull();
      });

      it('should return null for empty string optional fields', () => {
        const manifest = {
          name: 'Coffee Shop',
          description: '',
          location: '',
          icon: '',
          type: '',
        };

        const result = validateManifest(manifest);
        expect(result?.description).toBeNull();
        expect(result?.location).toBeNull();
        expect(result?.icon).toBeNull();
        expect(result?.type).toBeNull();
      });

      it('should return null for whitespace-only optional fields', () => {
        const manifest = {
          name: 'Coffee Shop',
          description: '   ',
          location: '   ',
          icon: '   ',
          type: '   ',
        };

        const result = validateManifest(manifest);
        expect(result?.description).toBeNull();
        expect(result?.location).toBeNull();
        expect(result?.icon).toBeNull();
        expect(result?.type).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should trim whitespace from fields', () => {
        const manifest = {
          name: '  Coffee Shop  ',
          description: '  A cozy place  ',
          location: '  123 Main St  ',
          type: '  place  ',
        };

        const result = validateManifest(manifest);
        expect(result?.name).toBe('Coffee Shop');
        expect(result?.description).toBe('A cozy place');
        expect(result?.location).toBe('123 Main St');
        expect(result?.type).toBe('place');
      });

      it('should handle special characters in name', () => {
        const manifest = {
          name: 'Café ☕ & Bakery',
        };

        const result = validateManifest(manifest);
        expect(result?.name).toBe('Café ☕ & Bakery');
      });

      it('should handle Unicode characters', () => {
        const manifest = {
          name: '咖啡店',
          description: 'カフェ',
          location: '서울',
        };

        const result = validateManifest(manifest);
        expect(result?.name).toBe('咖啡店');
        expect(result?.description).toBe('カフェ');
        expect(result?.location).toBe('서울');
      });
    });
  });
});
