/* 
  School of Character (SoC) - Pojok Hope
  MAIN ENTRY POINT
*/

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize SPA Router
  if (window.appRouter) {
    window.appRouter.init();
  }

  // 2. Initialize AI Character Assistant Widget
  if (window.aiWidget) {
    window.aiWidget.init();
  }

  // 3. Hamburger Mobile Menu Toggle
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking outside of the navbar
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }

  // 4. Dynamic Navbar styling on scroll
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'var(--color-secondary-dark)';
        navbar.style.padding = '0.5rem 0';
      } else {
        navbar.style.backgroundColor = 'var(--color-secondary)';
        navbar.style.padding = '0';
      }
    });
  }

    // FAQ Accordion Interaction
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (btn) {
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(other => {
          other.classList.remove('active');
          const otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });
        if (!isActive) {
          item.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // 5. Interactive dynamic program card click helper (Redirect to Program tab)
  const homeCards = document.querySelectorAll('.value-card');
  homeCards.forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = '#/program';
    });
  });

  // 6. Filterable Gallery Logic & Dynamic Loading from Settings
  function setupGalleryFilters() {
    const filterBtns = document.querySelectorAll('.gallery-filters .filter-btn');
    const galleryItems = document.querySelectorAll('#home-gallery-grid .gallery-item');

    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');
        const grid = document.getElementById('home-gallery-grid');
        if (grid) {
          if (filterValue !== 'all') {
            grid.classList.add('filtered-category');
          } else {
            grid.classList.remove('filtered-category');
          }
        }

        const currentItems = document.querySelectorAll('#home-gallery-grid .gallery-item');
        currentItems.forEach(item => {
          const category = item.getAttribute('data-category');
          if (filterValue === 'all' || category === filterValue) {
            item.classList.remove('hidden');
            item.classList.remove('animate__animated', 'animate__fadeIn');
            void item.offsetWidth;
            item.classList.add('animate__animated', 'animate__fadeIn');
          } else {
            item.classList.add('hidden');
            item.classList.remove('animate__animated', 'animate__fadeIn');
          }
        });
      };
    });
  }

  async function loadDynamicHomeGallery() {
    const grid = document.getElementById('home-gallery-grid');
    if (!grid) return;

    try {
      const res = await fetch('http://localhost:5000/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.gallery_json) {
          const items = typeof data.gallery_json === 'string' ? JSON.parse(data.gallery_json) : (data.gallery_json || []);
          if (Array.isArray(items) && items.length > 0) {
            grid.innerHTML = items.map(item => `
              <div class="gallery-item" data-category="${item.category || 'karakter'}">
                <img src="${item.image_url}" alt="${item.caption || 'Aktivitas School of Character'}">
                <div class="gallery-caption">${item.caption || ''}</div>
              </div>
            `).join('');
          }
        }
        const sponsorImg = document.getElementById('sponsorship-showcase-img');
        if (sponsorImg) {
          sponsorImg.src = `static/src/assets/ui/sponsorship-photo.jpg?t=${Date.now()}`;
        }
      }
    } catch (e) {
      console.warn('Menggunakan galeri default statis:', e);
    } finally {
      setupGalleryFilters();
    }
  }

  loadDynamicHomeGallery();

  // 7. Scroll-controlled Back to Top Button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }


  // 6b. Mobile-friendly Gallery Lightbox Modal
  function setupGalleryLightbox() {
    const lightboxModal = document.getElementById('gallery-lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeBtn = document.getElementById('lightbox-close-btn');
    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');
    const overlay = document.getElementById('lightbox-overlay');
    const galleryGrid = document.getElementById('home-gallery-grid');

    if (!lightboxModal || !galleryGrid) return;

    let activeItems = [];
    let currentIndex = 0;

    function getVisibleItems() {
      const items = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
      return items.filter(el => !el.classList.contains('hidden'));
    }

    function openLightbox(index) {
      activeItems = getVisibleItems();
      if (!activeItems.length) return;

      currentIndex = (index >= 0 && index < activeItems.length) ? index : 0;
      updateLightboxContent();

      lightboxModal.style.display = 'flex';
      void lightboxModal.offsetWidth;
      lightboxModal.classList.add('active');
      lightboxModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function updateLightboxContent() {
      if (!activeItems.length || currentIndex < 0 || currentIndex >= activeItems.length) return;
      const currentItem = activeItems[currentIndex];
      const img = currentItem.querySelector('img');
      const captionEl = currentItem.querySelector('.gallery-caption');
      const captionText = captionEl ? captionEl.textContent.trim() : (img ? img.alt : '');

      if (img && lightboxImg) {
        lightboxImg.src = img.getAttribute('src') || '';
        lightboxImg.alt = captionText || 'Galeri Foto';
      }
      if (lightboxCaption) {
        lightboxCaption.textContent = captionText;
      }
      if (lightboxCounter) {
        lightboxCounter.textContent = `${currentIndex + 1} / ${activeItems.length}`;
      }
    }

    function closeLightbox() {
      lightboxModal.classList.remove('active');
      lightboxModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!lightboxModal.classList.contains('active')) {
          lightboxModal.style.display = 'none';
        }
      }, 300);
    }

    function showPrev() {
      if (!activeItems.length) return;
      currentIndex = (currentIndex - 1 + activeItems.length) % activeItems.length;
      updateLightboxContent();
    }

    function showNext() {
      if (!activeItems.length) return;
      currentIndex = (currentIndex + 1) % activeItems.length;
      updateLightboxContent();
    }

    // Event delegation on galleryGrid so dynamic loads work automatically
    galleryGrid.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery-item');
      if (!item || item.classList.contains('hidden')) return;

      const items = getVisibleItems();
      const idx = items.indexOf(item);
      openLightbox(idx >= 0 ? idx : 0);
    });

    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (overlay) overlay.onclick = closeLightbox;
    if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); showPrev(); };
    if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); showNext(); };

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!lightboxModal.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      }
    });

    // Touch swipe navigation
    let touchStartX = 0;
    let touchStartY = 0;

    lightboxModal.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    lightboxModal.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            showPrev();
          } else {
            showNext();
          }
        }
      }
    }, { passive: true });
  }

  setupGalleryLightbox();

  // 8. Dynamic Site Location & Settings Loader
  async function loadSiteSettings() {
    try {
      let res;
      try {
        res = await fetch('/api/settings');
      } catch (err) {
        res = await fetch('http://localhost:5000/api/settings');
      }
      if (!res || !res.ok) {
        res = await fetch('http://localhost:5000/api/settings');
      }
      if (!res.ok) return;
      const settings = await res.json();

      // 1. Lokasi & Jam Operasional
      const alamat = settings.alamat_soc || 'Jln Pasar Minggu, Kec Kabila, Desa Dutohe, Gorontalo.';
      const jam = settings.jam_operasional || 'Senin - Sabtu (14:00 - 17:30 WITA)';

      const addrEl = document.getElementById('landing-alamat-text') || document.querySelector('.location-address p');
      if (addrEl) addrEl.textContent = alamat;

      const jamEl = document.getElementById('landing-jam-operasional');
      if (jamEl) jamEl.textContent = `Jam Operasional: ${jam}`;

      const mapIframe = document.getElementById('landing-map-iframe') || document.querySelector('.location-map iframe');
      if (mapIframe) {
        mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(alamat)}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
      }

      const footerAddr = document.getElementById('footer-alamat-text') || document.querySelector('.footer-contact .contact-item .contact-text');
      if (footerAddr) {
        footerAddr.innerHTML = `<strong>Alamat Kami:</strong> ${alamat}`;
      }

      // 2. Mitra & Sponsor (Tab Tentang)
      const mitraGrid = document.getElementById('mitra-logo-grid') || document.querySelector('.mitra-logo-grid');
      if (mitraGrid && settings.sponsors_json) {
        try {
          const rawSponsors = typeof settings.sponsors_json === 'string' ? JSON.parse(settings.sponsors_json) : settings.sponsors_json;
          if (Array.isArray(rawSponsors) && rawSponsors.length > 0) {
            mitraGrid.innerHTML = rawSponsors.map((s, idx) => `
              <a href="${s.url || '#'}" target="_blank" rel="noopener noreferrer" class="mitra-logo-btn" id="mitra-btn-${idx+1}">
                <i class="${s.icon || 'fas fa-handshake'}"></i>
                <span>${s.name || 'Mitra SoC'}</span>
              </a>
            `).join('');
          }
        } catch (e) {
          console.warn('Gagal merender daftar mitra/sponsor:', e);
        }
      }

      // 3. Kontrol Pendaftaran (Tab Pendaftaran)
      const btnSiswa = document.getElementById('portal-btn-siswa') || document.querySelector('.portal-card.card-orange .portal-cta-btn');
      const btnGuru = document.getElementById('portal-btn-guru') || document.querySelector('.portal-card.card-green .portal-cta-btn');
      const btnVolunteer = document.getElementById('portal-btn-volunteer') || document.querySelector('.portal-card.card-teal .portal-cta-btn');

      const applyPortalStatus = (btn, isOpen, targetUrl, activeLabel) => {
        if (!btn) return;
        const open = (isOpen === true || isOpen === 'true' || isOpen === 1 || isOpen === '1');
        if (!open) {
          btn.classList.add('btn-closed');
          btn.setAttribute('href', 'javascript:void(0)');
          btn.setAttribute('aria-disabled', 'true');
          btn.innerHTML = '<i class="fas fa-lock"></i> Pendaftaran Ditutup Sementara';
          btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          };
        } else {
          btn.classList.remove('btn-closed');
          btn.removeAttribute('aria-disabled');
          btn.setAttribute('href', targetUrl || '#');
          btn.innerHTML = `${activeLabel} <i class="fas fa-external-link-alt"></i>`;
          btn.onclick = null;
        }
      };

      applyPortalStatus(btnSiswa, settings.reg_siswa_open, settings.reg_siswa_url, 'Daftar Siswa Baru');
      applyPortalStatus(btnGuru, settings.reg_guru_open, settings.reg_guru_url, 'Lamar Sebagai Guru');
      applyPortalStatus(btnVolunteer, settings.reg_volunteer_open, settings.reg_volunteer_url, 'Daftar Relawan / Volunteer');

    } catch (e) {
      console.warn('Gagal memuat pengaturan lokasi & sistem:', e);
    }
  }
  loadSiteSettings();
});

