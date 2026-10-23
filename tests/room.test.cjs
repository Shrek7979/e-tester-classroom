const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const shared={}; let failNextWrite=false;
const clone=x=>JSON.parse(JSON.stringify(x));
function client(){
 const nodes={},events={},timers=[];
 const make=id=>nodes[id]||(nodes[id]={id,value:'',checked:false,hidden:false,disabled:false,textContent:'',innerHTML:'',dataset:{},classList:{toggle(){}},setAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(type,cb){events[id+':'+type]=cb;}});
 const store=new Map();
 const doc={querySelector:s=>make(s.slice(1)),querySelectorAll:()=>[],addEventListener:(k,cb)=>events['doc:'+k]=cb,activeElement:null};
 const loc={search:'',href:'https://example.test/',pathname:'/',hostname:'example.test'};
 const fetch=async(url,opt={})=>{const keys=new URL(url).pathname.replace(/\.json$/,'').split('/').filter(Boolean).slice(3);let at=shared;for(const k of keys.slice(0,-1))at=at[k]||(at[k]={});const key=keys.at(-1);if(opt.method==='PUT'){if(failNextWrite){failNextWrite=false;throw Error('offline');}at[key]=JSON.parse(opt.body);}const result=key?at[key]:at;return {ok:true,json:async()=>result===undefined?null:clone(result)};};
 const window={EMath:require('../math.js'),FIREBASE_CONFIG:{databaseURL:'https://db.test'}};
 const ctx={window,document:doc,location:loc,history:{replaceState(){}},crypto,URL,URLSearchParams,AbortController,fetch,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval:fn=>{timers.push(fn);return timers.length;},clearInterval(){},console,Blob};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),ctx);
 const click=async(id,dataset={})=>events['doc:click']({target:{closest:()=>({id,dataset,disabled:false})}});
 return {nodes,make,events,timers,click,async submit(){await events['roomForm:submit']({preventDefault(){}})},async poll(){for(const f of timers)await f();}};
}
(async()=>{
 const host=client();await host.click('createOpen');host.make('nickname').value='host';await host.submit();
 const code=Object.keys(shared)[0];assert.match(code,/^[A-F0-9]{6}$/);assert.equal(shared[code].config.n,13);
 const guest=client();await guest.click('joinOpen');guest.make('nickname').value='guest';guest.make('roomCode').value=code;await guest.submit();
 const parts=()=>shared[code].rounds[shared[code].config.epoch].participants;
 assert.equal(Object.keys(parts()).length,2);
 // 실시간 의견: 반응과 한 줄 의견이 진행자에게, 진행자 질문이 참가자에게 전달되고, 비우기가 양쪽에 반영된다
 await guest.click('',{react:'q'});guest.make('talkText').value='왜 1/e에 가까워지나요?';await guest.events['talkForm:submit']({preventDefault(){}});
 assert.equal(guest.make('talkText').value,'');await host.poll();
 assert.match(host.make('talkFeed').innerHTML,/왜 1\/e에 가까워지나요\?/);assert.match(host.make('talkCount').textContent,/❓ 1/);
 host.make('promptText').value='완전불일치 비율을 예상해 보세요';await host.events['promptForm:submit']({preventDefault(){}});await guest.poll();
 assert.match(guest.make('talkPrompt').textContent,/완전불일치 비율을 예상해 보세요/);assert.equal(guest.make('talkHost').hidden,true);assert.equal(host.make('talkHost').hidden,false);
 await host.click('talkClear');await guest.poll();assert.doesNotMatch(guest.make('talkFeed').innerHTML,/1\/e에 가까워지나요/);assert.match(guest.make('talkCount').textContent,/❓ 0/);
 await host.click('',{stage:'1'});await guest.poll();await host.click('',{run:'10'});await guest.click('',{run:'1000'});await host.poll();
 assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),1010);
 await host.click('',{tab:'results'});assert.match(host.make('app').innerHTML,/1,010/);
 await guest.click('retrySave');assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),1010);
 failNextWrite=true;await guest.click('',{run:'10'});assert.match(guest.make('connection').textContent,/전송 대기/);await guest.click('retrySave');assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),1020);
 await host.click('',{stage:'2'});await guest.poll();await guest.click('',{tab:'theory'});assert.match(guest.make('app').innerHTML,/D₄ = 24/);
 await host.events['app:change']({target:{id:'tileCount',value:'4'}});assert.equal(host.make('infoDialog').open,true);assert.equal(shared[code].config.n,13);
 const oldEpoch=shared[code].config.epoch;await host.click('confirmRound');await guest.poll();assert.equal(shared[code].config.n,4);assert.notEqual(shared[code].config.epoch,oldEpoch);assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),0);assert.equal(shared[code].config.stage,0);
 await host.click('',{stage:'1'});await guest.poll();await guest.click('',{run:'10'});assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),10);
 const ps=Object.values(parts());
 assert.equal(ps.reduce((s,p)=>s+p.positionTrials,0),10);
 const positionMatches=ps.reduce((s,p)=>s+Object.values(p.positions||{}).reduce((a,b)=>a+(b||0),0),0);
 const histogramMatches=ps.reduce((s,p)=>s+Object.entries(p.hist||{}).reduce((a,[k,v])=>a+Number(k)*(v||0),0),0);
 assert.equal(positionMatches,histogramMatches);
 await guest.events['app:input']({target:{id:'autoSpeed',value:'150'}});
 await guest.click('autoStart');await guest.click('autoStart');
 await new Promise(r=>setTimeout(r,230));await guest.click('autoStop');
 const afterStop=Object.values(parts()).reduce((s,p)=>s+p.total,0);
 assert.ok(afterStop>=11&&afterStop<=13,'one auto loop despite repeated start');
 await new Promise(r=>setTimeout(r,230));
 assert.equal(Object.values(parts()).reduce((s,p)=>s+p.total,0),afterStop,'stopped loop cannot schedule more trials');
 failNextWrite=true;await guest.click('autoStart');await new Promise(r=>setTimeout(r,40));
 assert.equal(guest.make('autoBar').hidden,true,'auto pauses on failed network write');
 await guest.click('retrySave');
 await guest.click('',{tab:'results'});assert.match(guest.make('app').innerHTML,/타일 번호별 제자리 빈도 그래프/);

 console.log('PASS room create/join, live reactions/comments/host prompt/clear, phase sync, 1010 pooled trials, idempotent resend, offline retry, math reveal, n change confirmation, epoch isolation, per-position counts, auto speed/start/stop and offline auto pause');
})().catch(e=>{console.error(e);process.exitCode=1});
