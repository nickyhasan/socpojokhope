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

  // 5. Interactive dynamic program card click helper (Redirect to Program tab)
  const homeCards = document.querySelectorAll('.value-card');
  homeCards.forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = '#/program';
    });
  });

  // 6. Filterable Gallery Logic
  const filterBtns = document.querySelectorAll('.gallery-filters .filter-btn');
  const galleryItems = document.querySelectorAll('#home-gallery-grid .gallery-item');
  
  if (filterBtns.length > 0 && galleryItems.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle active class on buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filterValue = btn.getAttribute('data-filter');
        
        galleryItems.forEach(item => {
          const category = item.getAttribute('data-category');
          if (filterValue === 'all' || category === filterValue) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

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

