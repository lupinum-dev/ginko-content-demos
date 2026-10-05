import { writeFile, readFile } from 'node:fs/promises'
const origin=process.env.BASE_URL??'https://ginko-demo-blog.vercel.app'
const date=new Date().toISOString().slice(0,10)
const measurements=[]
for(const path of ['/','/blog/note-01']){
 const requests=[]
 for(let i=0;i<20;i++){
  const start=performance.now();const response=await fetch(new URL(path,origin));const body=await response.arrayBuffer()
  requests.push({milliseconds:performance.now()-start,status:response.status,bytes:body.byteLength,vercelCache:response.headers.get('x-vercel-cache')})
 }
 const sorted=requests.map(r=>r.milliseconds).sort((a,b)=>a-b)
 const valid=requests.every(r=>r.status===200)
 measurements.push({url:new URL(path,origin).href,requests,p50:valid?sorted[9]:null,p95:valid?sorted[18]:null})
}
const evidence=`results/evidence/blog/${date}-latency.json`
const result={method:'20 sequential GETs to each unchanged URL, full body consumed; after production suite, no additional warmup; nearest-rank p50/p95; milliseconds include network.',measurements}
await writeFile(new URL('../'+evidence,import.meta.url),JSON.stringify(result,null,2)+'\n')
const path=new URL(`../results/${date}-blog.json`,import.meta.url)
const claims=JSON.parse(await readFile(path,'utf8'));claims[0].budgets.latency={evidence,measurements:measurements.map(({url,p50,p95})=>({url,p50,p95}))}
await writeFile(path,JSON.stringify(claims,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
if(measurements.some(m=>m.p50===null))process.exitCode=1
