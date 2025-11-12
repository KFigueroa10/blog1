(function(){
  // Crear modal una sola vez
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-content">
      <button class="video-modal-close" aria-label="Cerrar">×</button>
      <iframe src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  `;
  document.body.appendChild(modal);

  const iframe = modal.querySelector('iframe');
  const closeBtn = modal.querySelector('.video-modal-close');

  // Cerrar modal
  function closeModal(){
    modal.classList.remove('active');
    iframe.src = '';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{
    if(e.target === modal) closeModal();
  });

  // Abrir modal al hacer clic en video-link
  document.addEventListener('click', (e)=>{
    const link = e.target.closest('.video-link');
    if(!link) return;
    e.preventDefault();
    
    const href = link.getAttribute('href');
    const match = href.match(/youtu\.be\/([A-Za-z0-9_-]+)|youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/);
    const videoId = match ? (match[1] || match[2]) : null;
    
    if(!videoId){
      window.open(href, '_blank');
      return;
    }

    // Intentar reproducir en modal
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.classList.add('active');

    // Fallback: si no carga en 3s, abrir en YouTube
    let loaded = false;
    iframe.addEventListener('load', ()=>{ loaded = true; }, {once: true});
    setTimeout(()=>{
      if(!loaded){
        closeModal();
        window.open(href, '_blank');
      }
    }, 3000);
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.classList.contains('active')){
      closeModal();
    }
  });
})();
