const express=require("express");
const {spawn}=require("child_process");
const fs=require("fs");
const path=require("path");
const os=require("os");
const crypto=require("crypto");

const app=express(), PORT=process.env.PORT||3000;
const DIR=path.join(os.tmpdir(),"nightdrop-pro");
fs.mkdirSync(DIR,{recursive:true});
app.use(express.json()); app.use(express.static(path.join(__dirname,"public")));

const jobs=new Map();

function yt(args){
  return new Promise((resolve,reject)=>{
    const p=spawn(process.platform==="win32"?"yt-dlp.exe":"yt-dlp",args,{windowsHide:true});
    let out="",err="";
    p.stdout.on("data",d=>out+=d); p.stderr.on("data",d=>err+=d);
    p.on("error",reject); p.on("close",c=>c===0?resolve(out):reject(new Error(err||out)));
  });
}
function clean(s){return String(s||"download").replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").slice(0,180)}

app.post("/api/preview",async(req,res)=>{
  try{
    const url=req.body?.url;
    if(!url||!/^https?:\/\//i.test(url)) return res.status(400).json({error:"Enter a valid URL."});
    const raw=await yt(["--no-playlist","--dump-single-json","--skip-download",url]);
    const d=JSON.parse(raw);
    const formats=(d.formats||[])
      .filter(f=>f.vcodec&&f.vcodec!=="none"&&f.height)
      .map(f=>({id:f.format_id,height:f.height,width:f.width,ext:f.ext,vcodec:f.vcodec,acodec:f.acodec,size:f.filesize||f.filesize_approx||0,fps:f.fps||0}))
      .sort((a,b)=>(b.height-a.height)||(b.width-a.width))
      .filter((x,i,a)=>i===a.findIndex(y=>y.height===x.height));
    res.json({title:d.title,thumbnail:d.thumbnail,duration:d.duration||0,uploader:d.uploader||"",formats});
  }catch(e){res.status(500).json({error:"Could not read video information.",details:e.message.slice(-1000)})}
});

app.post("/api/start",async(req,res)=>{
  const {url,format="mp4",quality="best"}=req.body||{};
  if(!url||!/^https?:\/\//i.test(url)) return res.status(400).json({error:"Invalid URL."});
  if(!["mp4","mp3"].includes(format)) return res.status(400).json({error:"Invalid format."});
  const id=crypto.randomUUID(), out=path.join(DIR,id+"-%(title)s.%(ext)s");
  const args=["--no-playlist","--newline","--progress","--restrict-filenames","-o",out];
  if(format==="mp3"){
    args.push("-x","--audio-format","mp3","--audio-quality","192K");
  }else{
    let q="bestvideo*+bestaudio/best";
    if(quality!=="best") q=`bestvideo[height<=${Number(quality)}]+bestaudio/best[height<=${Number(quality)}]`;
    args.push("-f",q,"--merge-output-format","mp4");
  }
  args.push(url);
  const job={id,status:"starting",percent:0,speed:"—",downloaded:"0 B",eta:"—",file:null,error:null};
  jobs.set(id,job);
  const p=spawn(process.platform==="win32"?"yt-dlp.exe":"yt-dlp",args,{cwd:DIR,windowsHide:true});
  p.stdout.on("data",buf=>{
    const text=buf.toString(); job.raw=(job.raw||"")+text;
    const m=text.match(/\[download\]\s+(\d+(?:\.\d+)?)%.*?of\s+([^\s]+).*?at\s+([^\s]+).*?ETA\s+([^\s]+)/);
    if(m){job.status="downloading";job.percent=Number(m[1]);job.downloaded=m[2];job.speed=m[3];job.eta=m[4];}
    if(/\[ExtractAudio\]/.test(text)) job.status="converting";
    if(/Merging formats/i.test(text)) job.status="merging";
  });
  p.stderr.on("data",buf=>job.raw=(job.raw||"")+buf.toString());
  p.on("error",e=>{job.status="error";job.error="yt-dlp could not start. Install yt-dlp and add it to PATH."});
  p.on("close",code=>{
    if(code!==0){job.status="error";job.error=(job.raw||"Download failed.").slice(-1800);return}
    const found=fs.readdirSync(DIR).filter(f=>f.startsWith(id+"-"));
    if(!found.length){job.status="error";job.error="No output file was found.";return}
    job.file=path.join(DIR,found[0]); job.percent=100; job.status="complete";
  });
  res.json({id});
});

app.get("/api/status/:id",(req,res)=>{
  const j=jobs.get(req.params.id);
  if(!j)return res.status(404).json({error:"Job not found"});
  res.json({...j,raw:undefined});
});

app.get("/api/file/:id",(req,res)=>{
  const j=jobs.get(req.params.id);
  if(!j||j.status!=="complete"||!j.file||!fs.existsSync(j.file))return res.status(404).send("Not ready");
  const name=clean(path.basename(j.file).replace(req.params.id+"-",""));
  res.download(j.file,name,()=>{try{fs.unlinkSync(j.file)}catch{} jobs.delete(req.params.id)});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`NightDrop Pro: http://localhost:${PORT}`));
