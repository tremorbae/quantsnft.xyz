document.addEventListener('DOMContentLoaded', () => {
    // Hero Video Load Handler
    window.addEventListener('load', function() {
        const heroVideo = document.getElementById('heroVideo');
        if (heroVideo) {
            // Wait for the video to be ready to play
            heroVideo.addEventListener('loadeddata', function() {
                // Small delay to ensure styles are applied
                setTimeout(() => {
                    heroVideo.play().catch(e => console.log('Autoplay prevented:', e));
                }, 100);
            });
            
            // Preload the video
            heroVideo.load();
        }
    });

    // Lightbox functionality
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');
    let currentImageIndex = 0;
    let images = [];

    // Lightbox functions
    const openLightbox = (imgElement) => {
        lightboxImg.src = imgElement.src;
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
        images = Array.from(document.querySelectorAll('.gallery-item img, .about-image img'));
        currentImageIndex = images.indexOf(imgElement);
    };

    const closeLightbox = () => {
        lightbox.classList.remove('show');
        document.body.style.overflow = 'auto';
    };

    const showNextImage = () => {
        if (images.length > 0) {
            currentImageIndex = (currentImageIndex + 1) % images.length;
            lightboxImg.src = images[currentImageIndex].src;
        }
    };

    const showPrevImage = () => {
        if (images.length > 0) {
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
            lightboxImg.src = images[currentImageIndex].src;
        }
    };

    // Event listeners for gallery and about images
    document.querySelectorAll('.gallery-item img, .about-image img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            openLightbox(img);
        });
    });

    // Lightbox controls
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === closeBtn) {
            closeLightbox();
        }
    });

    closeBtn.addEventListener('click', closeLightbox);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('show')) return;
        
        switch(e.key) {
            case 'Escape': closeLightbox(); break;
            case 'ArrowRight': showNextImage(); break;
            case 'ArrowLeft': showPrevImage(); break;
        }
    });

    // Mint button handler
    const mintButton = document.querySelector('.mint-button');
    mintButton?.addEventListener('click', (e) => {
        const btn = e.target;
        btn.classList.add('clicked');
        // Remove the class after animation completes
        setTimeout(() => {
            btn.classList.remove('clicked');
        }, 300);
        // Allow the default link behavior
    });
    
    // Gallery item hover effects
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        item.style.transition = 'all 0.3s ease';
        
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'perspective(1000px) translateZ(20px) scale(1.05)';
            item.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
            item.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Music Player
    const bgMusic = document.getElementById('bgMusic');
    const musicToggle = document.getElementById('musicToggle');
    let isMusicPlaying = false;

    // Toggle music play/pause
    if (musicToggle) {
        musicToggle.addEventListener('click', () => {
            if (isMusicPlaying) {
                bgMusic.pause();
                musicToggle.classList.remove('playing');
            } else {
                const playPromise = bgMusic.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Playback failed:', error);
                    });
                }
                musicToggle.classList.add('playing');
                bgMusic.volume = 0.5; // Set volume to 50%
            }
            isMusicPlaying = !isMusicPlaying;
        });

        // Change music icon color on scroll
        const musicIcon = musicToggle.querySelector('i');
        
        if (musicIcon) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    musicToggle.classList.add('scrolled');
                } else {
                    musicToggle.classList.remove('scrolled');
                }
            });
        }
    }

    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            hero.style.backgroundPositionY = scrollPosition * 0.5 + 'px';
        });
    }
});
