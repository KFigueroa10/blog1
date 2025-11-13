(function(){
  // Crear modal una sola vez
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-content">
      <button class="video-modal-close" aria-label="Cerrar">×</button>
      <iframe src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      <div class="video-modal-error" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.6);color:#fff;font-weight:600;">
        No se pudo cargar el video aquí.
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const iframe = modal.querySelector('iframe');
  const errorBox = modal.querySelector('.video-modal-error');
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
      iframe.src = '';
      errorBox.style.display = 'flex';
      modal.classList.add('active');
      return;
    }

    // Intentar reproducir en modal
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.classList.add('active');

    // Fallback: si no carga en 3s, mostrar overlay de error
    let loaded = false;
    iframe.addEventListener('load', ()=>{ loaded = true; }, {once: true});
    setTimeout(()=>{
      if(!loaded){ errorBox.style.display = 'flex'; }
    }, 3000);
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.classList.contains('active')){
      closeModal();
    }
  });
})();
