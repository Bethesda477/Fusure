// Mobile menu toggle functionality
// This script can be included in any page with a mobile menu button

document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle("active");
      mobileMenuToggle.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        mobileMenu.classList.contains("active") &&
        !mobileMenu.contains(e.target) &&
        !mobileMenuToggle.contains(e.target)
      ) {
        mobileMenu.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      }
    });

    // Close menu when clicking on a link
    const mobileMenuLinks = mobileMenu.querySelectorAll("a");
    mobileMenuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      });
    });

    // Close menu on window resize if it becomes desktop view
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) {
        mobileMenu.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      }
    });
  }
});

