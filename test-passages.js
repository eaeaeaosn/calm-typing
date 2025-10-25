// Test script for passages functionality
// Run with: node test-passages.js

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testPassages() {
    console.log('🧪 Testing Passages Functionality\n');
    
    // Test 1: Create a guest session
    console.log('1. Creating guest session...');
    try {
        const guestResponse = await fetch(`${API_BASE}/api/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!guestResponse.ok) {
            throw new Error(`Guest creation failed: ${guestResponse.status}`);
        }
        
        const guestData = await guestResponse.json();
        const guestId = guestData.guestId;
        console.log(`✅ Guest session created: ${guestId}\n`);
        
        // Test 2: Save a passage as guest
        console.log('2. Saving passage as guest...');
        const passageData = {
            title: 'Test Passage',
            content: 'This is a test passage to verify cloud storage functionality.'
        };
        
        const saveResponse = await fetch(`${API_BASE}/api/guest/passages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-guest-id': guestId
            },
            body: JSON.stringify(passageData)
        });
        
        if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            throw new Error(`Save failed: ${saveResponse.status} - ${errorText}`);
        }
        
        const saveResult = await saveResponse.json();
        console.log(`✅ Passage saved: ${JSON.stringify(saveResult)}\n`);
        
        // Test 3: Retrieve passages
        console.log('3. Retrieving passages...');
        const getResponse = await fetch(`${API_BASE}/api/guest/passages`, {
            method: 'GET',
            headers: { 'x-guest-id': guestId }
        });
        
        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            throw new Error(`Get failed: ${getResponse.status} - ${errorText}`);
        }
        
        const passages = await getResponse.json();
        console.log(`✅ Retrieved ${passages.passages.length} passages:`);
        passages.passages.forEach((passage, index) => {
            console.log(`   ${index + 1}. ${passage.title} (${passage.word_count} words)`);
        });
        console.log();
        
        // Test 4: Test user authentication and passages
        console.log('4. Testing user authentication...');
        const testUser = {
            username: 'testuser' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'testpass123'
        };
        
        // Register user
        const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        
        if (!registerResponse.ok) {
            const errorText = await registerResponse.text();
            throw new Error(`Registration failed: ${registerResponse.status} - ${errorText}`);
        }
        
        const registerResult = await registerResponse.json();
        const authToken = registerResult.token;
        console.log(`✅ User registered: ${testUser.username}\n`);
        
        // Test 5: Save passage as authenticated user
        console.log('5. Saving passage as authenticated user...');
        const userPassageData = {
            title: 'User Test Passage',
            content: 'This is a test passage saved by an authenticated user.'
        };
        
        const userSaveResponse = await fetch(`${API_BASE}/api/user/passages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(userPassageData)
        });
        
        if (!userSaveResponse.ok) {
            const errorText = await userSaveResponse.text();
            throw new Error(`User save failed: ${userSaveResponse.status} - ${errorText}`);
        }
        
        const userSaveResult = await userSaveResponse.json();
        console.log(`✅ User passage saved: ${JSON.stringify(userSaveResult)}\n`);
        
        // Test 6: Retrieve user passages
        console.log('6. Retrieving user passages...');
        const userGetResponse = await fetch(`${API_BASE}/api/user/passages`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!userGetResponse.ok) {
            const errorText = await userGetResponse.text();
            throw new Error(`User get failed: ${userGetResponse.status} - ${errorText}`);
        }
        
        const userPassages = await userGetResponse.json();
        console.log(`✅ Retrieved ${userPassages.passages.length} user passages:`);
        userPassages.passages.forEach((passage, index) => {
            console.log(`   ${index + 1}. ${passage.title} (${passage.word_count} words)`);
        });
        
        console.log('\n🎉 All tests passed! Passages functionality is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testPassages();
