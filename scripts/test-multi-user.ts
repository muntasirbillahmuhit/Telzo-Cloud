import { dbService } from '../server/services/db.service.js';
import { IsolationService } from '../server/services/isolation.service.js';
import { CloudStorageService } from '../server/services/cloudStorage.service.js';
import { UserSession } from '../server/middleware/session.js';
import crypto from 'crypto';

async function runMultiUserTestSuite() {
  console.log('=== STARTING TELZO CLOUD MULTI-USER ISOLATION & SECURITY SUITE ===\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedTests++;
    }
  }

  try {
    // 1. User Creation & SQLite Registration
    const userA_Id = `user_test_a_${Date.now()}`;
    const userB_Id = `user_test_b_${Date.now()}`;

    const userA = dbService.createUser({
      id: userA_Id,
      oidc_sub: `oidc_sub_a_${Date.now()}`,
      telegram_user_id: `100001`,
      username: 'user_a',
      display_name: 'User A',
      storage_quota_bytes: 10 * 1024 * 1024, // 10 MB limit for test
    });

    const userB = dbService.createUser({
      id: userB_Id,
      oidc_sub: `oidc_sub_b_${Date.now()}`,
      telegram_user_id: `100002`,
      username: 'user_b',
      display_name: 'User B',
      storage_quota_bytes: 10 * 1024 * 1024,
    });

    assert(Boolean(userA && userA.id === userA_Id), 'User A registered in SQLite');
    assert(Boolean(userB && userB.id === userB_Id), 'User B registered in SQLite');

    // 2. Create Sessions
    const sessionA: UserSession = {
      sessionId: `sess_a_${Date.now()}`,
      userId: userA_Id,
      createdAt: Date.now(),
      lastActive: Date.now(),
      telegramState: 'unconfigured',
    };

    const sessionB: UserSession = {
      sessionId: `sess_b_${Date.now()}`,
      userId: userB_Id,
      createdAt: Date.now(),
      lastActive: Date.now(),
      telegramState: 'unconfigured',
    };

    // 3. User A creates a folder
    const folderA = await CloudStorageService.createFolder(
      sessionA,
      'User A Secret Folder',
      'Private to A',
      '#4f7cf0'
    );
    assert(Boolean(folderA && folderA.id), 'User A created folder successfully');

    // 4. Test Cross-Tenant Folder Access Rejection (User B attempting to access User A's folder)
    let crossAccessDenied = false;
    try {
      IsolationService.verifyFolderAccess(userB_Id, folderA.id);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) {
        crossAccessDenied = true;
      }
    }
    assert(crossAccessDenied, 'Isolation Guard rejected User B access to User A folder (403 Forbidden)');

    // 5. User A uploads a file
    const sampleBuffer = Buffer.from('Confidential data for User A');
    const fileA = await CloudStorageService.uploadFile(
      sessionA,
      sampleBuffer,
      'doc_a.txt',
      'text/plain',
      folderA.id,
      'Important'
    );
    assert(Boolean(fileA && fileA.id), 'User A uploaded file successfully');

    // 6. Test Cross-Tenant File Access Rejection (User B attempting to access User A's file)
    let crossFileAccessDenied = false;
    try {
      IsolationService.verifyFileAccess(userB_Id, fileA.id);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) {
        crossFileAccessDenied = true;
      }
    }
    assert(crossFileAccessDenied, 'Isolation Guard rejected User B access to User A file (403 Forbidden)');

    // 7. Storage Quota Enforcement
    let quotaExceededError = false;
    try {
      const hugeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15 MB (exceeds 10 MB quota)
      await CloudStorageService.uploadFile(
        sessionA,
        hugeBuffer,
        'huge_video.mp4',
        'video/mp4'
      );
    } catch (err: any) {
      if (err.message.includes('QUOTA_EXCEEDED')) {
        quotaExceededError = true;
      }
    }
    assert(quotaExceededError, 'Storage Quota Enforcement blocked oversized upload');

    // 8. Clean up test records
    dbService.deleteUserAccount(userA_Id);
    dbService.deleteUserAccount(userB_Id);
    assert(dbService.findUserById(userA_Id) === undefined, 'User A test account deleted cleanly');

    console.log(`\n=== SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED ===`);
    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runMultiUserTestSuite();
