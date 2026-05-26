/* 
  School of Character (SoC) - Pojok Hope
  SPA ROUTER
*/

class AppRouter {
  constructor() {
    this.routes = {
      'home': 'page-home',
      'program': 'page-program',
      'tentang': 'page-tentang',
      'pendaftaran': 'page-pendaftaran',
      'login': 'page-login'
    };
    this.defaultRoute = 'home';
    
    // Bind event listener
    window.addEventListener('hashchange', () => this.handleRouting());
  }

  init() {
    // Initial routing call
    this.handleRouting();
  }

  handleRouting() {
    const hash = window.location.hash.substring(2); // Remove '#/'
    const targetRoute = this.routes[hash] ? hash : this.defaultRoute;
    
    this.navigateTo(targetRoute);
  }

  navigateTo(routeKey) {
    const targetId = this.routes[routeKey];
    
    // 1. Swap page containers
    Object.values(this.routes).forEach(id => {
      const pageEl = document.getElementById(id);
      if (pageEl) {
        pageEl.classList.remove('active');
      }
    });

    const activePage = document.getElementById(targetId);
    if (activePage) {
      activePage.classList.add('active');
    }

    // 2. Update navigation active state
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#/${routeKey}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // 3. Close hamburger mobile menu if open
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && hamburger.classList.contains('active')) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    }

    // 4. Scroll to top of the page smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

// Export router instance
window.appRouter = new AppRouter();
