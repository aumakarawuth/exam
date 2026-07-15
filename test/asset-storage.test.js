const test = require('node:test');
const assert = require('node:assert/strict');
const { createAssetStorage, MAX_ASSET_BYTES, ALLOWED_TYPES } = require('../src/asset-storage');

test('asset storage stays disabled until Supabase secrets are configured', async () => {
  const storage = createAssetStorage({ url: '', serviceRoleKey: '', bucket: 'exam-assets' });
  assert.equal(storage.configured, false);
  assert.equal(storage.maxBytes, MAX_ASSET_BYTES);
  assert.ok(ALLOWED_TYPES.has('image/png'));
  await assert.rejects(() => storage.upload({ buffer: Buffer.from('x'), contentType: 'image/png', fileName: 'x.png', owner: 'admin' }), { code: 'storage_not_configured' });
});
