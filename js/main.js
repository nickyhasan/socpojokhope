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
});
