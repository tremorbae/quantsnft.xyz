require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the parent directory (main website)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.post('/api/check-whitelist', async (req, res) => {
    const { walletAddress } = req.body;
    console.log('\n--- New Request ---');
    console.log('Received wallet address:', walletAddress);

    if (!walletAddress) {
        console.log('Error: No wallet address provided');
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        console.log('Starting whitelist check...');
        const result = await checkWhitelist(walletAddress);
        console.log('Whitelist check result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/check-whitelist:', error);
        res.status(500).json({ 
            error: 'Error checking whitelist', 
            details: error.message 
        });
    }
    console.log('--- Request Completed ---\n');
});

// Handle SPA routing - serve index.html for all other GET requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

function normalizeAddress(address) {
    if (!address) return '';
    // Remove '0x' prefix if present and convert to lowercase
    return address.toString().toLowerCase().replace(/^0x/, '');
}

/**
 * Validates if an address is a valid Ethereum address or transaction hash
 * @param {string} address - The address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidCryptoAddress(address) {
    if (!address) return false;
    // Check if it's a valid Ethereum address (40 hex chars, optionally prefixed with 0x)
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
        return true;
    }
    // Check if it's a valid 64-char hash (like a transaction hash)
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(address)) {
        return true;
    }
    return false;
}

async function checkWhitelist(walletAddress) {
    try {
        console.log('\n--- Starting whitelist check ---');
        console.log('Original wallet address:', walletAddress);
        
        // Validate the input address format
        if (!isValidCryptoAddress(walletAddress)) {
            console.error('Invalid wallet address format:', walletAddress);
            return res.status(400).json({ 
                isWhitelisted: false, 
                listType: null, 
                message: 'Invalid wallet address format. Please provide a valid Ethereum address or transaction hash.' 
            });
        }
        
        // Normalize the input address
        const normalizedWallet = normalizeAddress(walletAddress);
        console.log('Normalized wallet address:', normalizedWallet);
        
        const matchingLists = [];

        // Define the whitelist files to check
        const whitelistFiles = [
            { name: 'Contributor', path: path.join(__dirname, '../whitelists/contributors.json') },
            { name: 'Early Bird', path: path.join(__dirname, '../whitelists/early-birds.json') },
            { name: 'Whitelist', path: path.join(__dirname, '../whitelists/whitelist.json') }
        ];
        
        // Check each whitelist file
        for (const { name, path: filePath } of whitelistFiles) {
            try {
                console.log(`\nChecking ${name} list at: ${filePath}`);
                
                // Read and parse the whitelist file
                const fileData = await fs.readFile(filePath, 'utf8');
                const jsonData = JSON.parse(fileData);
                
                if (!jsonData || !Array.isArray(jsonData.addresses)) {
                    console.error(`Invalid format in ${name} whitelist: missing or invalid 'addresses' array`);
                    continue;
                }
                
                const addresses = jsonData.addresses;
                console.log(`Found ${addresses.length} addresses in ${name} list`);
                
                // Check if the wallet is in this list (with case-insensitive comparison)
                const isInList = addresses.some(addr => normalizeAddress(addr) === normalizedWallet);
                
                if (isInList) {
                    console.log(`✅ FOUND in ${name} list`);
                    matchingLists.push(name);
                    
                    // Find and log the exact matching address for debugging
                    const exactMatch = addresses.find(addr => normalizeAddress(addr) === normalizedWallet);
                    console.log(`   Original format: ${exactMatch}`);
                    console.log(`   Normalized: ${normalizeAddress(exactMatch)}`);
                } else {
                    console.log(`❌ Not found in ${name} list`);
                }
                
                // Log first 3 addresses for format verification
                if (addresses.length > 0) {
                    console.log('Sample addresses:');
                    addresses.slice(0, 3).forEach((addr, i) => {
                        console.log(`   ${i+1}. Original: ${addr}`);
                        console.log(`      Normalized: ${normalizeAddress(addr)}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${name} list:`, error.message);
                if (error.code === 'ENOENT') {
                    console.error(`File not found: ${filePath}`);
                }
                // Continue with other lists even if one fails
            }
        }

        // Return results
        if (matchingLists.length > 0) {
            const listsText = matchingLists.join(', ');
            return {
                isWhitelisted: true,
                listType: matchingLists.length > 1 ? 'Multiple' : matchingLists[0],
                lists: matchingLists,
                message: matchingLists.length > 1 
                    ? `Your wallet is whitelisted in the following lists: ${listsText}`
                    : `Your wallet is whitelisted in the ${listsText} list!`
            };
        }

        // If we get here, no match was found
        console.log('No match found in any list');
        return {
            isWhitelisted: false, 
            listType: null, 
            message: 'Address not found in any whitelist. Please ensure you are using the correct address format (40-char Ethereum address or 64-char transaction hash).' 
        };
    } catch (error) {
        console.error('Error in checkWhitelist:', error);
        throw error; // Re-throw to be handled by the route handler
    }
}

// Simple endpoint to return available lists
app.get('/api/lists', (req, res) => {
    res.json({ 
        lists: ['Contributor', 'Early Bird', 'Whitelist']
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});
