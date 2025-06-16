/**
 * DOM Element Cache
 * Lazy loads and caches frequently accessed DOM elements
 */
// DOM Cache
const domCache = (() => {
    const elements = {
        heroVideo: document.getElementById('heroVideo'),
        musicToggle: document.getElementById('musicToggle'),
        bgMusic: document.getElementById('bgMusic'),
        hero: document.querySelector('hero')
    };

    return elements;
})();

/**
 * Application State Management
 * Centralized state with private variables and public getters/setters
 */
const state = (() => {
    const privateState = new Map([
        ['isMusicPlaying', false],
        ['lastScrollTime', 0],
        ['scrollDelay', 16] // ~60fps
    ]);

    const get = key => privateState.get(key);
    const set = (key, value) => privateState.set(key, value);

    return {
        get isMusicPlaying() { return get('isMusicPlaying'); },
        set isMusicPlaying(value) { set('isMusicPlaying', value); },
        get lastScrollTime() { return get('lastScrollTime'); },
        set lastScrollTime(value) { set('lastScrollTime', value); },
        get scrollDelay() { return get('scrollDelay'); }
    };
})();

/**
 * Utility Functions
 */
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const preloadImages = () => {
    // Optional: Implement image preloading if needed
    // This function is kept as a placeholder for future use
    return () => {}; // Return empty cleanup function for consistency
};

/**
 * Initializes the hero video with autoplay and interaction handling
 */
const initHeroVideo = () => {
    if (!domCache.heroVideo) return;

    // Configure video attributes for better mobile support
    const video = domCache.heroVideo;
    video.muted = true;
    video.playsInline = true;
    video.playbackRate = 0.7; // Slow down the video to 70% of normal speed
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('preload', 'auto');

    // Attempt to autoplay the video
    const attemptAutoplay = () => {
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('Video autoplay started'))
                .catch(error => {
                    console.log('Autoplay prevented, will play on interaction:', error);
                    setupUserInteraction();
                });
        }
    };

    // Set up user interaction to start video
    const setupUserInteraction = () => {
        const playOnInteraction = () => {
            video.play().catch(console.error);
            removeInteractionListeners();
        };

        const removeInteractionListeners = () => {
            window.removeEventListener('click', playOnInteraction);
            window.removeEventListener('touchstart', playOnInteraction);
            document.removeEventListener('scroll', playOnInteraction);
        };

        // Add interaction listeners
        window.addEventListener('click', playOnInteraction, { once: true });
        window.addEventListener('touchstart', playOnInteraction, { once: true });
        
        // Also trigger on first scroll
        document.addEventListener('scroll', playOnInteraction, { once: true, passive: true });
    };

    // Try to autoplay when metadata is loaded
    const handleLoadedData = () => {
        console.log('Video metadata loaded');
        attemptAutoplay();
    };

    // Add event listeners
    video.addEventListener('loadeddata', handleLoadedData, { once: true });
    
    // Fallback: If loadeddata doesn't fire quickly enough
    const loadTimeout = setTimeout(() => {
        if (video.readyState < 2) { // 2 = HAVE_CURRENT_DATA
            console.log('Video loading taking too long, attempting autoplay');
            attemptAutoplay();
        }
    }, 2000);

    // Cleanup function
    return () => {
        clearTimeout(loadTimeout);
        video.removeEventListener('loadeddata', handleLoadedData);
    };
};



/**
 * Initializes all components and sets up event listeners
 */
/**
 * Initialize the gallery
 */
const initGallery = () => {
    // No gallery functionality needed
    return () => {}; // Empty cleanup function
};

// Import NFT data
import { getGalleryImages, getNftById } from './nftData.js';

// Handle scroll event for music button with debounce
const handleScroll = (() => {
    let timeoutId;
    return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (window.scrollY > 50) {
                document.body.classList.add('scrolled');
                domCache.musicToggle?.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
                domCache.musicToggle?.classList.remove('scrolled');
            }
        }, 10);
    };
})();

// Initialize Gallery Carousel with Infinite Scroll
const initGalleryCarousel = () => {
    try {
        const galleryTrack = document.querySelector('.gallery-track');
        if (!galleryTrack) {
            console.warn('Gallery track element not found');
            return () => {}; // Return empty cleanup function
        }

        // Get gallery images with their NFT data
        const galleryItems = getGalleryImages();
        if (!galleryItems || !Array.isArray(galleryItems) || galleryItems.length === 0) {
            console.warn('No gallery items found');
            return () => {};
        }
        
        // Store the original items and track current position
        const originalItems = [...galleryItems];
        // Start the carousel at 1/3 of the way through the first set of items
        let carouselPosition = -(galleryTrack.offsetWidth / 3);
        let carouselAnimationId = null;
        let isPaused = false;
        const scrollSpeed = 0.5; // Pixels per frame
        
        // Function to create image elements
        const createImageElements = () => {
            let imagesHTML = '';
            
            // Create three sets of the same items for seamless infinite scroll
            for (let i = 0; i < 3; i++) {
                originalItems.forEach((item, index) => {
                    if (!item || !item.src) return;
                    
                    const nftId = item.nftId || 0;
                    const altText = item.alt || `NFT #${nftId + 1}`;
                    const uniqueKey = `${nftId}-${i}`;
                    
                    imagesHTML += `
                        <div class="gallery-item" data-key="${uniqueKey}">
                            <div class="image-container">
                                <img 
                                    src="${item.src}" 
                                    alt="${altText}"
                                    class="enlargeable-image"
                                    data-nft-id="${nftId}"
                                    loading="lazy"
                                    tabindex="0"
                                    role="button"
                                    aria-label="View ${altText} in detail"
                                >
                                <div class="expand-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                    </svg>
                                </div>
                            </div>
                        </div>`;
                });
            }
            
            galleryTrack.innerHTML = imagesHTML;
            
            // Force reflow to ensure styles are applied
            void galleryTrack.offsetWidth;
            
            // Set initial position to the middle set of items
            const firstItem = galleryTrack.querySelector('.gallery-item');
            if (firstItem) {
                const itemWidth = firstItem.offsetWidth + 24; // Include gap
                const itemsPerSet = originalItems.length;
                carouselPosition = -itemWidth * itemsPerSet; // Start at the middle set
                galleryTrack.style.transition = 'none';
                galleryTrack.style.transform = `translate3d(${carouselPosition}px, 0, 0)`;
                
                // Force a reflow
                void galleryTrack.offsetWidth;
                
                // Re-enable transition
                galleryTrack.style.transition = 'transform 0.3s ease-out';
            }
        };

        // Handle infinite scroll animation
        const setupInfiniteScroll = () => {
            if (!galleryTrack) return () => {};
            
            const firstItem = galleryTrack.querySelector('.gallery-item');
            if (!firstItem) return () => {};
            
            const gap = 24; // Gap between items in pixels
            let itemWidth = firstItem.offsetWidth + gap;
            const itemsPerSet = originalItems.length;
            let lastTime = performance.now();
            let animationFrameId;
            let isResizing = false;
            
            const updateCarousel = (position) => {
                galleryTrack.style.willChange = 'transform';
                galleryTrack.style.transform = `translate3d(${position}px, 0, 0)`;
                carouselPosition = position;
            };
            
            const resetPosition = () => {
                // Disable transition for the reset to prevent visual glitch
                galleryTrack.style.transition = 'none';
                carouselPosition = -itemWidth * itemsPerSet;
                updateCarousel(carouselPosition);
                // Force reflow
                void galleryTrack.offsetWidth;
                // Re-enable transition
                galleryTrack.style.transition = 'transform 0.3s ease-out';
            };
            
            const animateScroll = (currentTime) => {
                if (isPaused || isResizing) {
                    lastTime = currentTime;
                    animationFrameId = requestAnimationFrame(animateScroll);
                    return;
                }
                
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                
                // Move the carousel
                carouselPosition -= scrollSpeed * (deltaTime / 16); // Normalize to 60fps
                
                // Reset position when we've scrolled one full set
                if (Math.abs(carouselPosition) >= itemWidth * itemsPerSet * 2) {
                    resetPosition();
                } else {
                    updateCarousel(carouselPosition);
                }
                
                animationFrameId = requestAnimationFrame(animateScroll);
            };
            
            // Handle window resize
            let resizeTimeout;
            const handleResize = () => {
                isResizing = true;
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const newItemWidth = firstItem.offsetWidth + gap;
                    const positionRatio = carouselPosition / (itemWidth * itemsPerSet);
                    itemWidth = newItemWidth;
                    carouselPosition = positionRatio * (itemWidth * itemsPerSet);
                    updateCarousel(carouselPosition);
                    isResizing = false;
                }, 100);
            };
            
            // Set initial position
            carouselPosition = -itemWidth * itemsPerSet;
            updateCarousel(carouselPosition);
            
            // Start the animation after a short delay
            setTimeout(() => {
                animationFrameId = requestAnimationFrame(animateScroll);
            }, 1000);
            
            // Add event listener for window resize
            window.addEventListener('resize', handleResize);
            
            // Cleanup function
            return () => {
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener('resize', handleResize);
            };
        };
        
        // Initialize carousel with drag support
        createImageElements();
        setupInfiniteScroll();
        
        // Drag handling state with improved smoothness
        let isDragging = false;
        let startX = 0;
        let scrollStart = 0;
        let touchStartTime = 0;
        let touchStartX = 0;
        let velocity = 0;
        let lastX = 0;
        let lastTime = 0;
        let dragAnimationId = null;
        const TAP_THRESHOLD = 5; // pixels
        const TAP_TIME_THRESHOLD = 200; // milliseconds
        const MOMENTUM_DECAY = 0.95; // How quickly the momentum slows down
        const MIN_VELOCITY = 0.1; // Minimum velocity before stopping
        
        const applyTransform = (position) => {
            // Use will-change for better performance
            galleryTrack.style.willChange = 'transform';
            // Use transform3d for hardware acceleration
            galleryTrack.style.transform = `translate3d(${position}px, 0, 0)`;
            carouselPosition = position;
        };
        
        const startDrag = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            touchStartX = touch.pageX;
            touchStartTime = Date.now();
            lastX = touch.pageX;
            lastTime = touchStartTime;
            velocity = 0;
            
            // Cancel any ongoing animations
            if (dragAnimationId) {
                cancelAnimationFrame(dragAnimationId);
                dragAnimationId = null;
            }
            
            // Only start dragging if not a tap
            if (!isDragging) {
                isDragging = true;
                galleryTrack.style.cursor = 'grabbing';
                galleryTrack.style.transition = 'none';
                startX = touch.pageX - galleryTrack.offsetLeft;
                scrollStart = carouselPosition;
            }
            
            // Prevent default for touchstart to improve drag behavior
            if (e.cancelable && e.type === 'touchstart') {
                e.preventDefault();
            }
        };
        
        const drag = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches ? e.touches[0] : e;
            const currentX = touch.pageX;
            const currentTime = Date.now();
            
            // Calculate velocity for momentum scrolling
            if (lastTime && lastTime !== currentTime) {
                const deltaX = currentX - lastX;
                const deltaTime = currentTime - lastTime;
                velocity = deltaX / deltaTime * 1.5; // Slightly increase the effect
            }
            
            lastX = currentX;
            lastTime = currentTime;
            
            const x = currentX - galleryTrack.offsetLeft;
            const newPosition = scrollStart + (x - startX) * 1.8; // Slightly reduce the multiplier for better control
            
            applyTransform(newPosition);
            
            // Only prevent default for touchmove when actually dragging
            if (e.cancelable && e.type === 'touchmove' && isDragging) {
                e.preventDefault();
            }
        };
        
        const momentumScroll = (startPos, velocity) => {
            let pos = startPos;
            let v = velocity * 15; // Adjust the multiplier for desired momentum strength
            
            const animate = () => {
                // Apply deceleration
                v *= MOMENTUM_DECAY;
                pos += v;
                
                // Apply the new position
                applyTransform(pos);
                
                // Continue animation if we still have velocity
                if (Math.abs(v) > MIN_VELOCITY) {
                    dragAnimationId = requestAnimationFrame(animate);
                } else {
                    // Just stop the animation when momentum is gone
                    dragAnimationId = null;
                }
            };
            
            // Cancel any existing animation
            if (dragAnimationId) {
                cancelAnimationFrame(dragAnimationId);
            }
            
            // Start the animation
            dragAnimationId = requestAnimationFrame(animate);
        };
        
        const endDrag = (e) => {
            if (!isDragging) return;
            
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const touchEndX = touch.pageX;
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            const touchDistance = Math.abs(touchEndX - touchStartX);
            
            // Determine if this was a tap (short time and small distance)
            const isTap = touchDuration < TAP_TIME_THRESHOLD && touchDistance < TAP_THRESHOLD;
            
            // Reset dragging state
            isDragging = false;
            galleryTrack.style.cursor = 'grab';
            
            // Apply momentum if it was a swipe, otherwise just stop where it is
            if (!isTap && Math.abs(velocity) > 0.5) {
                momentumScroll(carouselPosition, velocity);
            }
            
            // If it was a tap, find and trigger a click on the element
            if (isTap && e.type.includes('touch')) {
                // Small delay to ensure the click isn't blocked by the touchend event
                setTimeout(() => {
                    const touchPoint = e.changedTouches ? e.changedTouches[0] : e;
                    const target = document.elementFromPoint(touchPoint.clientX, touchPoint.clientY);
                    if (target) {
                        const clickable = target.closest('.gallery-item, .expand-icon, .gallery-item img');
                        if (clickable) {
                            // Use a proper click event instead of .click() for better compatibility
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            clickable.dispatchEvent(clickEvent);
                        }
                    }
                }, 10);
            }
        };
        
        // Unified event listeners with better touch handling
        const events = {
            start: ['mousedown', 'touchstart'],
            move: ['mousemove', 'touchmove'],
            end: ['mouseup', 'touchend', 'touchcancel']
        };
        
        // Add event listeners with proper passive handling
        galleryTrack.addEventListener('mousedown', startDrag);
        galleryTrack.addEventListener('touchstart', startDrag, { passive: false });
        
        // Add move/end listeners to window for better drag handling
        window.addEventListener('mousemove', drag);
        window.addEventListener('touchmove', drag, { passive: false });
        
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
        window.addEventListener('touchcancel', endDrag);
        
        // Prevent image drag
        galleryTrack.querySelectorAll('img').forEach(img => {
            img.addEventListener('dragstart', e => e.preventDefault());
        });
        
        // Set up click events for the modal
        const setupModalHandlers = () => {
            // Handle clicks on gallery images and expand icons
            const handleImageClick = (img, nftId) => {
                if (!img) return;
                
                // Use the main modal's open function
                const modal = document.getElementById('imageModal');
                const modalImg = document.getElementById('enlargedImage');
                
                if (modal && modalImg) {
                    // Use the main modal's open function
                    window.openModal(img, nftId);
                    
                    // Handle scroll events on the modal
                    const scrollHandler = (e) => {
                        if (!modal) return;
                        
                        const modalContent = modal.querySelector('.modal-container');
                        if (!modalContent) return;
                        
                        const isTouchEvent = e.type.includes('touch');
                        const isScrollable = modalContent.scrollHeight > modalContent.clientHeight;
                        
                        // Allow scrolling within the modal content
                        if (isScrollable) {
                            const isAtTop = modalContent.scrollTop === 0 && e.deltaY < 0;
                            const isAtBottom = Math.ceil(modalContent.scrollTop + modalContent.clientHeight) >= modalContent.scrollHeight - 1 && e.deltaY > 0;
                            
                            if (isAtTop || isAtBottom) {
                                e.preventDefault();
                            }
                        }
                        
                        // Prevent default for touch events outside modal content
                        if (isTouchEvent && !modalContent.contains(e.target)) {
                            e.preventDefault();
                        }
                    };
                    
                    window.addEventListener('wheel', scrollHandler, { passive: false });
                    window.addEventListener('touchmove', scrollHandler, { passive: false });
                    modal._scrollHandler = scrollHandler;
                    
                    // Close modal when clicking outside the image
                    const closeOnOutsideClick = (e) => {
                        if (e.target === modal) {
                            window.closeModal();
                        }
                    };
                    modal.addEventListener('click', closeOnOutsideClick);
                    modal._closeHandler = closeOnOutsideClick;
                }
            };
            
            // Handle about section expand icon
            const aboutExpandIcon = document.querySelector('.about-image .expand-icon');
            if (aboutExpandIcon) {
                const aboutImage = aboutExpandIcon.closest('.image-container')?.querySelector('img');
                if (aboutImage) {
                    aboutExpandIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleImageClick(aboutImage, 0); // Use 0 as the ID for the about image
                    });
                }
            }

            // Handle clicks on gallery items
            const galleryItems = document.querySelectorAll('.gallery-item');
            galleryItems.forEach(item => {
                const img = item.querySelector('img');
                const expandIcon = item.querySelector('.expand-icon');
                if (!img) return;
                
                const nftId = parseInt(img.getAttribute('data-nft-id') || '0', 10);
                
                // Create a single handler function for this item
                const handleItemClick = (e) => {
                    e.stopPropagation();
                    handleImageClick(img, nftId);
                };
                
                // Handle click on the image directly
                if (img) {
                    img.addEventListener('click', handleItemClick);
                    
                    // Make image keyboard accessible
                    img.setAttribute('role', 'button');
                    img.setAttribute('tabindex', '0');
                    img.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleItemClick(e);
                        }
                    });
                }
                
                // Handle click on the expand icon
                if (expandIcon) {
                    expandIcon.addEventListener('click', handleItemClick);
                    
                    // Store references for cleanup
                    item._clickHandler = handleItemClick;
                }
            });
            
            // Return cleanup function
            const cleanup = () => {
                // Cleanup event listeners for gallery items
                galleryItems.forEach(item => {
                    const img = item.querySelector('img');
                    const expandIcon = item.querySelector('.expand-icon');

                    // Clean up image click handlers
                    if (img && item._clickHandler) {
                        img.removeEventListener('click', item._clickHandler);
                        img.removeEventListener('keydown', item._clickHandler);
                        delete item._clickHandler;
                    }

                    // Clean up expand icon click handler
                    if (expandIcon && item._clickHandler) {
                        expandIcon.removeEventListener('click', item._clickHandler);
                        delete item._clickHandler;
                    }
                });
                
                // Clean up about section expand icon
                const aboutExpandIcon = document.querySelector('.about-image .expand-icon');
                if (aboutExpandIcon && aboutExpandIcon._clickHandler) {
                    aboutExpandIcon.removeEventListener('click', aboutExpandIcon._clickHandler);
                    delete aboutExpandIcon._clickHandler;
                }
            };
            
            return cleanup;
        };
        
        // Initialize modal handlers
        const cleanupModalHandlers = setupModalHandlers();
        
        // Cleanup function for the carousel
        return () => {
            // Clean up window event listeners
            window.removeEventListener('mousemove', drag);
            window.removeEventListener('touchmove', drag);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchend', endDrag);
            window.removeEventListener('touchcancel', endDrag);
            
            // Clean up gallery track event listeners
            if (galleryTrack) {
                galleryTrack.removeEventListener('mousedown', startDrag);
                galleryTrack.removeEventListener('touchstart', startDrag);
                galleryTrack.querySelectorAll('img').forEach(img => {
                    img.removeEventListener('dragstart', e => e.preventDefault());
                });
            }
            
            // Clean up animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            // Call existing cleanup functions
            cleanupCarousel?.();
            cleanupModalHandlers?.();
        };
    } catch (error) {
        console.error('Error initializing gallery carousel:', error);
        return () => {}; // Return empty cleanup function
    }
};

// Function to update modal with NFT data
function updateModalData(nftId) {
    try {
        const nftData = getNftById(nftId);
        if (!nftData) {
            console.error('No NFT data found for ID:', nftId);
            return null;
        }
        
        // Update modal title and description
        const titleElement = document.querySelector('.modal-image .image-title');
        if (titleElement) {
            titleElement.textContent = nftData.title || `Quants NFT #${String(nftId + 1).padStart(4, '0')}`;
        }
        
        // Update traits in the modal
        const traitsContainer = document.getElementById('nftTraits');
        if (!traitsContainer) {
            console.error('Traits container not found');
            return null;
        }
        
        // Clear existing traits
        traitsContainer.innerHTML = '';
        
        if (!nftData.traits || !Array.isArray(nftData.traits)) {
            console.error('Invalid or missing traits data');
            return null;
        }
        
        // Add traits with animations
        nftData.traits.forEach((trait, index) => {
            if (!trait || !trait.name || !trait.value) return;
            
            const traitElement = document.createElement('div');
            traitElement.className = 'trait-item';
            traitElement.style.opacity = '0';
            traitElement.style.transform = 'translateY(10px)';
            traitElement.style.transition = `opacity 0.3s ease ${index * 0.05}s, transform 0.3s ease ${index * 0.05}s`;
            
            // Format the trait value for display
            const formattedValue = String(trait.value || '')
                .split(/[-_]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Set the class and display text for the rarity badge
            let rarityClass = trait.rarity ? trait.rarity.toLowerCase() : 'unknown';
            let displayText = trait.rarity || 'Unknown';
            
            // Special handling for OneOfOne rarity
            if (trait.rarity === 'OneOfOne') {
                displayText = '1/1';
            }
            
            traitElement.innerHTML = `
                <span class="trait-name">${trait.name}</span>
                <span class="trait-value">${formattedValue}</span>
                <span class="trait-rarity ${rarityClass}">${displayText}</span>
            `;
            
            traitsContainer.appendChild(traitElement);
            
            // Animate in
            setTimeout(() => {
                traitElement.style.opacity = '1';
                traitElement.style.transform = 'translateY(0)';
            }, 50);
        });
        
        return nftData;
    } catch (error) {
        console.error('Error updating modal data:', error);
        return null;
    }
}

function initModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('enlargedImage');
    let closeBtn = document.querySelector('.close-modal');
    
    if (!modal || !modalImg) {
        console.warn('Modal elements not found');
        return () => {}; // Return empty cleanup function
    }
    
    // Create close button if it doesn't exist
    if (!closeBtn) {
        closeBtn = document.createElement('span');
        closeBtn.className = 'close-modal';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.innerHTML = '&times;';
        modal.insertBefore(closeBtn, modal.firstChild);
    }
    
    // Function to handle image click
    function handleImageClick(e) {
        const imgElement = e.currentTarget;
        const nftId = parseInt(imgElement.getAttribute('data-nft-id') || '0');
        openModal(imgElement, nftId);
    }

    // Function to reset modal scroll positions
    function resetModalScroll() {
        if (!modal) return;
        
        // Get all scrollable elements in the modal
        const scrollContainers = [
            modal,
            modal.querySelector('.modal-container'),
            modal.querySelector('.modal-content'),
            modal.querySelector('.modal-details')
        ].filter(Boolean);
        
        // Reset scroll for each container
        scrollContainers.forEach(container => {
            if (container) {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            }
        });
    }

    // Make openModal available globally for carousel to use
    window.openModal = function(imgElement, nftId = 0) {
        if (!modal || !modalImg) return;

        try {
            // Hide the modal first
            modal.style.display = 'none';
            
            // Reset scroll position immediately
            resetModalScroll();
            
            // Set the image source
            modalImg.src = imgElement.src || '';
            modalImg.alt = imgElement.alt || 'NFT Preview';
            
            // Show the modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Force reflow
            void modal.offsetHeight;
            
            // Add show class for animation
            setTimeout(() => {
                modal.classList.add('show');
                
                // Update NFT data
                updateModalData(nftId);
                
                // Reset scroll after content loads
                setTimeout(resetModalScroll, 100);
            }, 10);
        } catch (error) {
            console.error('Error opening modal:', error);
        }
    }

    // Make closeModal available globally for carousel to use
    window.closeModal = function() {
        if (!modal) return;

        try {
            // Clean up scroll event listeners
            if (modal._scrollHandler) {
                window.removeEventListener('wheel', modal._scrollHandler);
                window.removeEventListener('touchmove', modal._scrollHandler);
                delete modal._scrollHandler;
            }

            // Remove show class for animation
            modal.classList.remove('show');
            
            // Reset scroll position
            resetModalScroll();
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                modal.style.display = 'none';
                
                // Restore body scroll
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
                
                // Remove any inline styles that might be locking scroll
                document.documentElement.style.overflow = '';
                document.documentElement.style.position = '';
                
                // Force reflow/repaint
                void document.body.offsetHeight;
                
                // Final scroll reset
                resetModalScroll();
                
                // Dispatch custom event to notify other components
                window.dispatchEvent(new Event('modalClosed'));
            }, 300);
        } catch (error) {
            console.error('Error closing modal:', error);
            // Ensure we always restore scroll even if there's an error
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.documentElement.style.overflow = '';
        }
    }
    
    // Add event listeners to all current enlargeable images
    function setupImageListeners() {
        const images = document.querySelectorAll('.enlargeable-image');
        
        images.forEach((img, index) => {
            if (!img.hasAttribute('data-listener-attached')) {
                // Add click handler
                img.addEventListener('click', handleImageClick);
                
                // Add keyboard support
                img.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleImageClick({ currentTarget: img });
                    }
                });
                
                // Set accessibility attributes
                img.setAttribute('tabindex', '0');
                img.setAttribute('role', 'button');
                img.setAttribute('aria-label', `View NFT #${index + 1} in detail`);
                img.setAttribute('data-listener-attached', 'true');
            }
        });
        
        return images;
    }
    
    // Set up initial event listeners
    setupImageListeners();
    
    // Close modal when clicking the close button
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside the content
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Return cleanup function
    return () => {
        // Cleanup event listeners
        closeBtn.removeEventListener('click', closeModal);
        modal.removeEventListener('click', closeModal);
        document.removeEventListener('keydown', handleEscape);
        
        // Cleanup scroll-related event listeners
        if (modal._scrollHandler) {
            window.removeEventListener('wheel', modal._scrollHandler);
            window.removeEventListener('touchmove', modal._scrollHandler);
            delete modal._scrollHandler;
        }
        
        // Reset any scroll-related styles
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.position = '';
        
        // Cleanup image click handlers
        const images = document.querySelectorAll('.enlargeable-image');
        images.forEach(img => {
            img.removeEventListener('click', handleImageClick);
            img.removeEventListener('keydown', handleImageClick);
        });
    };
}

// Global audio context for better mobile support
let audioContext = null;
let audioSource = null;
let isPlaying = false;

// Initialize music player functionality
const initMusicPlayer = () => {
    const audio = domCache.bgMusic;
    const toggle = domCache.musicToggle;
    
    if (!audio || !toggle) {
        console.error('Music player elements not found');
        return () => {}; // Return empty cleanup function
    }
    
    // Set initial state
    audio.volume = 0.5;
    audio.loop = true;  // Enable looping for continuous playback
    audio.preload = 'auto';
    audio.load(); // Force load the audio file
    console.log('Audio element initialized:', audio);
    let audioContextInitialized = false;
    
    // Add error handling
    const handleAudioError = (e) => {
        console.error('Audio error:', e);
        if (audio.error) {
            console.error('Error details:', {
                code: audio.error.code,
                message: audio.error.message
            });
        } else {
            console.error('Audio source:', audio.currentSrc);
            console.error('Network state:', audio.networkState);
            console.error('Ready state:', audio.readyState);
        }
        // Reset button state on error
        toggle.classList.remove('playing');
        isPlaying = false;
        
        // Show error to user
        toggle.title = 'Error loading audio. Click to retry.';
        toggle.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    };
    
    // Handle song end
    const handleSongEnd = () => {
        toggle.classList.remove('playing');
        isPlaying = false;
        audio.currentTime = 0; // Reset to beginning when song ends
    };
    
    // Add event listeners
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('ended', handleSongEnd);
    
    // Toggle playback when the music button is clicked
    const togglePlayback = async () => {
        try {
            // Initialize audio context on first interaction if needed
            if (!audioContextInitialized) {
                // Create audio context if it doesn't exist
                if (!audioContext) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    audioContext = new AudioContext();
                    const source = audioContext.createMediaElementSource(audio);
                    source.connect(audioContext.destination);
                }
                
                // Resume audio context if suspended (required by autoplay policies)
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                audioContextInitialized = true;
            }
            
            // Toggle playback
            if (audio.paused) {
                // Always reset to beginning when starting playback
                audio.currentTime = 0;
                try {
                    await audio.play();
                    isPlaying = true;
                    toggle.classList.add('playing');
                    console.log('Audio playback started from beginning');
                } catch (error) {
                    console.error('Playback error:', error);
                    toggle.classList.remove('playing');
                    isPlaying = false;
                }
            } else {
                audio.pause();
                audio.currentTime = 0; // Reset when pausing too
                isPlaying = false;
                toggle.classList.remove('playing');
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            // Show error to user if needed
            toggle.classList.remove('playing');
        }
    };
    
    // Add click event to the toggle button
    const handleToggleClick = () => {
        togglePlayback().catch(console.error);
    };
    
    toggle.addEventListener('click', handleToggleClick);
    
    // Make toggle keyboard accessible
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlayback().catch(console.error);
        }
    };
    
    toggle.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
        toggle.removeEventListener('click', handleToggleClick);
        toggle.removeEventListener('keydown', handleKeyDown);
        audio.removeEventListener('error', handleAudioError);
        audio.removeEventListener('ended', handleSongEnd);
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        if (audioContext) {
            audioContext.close().catch(console.error);
        }
    };
};

/**
 * Sets up scroll-based animations for the page
 */
function setupScrollAnimations() {
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            // If element is in viewport
            if (elementTop < windowHeight * 0.85) {
                element.classList.add('animate');
            }
        });
    };
    
    // Initial check on page load
    animateOnScroll();
    
    // Add scroll event listener with debounce for better performance
    window.addEventListener('scroll', debounce(animateOnScroll, 50));
    
    // Return cleanup function
    return () => {
        window.removeEventListener('scroll', debounce(animateOnScroll, 50));
    };
}

const initApp = () => {
    try {
        console.log('Initializing app...');
        
        // Initialize components
        const cleanupHeroVideo = initHeroVideo();
        const cleanupModal = initModal();
        const cleanupGalleryCarousel = initGalleryCarousel();
        // Initialize music player and get cleanup function
        const cleanupMusicPlayer = initMusicPlayer();
        preloadImages();
        
        // Set up scroll animations
        setupScrollAnimations();
        
        // Initial scroll check and setup scroll listener
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        
        // Return cleanup function
        return () => {
            try {
                // Cleanup components
                cleanupHeroVideo();
                cleanupModal();
                cleanupGalleryCarousel();
                cleanupMusicPlayer();
                window.removeEventListener('scroll', handleScroll);
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        };
    } catch (error) {
        console.error('Error during app initialization:', error);
        throw error; // Re-throw to be caught by the outer error handler
    }
};

// Error handling wrapper
const initAppSafely = () => {
    try {
        return initApp();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
};

// Function to update viewport height variable for mobile browsers
function updateViewportHeight() {
    // First we get the viewport height and we multiply it by 1% to get a value for a vh unit
    const vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Update viewport height on load and resize
updateViewportHeight();
window.addEventListener('resize', updateViewportHeight);
window.addEventListener('orientationchange', updateViewportHeight);

// Start the application when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppSafely);
} else {
    initAppSafely();
}

// Add error event listener for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});
