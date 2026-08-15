const id=sessionStorage.getItem("job"), title=sessionStorage.getItem("title")||"Your video";
$("name").textContent=title;
function $(x){return document.getElementById(x)}
async function poll(){
 if(!id)return;
 try{const r=await fetch("/api/status/"+id);const j=await r.json();
  $("pct").textContent=Math.round(j.percent||0)+"%";$("fill").style.width=(j.percent||0)+"%";$("speed").textContent=j.speed||"—";$("sp").textContent=j.speed||"—";$("size").textContent=j.downloaded||"0 B";$("eta").textContent=j.eta||"—";
  if(j.status==="converting"||j.status==="merging")$("state").textContent=j.status==="merging"?"Merging video…":"Converting audio…";
  if(j.status==="complete"){ $("state").textContent="Ready to save!";$("save").classList.remove("hidden");$("save").onclick=()=>location.href="/api/file/"+id; return}
  if(j.status==="error"){$("state").textContent="Download failed";$("err").textContent=j.error||"Unknown error";return}
 }catch(e){$("err").textContent=e.message}
 setTimeout(poll,700);
}poll();