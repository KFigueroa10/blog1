(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const fb = () => (window && window.db && window.firestore) ? window.firestore : null;
  let USING_FB = false;

  function getPostId(){
    const m = location.pathname.match(/post-([\w-]+)\.html$/);
    return m ? m[1] : 'home';
  }

  function storageKey(){
    return `comments:${getPostId()}`;
  }

  function loadComments(){
    try {
      return JSON.parse(localStorage.getItem(storageKey())||'[]');
    } catch(e){
      return [];
    }
  }

  function loadCommentsFor(postId){
    try {
      return JSON.parse(localStorage.getItem(`comments:${postId}`)||'[]');
    } catch(e){
      return [];
    }
  }

  function saveComments(list){
    localStorage.setItem(storageKey(), JSON.stringify(list));
  }

  function renderComments(external){
    const container = $('#comments-list');
    if(!container) return;
    const comments = external || loadComments();
    container.innerHTML = '';
    if(comments.length === 0){
      container.innerHTML = '<li class="comment-empty">No hay comentarios aún. ¡Sé el primero en comentar!</li>';
      updateAvgStars([]);
      return;
    }
    comments.forEach((c, idx) => {
      if(typeof c.likes !== 'number') c.likes = 0; // compatibilidad
      const li = document.createElement('li');
      li.className = 'comment-item';
      const initials = (c.name||'A').trim().charAt(0).toUpperCase();
      const handle = (c.name||'anon').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,12) || 'anon';
      li.innerHTML = `
        <div class="tweet-avatar" style="background: var(--teal);">${initials}</div>
        <div class="tweet-body">
          <div class="tweet-meta">
            <span class="comment-author">${escapeHTML(c.name || 'Anónimo')}</span>
            <span class="comment-handle">@${escapeHTML(handle)}</span>
            <span class="comment-date">· ${new Date(c.ts).toLocaleString()}</span>
          </div>
          ${renderStars(c.rating)}
          <p class="comment-text">${escapeHTML(c.text)}</p>
          <div class="tweet-actions" aria-label="Acciones del comentario">
            <button class="like-btn" data-idx="${idx}" ${c.id?`data-id="${c.id}"`:''} title="Me gusta">❤ <span class="count">${c.likes}</span></button>
          </div>
        </div>
      `;
      container.appendChild(li);
    });
    updateAvgStars(comments);
  }

  function renderHomeCardComments(){
    $$('.card-comments').forEach(card => {
      const postId = card.getAttribute('data-post-id');
      const list = loadCommentsFor(postId);
      card.innerHTML = '';
      if(list.length === 0){
        card.innerHTML = '<div class="card-comment-item">Sin comentarios todavía.</div>';
        return;
      }
      list.slice(0,5).forEach(c => {
        const div = document.createElement('div');
        div.className = 'card-comment-item';
        div.textContent = (c.name ? c.name+': ' : '') + c.text;
        card.appendChild(div);
      });
    });
  }

  function onCardFormSubmit(e){
    e.preventDefault();
    const form = e.currentTarget;
    const postId = form.getAttribute('data-post-id');
    const name = form.querySelector('.card-comment-name')?.value.trim();
    const text = form.querySelector('.card-comment-text')?.value.trim();
    if(!text) return;
    const list = loadCommentsFor(postId);
    list.unshift({ name, text, ts: Date.now() });
    localStorage.setItem(`comments:${postId}`, JSON.stringify(list));
    form.reset();
    renderHomeCardComments();
  }

  function escapeHTML(s){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  async function onSubmit(e){
    e.preventDefault();
    const name = $('#comment-name')?.value.trim();
    const text = $('#comment-text')?.value.trim();
    const rating = Number(($('input[name="rating"]:checked')||{}).value||0);
    if(!text){
      $('#comment-error').textContent = 'Escribe un comentario.';
      return;
    }
    if(getPostId()==='home' && (!rating || rating<1 || rating>5)){
      $('#comment-error').textContent = 'Selecciona una calificación en estrellas.';
      return;
    }
    $('#comment-error').textContent = '';
    if(USING_FB){
      try {
        const { collection, addDoc, serverTimestamp } = fb();
        await addDoc(collection(window.db, 'comments'), {
          postId: getPostId(),
          name: name || null,
          text,
          rating,
          likes: 0,
          ts: Date.now(),
          createdAt: serverTimestamp()
        });
      } catch(err){
        console.warn('Error guardando en Firebase, usando localStorage', err);
        const list = loadComments();
        list.unshift({ name, text, rating, likes: 0, ts: Date.now() });
        saveComments(list);
      }
    } else {
      const list = loadComments();
      list.unshift({ name, text, rating, likes: 0, ts: Date.now() });
      saveComments(list);
    }
    ($('#comment-text')).value = '';
    if(getPostId()==='home'){
      // limpiar selección de rating
      const checked = $('input[name="rating"]:checked');
      if(checked) checked.checked = false;
    }
    if(!USING_FB) renderComments();
  }

  function renderStars(value){
    if(!value || value<1) return '';
    const full = '★'.repeat(Math.min(5, value));
    const empty = '☆'.repeat(5 - Math.min(5, value));
    return `<div class="stars" aria-label="${value} estrellas">${full}${empty}</div>`;
  }

  function updateAvgStars(comments){
    const avgEl = $('#avg-stars');
    if(!avgEl) return;
    if(!comments.length){
      avgEl.textContent = '';
      return;
    }
    const sum = comments.reduce((s,c)=> s + (Number(c.rating)||0), 0);
    const avg = Math.round((sum / comments.length) * 10)/10; // 1 decimal
    const stars = Math.round(sum / comments.length);
    avgEl.innerHTML = `${renderStars(stars)} <span style="margin-left:.5rem; color: var(--teal);">Promedio: ${avg} / 5 (${comments.length})</span>`;
  }

  function init(){
    const form = $('#comment-form');
    if(form){
      form.addEventListener('submit', onSubmit);
    }
    // Firebase realtime si está disponible
    USING_FB = !!fb();
    if(USING_FB){
      try{
        const { collection, onSnapshot, query, where, orderBy } = fb();
        const q = query(collection(window.db,'comments'), where('postId','==', getPostId()), orderBy('ts','desc'));
        onSnapshot(q, (snap)=>{
          const arr = [];
          snap.forEach(docSnap=>{
            const d = docSnap.data();
            arr.push({ id: docSnap.id, name: d.name, text: d.text, rating: d.rating, likes: d.likes||0, ts: d.ts || Date.now() });
          });
          renderComments(arr);
        });
      } catch(err){
        USING_FB = false;
        renderComments();
      }
    } else {
      // Render en páginas de post (si no hay Firebase)
      renderComments();
    }
    // Render en tarjetas del home
    renderHomeCardComments();
    // Bind formularios de tarjetas en index
    $$('.card-comment-form').forEach(f=>{
      f.addEventListener('submit', onCardFormSubmit);
    });

    // Like por comentario (delegación)
    const list = $('#comments-list');
    if(list){
      list.addEventListener('click', async (ev)=>{
        const btn = ev.target.closest('.like-btn');
        if(!btn) return;
        if(USING_FB && btn.dataset.id){
          try{
            const { doc, updateDoc, increment } = fb();
            await updateDoc(doc(window.db,'comments', btn.dataset.id), { likes: increment(1) });
            return;
          } catch(err){ console.warn('Error like Firebase', err); }
        }
        const idx = Number(btn.getAttribute('data-idx'));
        const comments = loadComments();
        if(!Number.isInteger(idx) || !comments[idx]) return;
        comments[idx].likes = (comments[idx].likes||0) + 1;
        saveComments(comments);
        renderComments();
      });
    }

    // Borrar todos
    const clearBtn = $('#clear-comments');
    if(clearBtn && getPostId()==='home'){
      clearBtn.addEventListener('click', async ()=>{
        if(USING_FB){
          try{
            const { collection, query, where, getDocs, writeBatch } = fb();
            const q = query(collection(window.db,'comments'), where('postId','==','home'));
            const snap = await getDocs(q);
            const batch = writeBatch(window.db);
            snap.forEach(d=> batch.delete(d.ref));
            await batch.commit();
            return;
          } catch(err){ console.warn('Error borrar todos Firebase', err); }
        }
        localStorage.setItem(storageKey(), '[]');
        renderComments();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
