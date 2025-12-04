document.addEventListener('DOMContentLoaded', () => {
    const dropdownButton = document.querySelector('#course-guides-dropdown button');
    const dropdownMenu = document.getElementById('dropdown-menu-courses');
    const dropdownIcon = document.getElementById('dropdown-icon');
  
    if (dropdownButton && dropdownMenu) {
      dropdownButton.addEventListener('click', () => {
        const isExpanded = dropdownButton.getAttribute('aria-expanded') === 'true';
        dropdownMenu.classList.toggle('hidden');
        if (isExpanded) {
          dropdownButton.setAttribute('aria-expanded', 'false');
          dropdownIcon.classList.remove('rotate-180');
        } else {
          dropdownButton.setAttribute('aria-expanded', 'true');
          dropdownIcon.classList.add('rotate-180');
        }
      });
  
      document.addEventListener('click', (event) => {
        if (!dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
          if (!dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
            dropdownButton.setAttribute('aria-expanded', 'false');
            dropdownIcon.classList.remove('rotate-180');
          }
        }
      });
    }
  });
 