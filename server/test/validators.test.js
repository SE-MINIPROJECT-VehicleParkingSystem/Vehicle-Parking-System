const {normalizeEmail,isValidEmail,isStrongEnoughPassword}=require('../src/utils/validators');
test('normalizes email',()=>expect(normalizeEmail(' OWNER@Example.com ')).toBe('owner@example.com'));
test('validates email',()=>{expect(isValidEmail('owner@example.com')).toBe(true);expect(isValidEmail('bad')).toBe(false);});
test('checks password length',()=>{expect(isStrongEnoughPassword('Password123!')).toBe(true);expect(isStrongEnoughPassword('short')).toBe(false);expect(isStrongEnoughPassword('x'.repeat(129))).toBe(false);});
