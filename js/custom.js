document.addEventListener('click', function(e) {
  const heart = document.createElement('span');
  heart.innerText = '❤️';
  heart.style.cssText = 'position:fixed;left:'+e.clientX+'px;top:'+(e.clientY-20)+'px;color:#ff6b6b;font-size:22px;pointer-events:none;transition:all 1s;z-index:9999;';
  document.body.appendChild(heart);
  setTimeout(() => {
    heart.style.opacity = '0';
    heart.style.transform = 'translateY(-40px)';
    setTimeout(() => heart.remove(), 1000);
  }, 50);
});
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  nav.style.boxShadow = window.scrollY > 50 ? '0 2px 10px rgba(0,0,0,0.1)' : 'none';
});