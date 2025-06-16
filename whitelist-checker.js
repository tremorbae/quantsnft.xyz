document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const walletInput = document.getElementById('wallet-address');
    const checkBtn = document.getElementById('check-whitelist-btn');
    const resultDiv = document.getElementById('whitelist-result');
    const messageEl = resultDiv?.querySelector('.result-message');
    const badgesContainer = resultDiv?.querySelector('.whitelist-badges');
    const btnText = checkBtn?.querySelector('.btn-text');
    const spinner = checkBtn?.querySelector('.spinner');
    
    // Whitelist data
    let whitelists = {
        'Contributor': new Set(),
        'Early Bird': new Set(),
        'Whitelist': new Set()
    };
    
    // Load whitelist data
    async function loadWhitelists() {
        try {
            const [contributors, earlyBirds, whitelist] = await Promise.all([
                fetch('whitelists/contributors.json').then(res => res.json()),
                fetch('whitelists/early-birds.json').then(res => res.json()),
                fetch('whitelists/whitelist.json').then(res => res.json())
            ]);
            
            whitelists['Contributor'] = new Set(contributors.addresses.map(addr => addr.toLowerCase()));
            whitelists['Early Bird'] = new Set(earlyBirds.addresses.map(addr => addr.toLowerCase()));
            whitelists['Whitelist'] = new Set(whitelist.addresses.map(addr => addr.toLowerCase()));
            
            console.log('Whitelists loaded successfully');
        } catch (error) {
            console.error('Error loading whitelists:', error);
            showResult('Error loading whitelist data. Please try again later.', 'error');
        }
    }
    
    // Initialize
    loadWhitelists();
    
    // Check if required elements exist
    if (!walletInput || !checkBtn || !resultDiv || !messageEl || !badgesContainer) {
        console.error('Required elements not found. Check your HTML structure.');
        return;
    }

    // Normalize wallet address (remove 0x prefix for comparison)
    function normalizeAddress(address) {
        return address.toLowerCase().replace(/^0x/, '');
    }

    // Check whitelist status
    function checkWhitelist() {
        const walletAddress = walletInput.value.trim();
        const normalizedAddress = normalizeAddress(walletAddress);

        if (!walletAddress) {
            showResult('Please enter a wallet address', 'error');
            return;
        }

        // Validate wallet address format (accepts both 40-char Ethereum addresses and 64-char hashes)
        if (!/^0x[a-fA-F0-9]{40,64}$/.test(walletAddress)) {
            showResult('Please enter a valid wallet address or transaction hash', 'error');
            return;
        }

        setLoading(true);
        showResult('Checking whitelist status...', 'loading');

        try {
            // Check each whitelist
            const matchingLists = [];
            
            // Check each whitelist for a match with the normalized address
            for (const [listName, addresses] of Object.entries(whitelists)) {
                for (const whitelistAddress of addresses) {
                    if (normalizeAddress(whitelistAddress) === normalizedAddress) {
                        matchingLists.push(listName);
                        break; // No need to check other addresses in this list
                    }
                }
            }
            
            if (matchingLists.length > 0) {
                showResult(
                    'Your wallet is whitelisted!',
                    'success',
                    matchingLists
                );
            } else {
                showResult('Wallet not found in any whitelist.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showResult('An error occurred while checking whitelist status. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }


    // Show result message
    function showResult(message, type, lists = []) {
        // Update message
        messageEl.textContent = message;
        
        // Clear previous badges
        badgesContainer.innerHTML = '';
        
        // Add badges if we have lists
        if (lists && lists.length > 0) {
            lists.forEach(list => {
                const badge = document.createElement('div');
                badge.className = 'whitelist-badge';
                badge.setAttribute('data-list', list);
                badge.textContent = list;
                badgesContainer.appendChild(badge);
            });
        }
        
        // Update result display
        resultDiv.style.display = 'block';
        resultDiv.className = `whitelist-result ${type}`;
    }

    // Set loading state
    function setLoading(isLoading) {
        checkBtn.disabled = isLoading;
        btnText.textContent = isLoading ? 'Checking...' : 'Check Status';
        spinner.style.display = isLoading ? 'inline-block' : 'none';
    }

    // Event listeners
    checkBtn.addEventListener('click', checkWhitelist);
    
    // Allow form submission with Enter key
    walletInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkWhitelist();
        }
    });
});
