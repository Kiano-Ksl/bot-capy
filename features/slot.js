// File: features/slot.js
const { randomUUID } = require('crypto');

const SLOT_HTML = `<style>
*{box-sizing:border-box;margin:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
html,body{width:100%}
body{background:radial-gradient(circle at 50% 8%,#1d6a50,#0f4938 48%,#07291f);padding:9px;color:#e9e3bc;overflow-y:auto}
.machine{width:100%;max-width:420px;margin:0 auto;position:relative;padding:10px 12px 12px;border:4px solid #b9954d;border-radius:26px;background:linear-gradient(110deg,#061e17,#1b644b 12%,#0b382a 30%,#15543f 55%,#092f24 80%,#28775a 94%,#071f18);box-shadow:inset 0 0 0 3px #163f31,inset 0 16px 26px #73d2a31f,0 8px 0 #041a13,0 16px 24px #000c}
.lights{height:9px;margin:0 12px 7px;border:2px solid #123d2f;border-radius:8px;background:repeating-radial-gradient(circle at 6px 50%,#dfffdc 0 2px,#82c878 3px 5px,#164936 6px 12px);box-shadow:0 0 12px #67b881;animation:blink .55s steps(2) infinite}
.title{padding:10px 4px 8px;border:3px solid #b99a54;border-radius:16px 16px 11px 11px;color:#e9e3bc;background:radial-gradient(ellipse at 50% 0,#2b8a6c,#11513f 60%,#082a24);text-align:center;font:900 25px Impact,'Arial Black',sans-serif;letter-spacing:1px;text-shadow:0 3px #193f31,0 0 12px #7ddc8a66}
.jack{width:76%;margin:6px auto;padding:3px;border:2px solid #a98c4d;border-radius:9px;color:#ded7ad;background:linear-gradient(#245d48,#0b3025);text-align:center;font:bold 10px monospace;letter-spacing:1px}
.stats{display:flex;margin:0 2px 8px;padding:5px;border:2px solid #537d64;border-radius:9px;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 9px #000}
.stats div{flex:1;border-right:1px solid #416452;text-align:center;font:bold 10px monospace;color:#91b59f}
.stats div:last-child{border:0}
.stats b{display:block;margin-top:2px;font-size:15px;color:#e3dfbb;text-shadow:0 0 6px #62a77d}
.frame{padding:8px;border:4px solid #315c47;border-radius:16px;background:linear-gradient(90deg,#09271e,#b49a59 5%,#174936 10%,#174936 90%,#b49a59 95%,#09271e);box-shadow:inset 0 0 0 3px #071b15,0 4px 0 #09271e,0 8px 15px #000a}
#reels{display:grid;grid-template-columns:repeat(5,1fr);height:192px;overflow:hidden;border:3px solid #071c15;border-radius:10px;background:#071a14;box-shadow:inset 0 12px 18px #0009,inset 0 -12px 18px #0009}
.reel{position:relative;overflow:hidden;background:linear-gradient(90deg,#8f6a39,#fff8d8 17%,#fffdf0 50%,#f0dfad 82%,#79552c);box-shadow:inset 7px 0 8px #573b1d55,inset -7px 0 8px #573b1d55}
.reel+.reel{border-left:2px solid #573512}
.reel:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(#1c0d05bb 0,transparent 18%,transparent 80%,#281208cc 100%)}
.strip{will-change:transform}
.strip.moving{filter:blur(1.4px) saturate(1.2)}
.sym{height:64px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #9f7e4f44;font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif;font-size:40px;line-height:1;text-shadow:0 3px 0 #72101822,0 0 4px #fff}
.s7{font:900 42px Impact,'Arial Black',sans-serif;color:#ef1726;-webkit-text-stroke:2px #850815;text-shadow:0 3px #5d0509,0 0 5px #fff}
.sbar{width:52px;height:22px;display:flex;align-items:center;justify-content:center;font:900 12px 'Arial Black',sans-serif;color:#fff4c4;background:radial-gradient(ellipse at center,#e22d35 0,#6f0910 55%,transparent 56%);text-shadow:0 2px #401010}
.win{animation:winP .5s ease-in-out infinite;background:radial-gradient(circle,#fff8a9,#ffae00 55%,transparent 72%)}
@keyframes winP{50%{transform:scale(1.09);filter:brightness(1.4)}}
.message{height:34px;margin:9px 2px 7px;display:flex;align-items:center;justify-content:center;border:2px solid #537d64;border-radius:8px;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 8px #000;color:#e3dfbb;font:bold 14px monospace;text-shadow:0 0 7px #62a77d;text-align:center}
.console{display:grid;grid-template-columns:46px 1fr 1.8fr;gap:8px;margin:0 3px;padding:9px 8px 11px;border:3px solid #416a53;border-radius:9px 9px 16px 16px;background:linear-gradient(#9c8c59,#315d48 37%,#0a2e22 39%,#123e2f);box-shadow:inset 0 2px #d9c992,0 6px #061d16,0 12px 18px #0009}
button{height:53px;border:3px solid #0b2e22;border-radius:13px;color:#fff;font-weight:900;cursor:pointer;touch-action:manipulation}
.mute{background:linear-gradient(#d9b04a,#8a6d08 55%,#5d4805);box-shadow:0 4px #3d2f02;font-size:18px}
.bet{background:linear-gradient(#4f9a77,#216348 53%,#103d2d);box-shadow:inset 0 4px 4px #d8ffe055,0 4px #092a20}
.spin{background:radial-gradient(circle at 50% 32%,#a8d96f,#4b8d46 47%,#1e542f 76%);box-shadow:inset 0 4px 5px #e8ffd488,0 4px #12351e,0 0 14px #79b85c88;font-size:18px;text-shadow:0 2px #06420d}
button:disabled{filter:saturate(.4) brightness(.75)}
.tray{width:48%;height:17px;margin:13px auto 0;border:4px solid #244d3a;border-radius:4px 4px 10px 10px;background:#061a13;box-shadow:inset 0 6px 9px #000,0 3px #897945}
.winner .lights{animation-duration:.16s}
.winner .title{animation:winP .6s ease-in-out 2}
.over{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border-radius:20px;background:#03150eec;color:#ffe5a0;text-align:center}
.over.off{display:none}
.over h2{margin:0 0 6px;font-size:24px;color:#ff3449;text-shadow:0 0 12px #f00}
.over p{font-size:13px;color:#cfe6c8}
.over button{padding:0 22px;height:40px;background:#ffd15a;color:#271204}
@keyframes blink{50%{filter:brightness(1.7)}}

/* --- EFEK ANIMASI HOORAY MENANG --- */
.hooray{position:absolute;inset:0;z-index:15;display:flex;align-items:center;justify-content:center;background:#000a;flex-direction:column;pointer-events:none;border-radius:26px}
.hooray.off{display:none}
.hooray h1{font:900 42px Impact,'Arial Black';color:#ffe854;-webkit-text-stroke:2px #b56200;text-shadow:0 0 25px #ff9d00,0 10px 0 #854200;margin:0 0 10px;animation:hop .4s ease-in-out infinite alternate}
@keyframes hop{0%{transform:translateY(5px) scale(0.9)}100%{transform:translateY(-5px) scale(1.1)}}
.coins{font-size:38px;animation:shower .4s linear infinite alternate;text-shadow:0 5px 15px #000}
@keyframes shower{0%{transform:translateY(-10px) scale(1)}100%{transform:translateY(10px) scale(1.1)}}
</style>

<div class="machine" id="machine">
<div class="lights"></div>
<div class="title">FRUIT BONANZA</div>
<div class="jack">JACKPOT · 10.000 CREDITS</div>
<div class="stats"><div>CREDITS<b id="credits">500</b></div><div>BET<b id="betValue">10</b></div><div>BEST WIN<b id="best">0</b></div></div>
<div class="frame"><div id="reels"></div></div>
<div id="message" class="message">SPIN UNTUK MULAI</div>
<div class="console"><button id="mute" class="mute">🔊</button><button id="bet" class="bet">BET +</button><button id="spin" class="spin">🎰 SPIN</button></div>
<div class="tray"></div>
<div id="over" class="over off"><h2>GAME OVER</h2><p>Credits habis!<br>Best Win: <b id="finalBest">0</b></p><button id="restart">MAIN LAGI</button></div>

<!-- LAYAR HOORAY -->
<div id="hooray" class="hooray off"><h1> HOORAY! </h1><div class="coins"> 🪙 💰 🪙 </div></div>
</div>

<script>
(function(){
var AC=null,MUTED=false;
try{MUTED=localStorage.getItem('slot_mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(AC.state==='suspended'){try{AC.resume()}catch(e){}}return AC;}
function tone(f,dur,type,vol,delay,slide){var a=ac();if(!a||MUTED)return;try{var t=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);g.gain.setValueAtTime(vol||.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.03);}catch(e){}}
function sndClick(){tone(650,.05,'square',.08)}
function sndStop(c){tone(150+c*35,.09,'square',.16)}
function sndWin(){[660,880,1100].forEach(function(f,i){tone(f,.14,'triangle',.14,i*.09)})}
function sndJackpot(){[523,659,784,1046,784,1046,1318,1568].forEach(function(f,i){tone(f,.16,'square',.12,i*.11);tone(f/2,.16,'triangle',.08,i*.11)})}
function sndLose(){tone(220,.2,'sawtooth',.07);tone(160,.3,'sawtooth',.07,.14)}
function sndOver(){[392,330,262,196].forEach(function(f,i){tone(f,.3,'triangle',.12,i*.28)})}

/* SUARA KOIN BARU (CH-CHING) */
function sndCoin(delay){var a=ac();if(!a||MUTED)return;try{var t=a.currentTime+(delay||0);var o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(2400,t);g.gain.setValueAtTime(.15,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.3);var o2=a.createOscillator(),g2=a.createGain();o2.type='triangle';o2.frequency.setValueAtTime(3200,t);o2.frequency.exponentialRampToValueAtTime(1200,t+.1);g2.gain.setValueAtTime(.1,t);g2.gain.exponentialRampToValueAtTime(.0001,t+.1);o2.connect(g2);g2.connect(a.destination);o2.start(t);o2.stop(t+.1)}catch(e){}}

document.addEventListener('pointerdown',function(){ac()},{once:true});
document.addEventListener('visibilitychange', function(){if(document.hidden && AC){try{AC.suspend();}catch(e){}}});

var SY=['🍒','🍋','🔔','💎','7','BAR'],WT=[30,25,18,12,8,7],PAY=[2,3,5,8,12,20],SH=64,reels=[],C=document.getElementById('credits'),BV=document.getElementById('betValue'),BS=document.getElementById('best'),MSG=document.getElementById('message'),SP=document.getElementById('spin'),BT=document.getElementById('bet'),MUB=document.getElementById('mute'),OV=document.getElementById('over'),FB=document.getElementById('finalBest'),MCH=document.getElementById('machine'),HOO=document.getElementById('hooray');
var credits=500,bet=10,best=0,busy=false,spinInt;

function pick(){var n=Math.random()*100,s=0;for(var i=0;i<6;i++){s+=WT[i];if(n<s)return i}return 0}
function symHTML(v){return '<div class="sym">'+(v===4?'<i class="s7">7</i>':v===5?'<i class="sbar">BAR</i>':SY[v])+'</div>'}
function ui(){C.textContent=credits;BV.textContent=bet;BS.textContent=best}
function msg(t){MSG.textContent=t}
function clearWin(){for(var c=0;c<5;c++){var r=reels[c];if(r.stopIdx){for(var i=r.stopIdx;i<r.vals.length;i++){r.strip.children[i].classList.remove('win')}}}}

/* LOGIKA SPIN BARU (6 DETIK, STOP TIAP 1 DETIK) */
function spin(){
  if(busy||credits<bet)return;
  busy=true;clearWin();credits-=bet;ui();SP.disabled=true;BT.disabled=true;msg('SPINNING...');
  
  /* Suara mesin muter yang dilooping */
  clearInterval(spinInt);
  spinInt=setInterval(function(){tone(180,.05,'square',.05)},100);
  
  for(var c=0;c<5;c++){
    var r=reels[c],vals=[],h='';
    var dur=2+(c*1); /* Durasi: Reel 0=2s, 1=3s, 2=4s, 3=5s, 4=6s */
    var len=Math.floor(dur*12)+3; /* Bikin jumlah iconnya banyak biar spinnya lama */
    r.stopIdx=len-3;
    
    for(var i=0;i<len;i++)vals.push(pick());
    for(var j=0;j<len;j++)h+=symHTML(vals[j]);
    
    r.vals=vals;r.strip.innerHTML=h;r.strip.style.transition='none';r.strip.style.transform='translateY(0)';r.strip.offsetHeight;
    r.strip.classList.add('moving');
    r.strip.style.transition='transform '+dur+'s cubic-bezier(.12,.75,.25,1)';
    r.strip.style.transform='translateY(-'+(r.stopIdx*SH)+'px)';
    
    (function(st,d,ix){
      setTimeout(function(){
        st.classList.remove('moving');sndStop(ix);
        if(ix===4){
          clearInterval(spinInt);
          setTimeout(evalBoard,400); /* Tunggu reel terakhir stop, baru cek hasil */
        }
      },d*1000);
    })(r.strip,dur,c);
  }
}

function evalBoard(){
  var grid=[];
  for(var c=0;c<5;c++) grid.push(reels[c].vals.slice(reels[c].stopIdx));
  
  var lines=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]],total=0,wc=[];
  lines.forEach(function(p){
    var a=grid[0][p[0]],n=1;
    for(var x=1;x<5&&grid[x][p[x]]===a;x++)n++;
    if(n>=3){
      total+=Math.floor(bet*PAY[a]*(n===3?1:n===4?2:5));
      for(var i=0;i<n;i++)wc.push([i,p[i]]);
    }
  });
  
  if(total){
    credits+=total;best=Math.max(best,total);
    wc.forEach(function(w){reels[w[0]].strip.children[reels[w[0]].stopIdx+w[1]].classList.add('win')});
    msg(total>=bet*20?'🎰 JACKPOT +'+total:'✨ MENANG +'+total);
    
    /* MUNCULIN LAYAR HOORAY */
    MCH.classList.add('winner');
    HOO.classList.remove('off');
    setTimeout(function(){
      MCH.classList.remove('winner');
      HOO.classList.add('off');
    }, 2800);
    
    /* MUNCULIN SUARA KOIN */
    var coinsAmount=Math.min(15,Math.ceil(total/bet)+2);
    for(var ci=0;ci<coinsAmount;ci++) sndCoin(ci*0.15);
    
    if(total>=bet*20)sndJackpot();
  }else{
    msg('💦 BELUM HOKI!');sndLose();
  }
  
  SP.disabled=false;BT.disabled=false;busy=false;ui();
  if(credits<10)setTimeout(gameover,900);else if(bet>credits){bet=10;ui()}
}

function gameover(){FB.textContent=best;OV.className='over';sndOver()}
BT.onclick=function(){if(busy)return;sndClick();bet=bet===10?20:bet===20?50:10;if(bet>credits)bet=10;ui()};SP.onclick=spin;MUB.onclick=function(){MUTED=!MUTED;MUB.textContent=MUTED?'🔇':'🔊';try{localStorage.setItem('slot_mute',MUTED?'1':'0')}catch(e){}if(!MUTED)sndClick()};if(MUTED)MUB.textContent='🔇';
document.getElementById('restart').onclick=function(){sndClick();credits=500;bet=10;best=0;busy=false;OV.className='over off';HOO.className='hooray off';msg('SPIN UNTUK MULAI');SP.disabled=false;BT.disabled=false;clearWin();ui()};

/* Initialize Reels */
var box=document.getElementById('reels');
for(var c=0;c<5;c++){
  var d=document.createElement('div');d.className='reel';
  var s=document.createElement('div');s.className='strip';
  d.appendChild(s);box.appendChild(d);
  var h='', len=10, stopIdx=7;
  for(var i=0;i<len;i++) h+=symHTML(pick());
  s.innerHTML=h;
  s.style.transform='translateY(-'+(stopIdx*SH)+'px)';
  var initVals=[]; for(var x=0;x<len;x++)initVals.push(pick());
  reels.push({strip:s,vals:initVals,stopIdx:stopIdx});
}
ui();
})();
</script>`;

async function kirimSlot(sock, chatId) {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: randomUUID(),
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: SLOT_HTML,
                    trusted_sources: []
                }
            }
        }]
    })).toString('base64');

    return sock.relayMessage(chatId, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: randomUUID()
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: '🎰 FRUIT BONANZA' }],
                    unifiedResponse: { data },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
}

async function handleSlot(sock, msg, from) {
    try {
        await kirimSlot(sock, from);
    } catch (e) {
        console.error('[SLOT]', e?.stack || e);
        await sock.sendMessage(from, { text: '❌ Gagal mengirim game: ' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handleSlot;