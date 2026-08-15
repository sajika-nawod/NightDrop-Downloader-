const $=x=>document.getElementById(x);let data=null;
$("preview").onclick=async()=>{
 const url=$("url").value.trim(); if(!url)return $("error").textContent="Paste a URL first.";
 $("preview").disabled=true;$("preview").textContent="Reading…";$("error").textContent="";
 try{const r=await fetch("/api/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
 data=await r.json();if(!r.ok)throw Error(data.error||"Preview failed");
 $("thumb").src=data.thumbnail||"";$("title").textContent=data.title;$("meta").textContent=(data.uploader||"")+" • "+(data.duration?Math.round(data.duration/60)+" min":"");
 const q=$("quality");q.innerHTML="";
 const seen=new Set();(data.formats||[]).forEach(f=>{if(!seen.has(f.height)){seen.add(f.height);let o=document.createElement("option");o.value=f.height;o.textContent=`${f.height}p • ${f.ext.toUpperCase()}`;q.appendChild(o)}});
 let b=document.createElement("option");b.value="best";b.textContent="Best available";q.insertBefore(b,q.firstChild);q.value="best";
 $("previewBox").classList.remove("hidden");
 }catch(e){$("error").textContent=e.message}finally{$("preview").disabled=false;$("preview").textContent="Preview ✦"}
};
$("go").onclick=async()=>{
 if(!data)return; const r=await fetch("/api/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:$("url").value.trim(),format:$("format").value,quality:$("quality").value})});
 const j=await r.json();if(!r.ok)return $("error").textContent=j.error||"Could not start";
 sessionStorage.setItem("job",j.id);sessionStorage.setItem("title",data.title);location.href="/download.html";
};