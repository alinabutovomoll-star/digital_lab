(() => {
 const video=document.getElementById('hero-video'),button=document.getElementById('video-toggle'),hero=document.querySelector('.glass-hero'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let enabled=!reduced.matches,inView=true,frame=0,replay=0;
 function fade(){frame=0;if(video.paused||video.ended)return;const t=video.currentTime,d=video.duration;const opacity=Number.isFinite(d)?Math.min(1,t/.5,Math.max(0,(d-t)/.5)):Math.min(1,t/.5);video.style.opacity=String(opacity);frame=requestAnimationFrame(fade)}
 function label(){button?.setAttribute('aria-pressed',String(!enabled));if(button)button.textContent=enabled?'Пауза видео Ⅱ':'Включить видео ▷';hero.classList.toggle('motion-paused',!enabled)}
 function halt(){video.pause();cancelAnimationFrame(frame);frame=0;clearTimeout(replay)}
 async function play(){if(!enabled||!inView||document.hidden||reduced.matches)return;try{await video.play()}catch{enabled=false;label()}}
 video.addEventListener('playing',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fade)});
 video.addEventListener('ended',()=>{video.style.opacity='0';cancelAnimationFrame(frame);replay=setTimeout(()=>{video.currentTime=0;play()},100)});
 video.addEventListener('error',()=>{enabled=false;video.style.opacity='0';label()});
 button?.addEventListener('click',()=>{enabled=!enabled;label();if(enabled)play();else halt()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();else play()});
 reduced.addEventListener('change',()=>{enabled=!reduced.matches;label();if(enabled)play();else{halt();video.style.opacity='0'}});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)play();else halt()},{threshold:0}).observe(hero);
 label();video.muted=true;play();
})();
