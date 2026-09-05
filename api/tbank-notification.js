const crypto=require('crypto');
const {sb}=require('./_lib');

const PRICES={'690':69000,'1490':149000,'2990':299000};

function env(name){
  const v=process.env[name];
  if(!v)throw new Error(`Missing environment variable: ${name}`);
  return v.trim();
}
function expectedToken(body){
  const values={};
  Object.entries(body||{}).forEach(([k,v])=>{
    if(k==='Token'||v===null||v===undefined||typeof v==='object')return;
    values[k]=v;
  });
  values.Password=env('TBANK_PASSWORD');
  const str=Object.keys(values).sort().map(k=>String(values[k])).join('');
  return crypto.createHash('sha256').update(str,'utf8').digest('hex');
}
function safeEqual(a,b){
  try{
    const x=Buffer.from(String(a||''),'hex'), y=Buffer.from(String(b||''),'hex');
    return x.length===y.length && x.length>0 && crypto.timingSafeEqual(x,y);
  }catch{return false}
}
function add30Days(current){
  const now=new Date();
  let start=now;
  if(current){
    const d=new Date(current);
    if(!Number.isNaN(d.getTime()) && d.getTime()>now.getTime())start=d;
  }
  const next=new Date(start);
  next.setDate(next.getDate()+30);
  return next.toISOString();
}
function ok(res){res.status(200).type('text/plain').send('OK')}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).send('POST only');

  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};

    if(String(body.TerminalKey||'')!==env('TBANK_TERMINAL_KEY')){
      console.error('TBANK_NOTIFICATION_BAD_TERMINAL');
      return res.status(403).send('Invalid terminal');
    }
    if(!safeEqual(body.Token,expectedToken(body))){
      console.error('TBANK_NOTIFICATION_BAD_TOKEN',body.PaymentId,body.Status);
      return res.status(403).send('Invalid token');
    }

    const match=String(body.OrderId||'').match(/^NI-(\d+)-(690|1490|2990)-([a-z0-9]+)$/i);
    if(!match)return ok(res); // Не наш заказ — подтверждаем получение, ничего не меняем.

    const telegramId=match[1], tariff=match[2];
    const expectedAmount=PRICES[tariff];
    const paymentId=String(body.PaymentId||'');

    if(Number(body.Amount)!==expectedAmount){
      console.error('TBANK_AMOUNT_MISMATCH',body.OrderId,body.Amount,expectedAmount);
      return ok(res);
    }

    const profiles=await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*`);
    const profile=profiles?.[0];
    if(!profile)return ok(res);

    // T-Банк может присылать несколько статусов. Доступ выдаём только по CONFIRMED.
    if(body.Success===true && String(body.Status)==='CONFIRMED'){
      if(String(profile.last_payment_id||'')===`confirmed:${paymentId}`){
        return ok(res); // повторный webhook — не продлеваем второй раз
      }
      if(String(profile.last_payment_id||'')!==`pending:${paymentId}`){
        console.error('TBANK_PAYMENT_ID_MISMATCH',profile.last_payment_id,paymentId);
        return ok(res);
      }

      await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}`,{
        method:'PATCH',
        prefer:'return=minimal',
        body:{
          tariff_code:tariff,
          subscription_active:true,
          subscription_until:add30Days(profile.subscription_until),
          auto_renew:false,
          last_payment_id:`confirmed:${paymentId}`,
          updated_at:new Date().toISOString()
        }
      });
      console.log('TBANK_PAYMENT_CONFIRMED',telegramId,tariff,paymentId);
      return ok(res);
    }

    // Неуспешный новый платёж не отключает уже оплаченный действующий период.
    if(['REJECTED','CANCELED','DEADLINE_EXPIRED','REVERSED'].includes(String(body.Status))){
      if(String(profile.last_payment_id||'')===`pending:${paymentId}`){
        await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}`,{
          method:'PATCH',
          prefer:'return=minimal',
          body:{
            last_payment_id:`failed:${paymentId}`,
            updated_at:new Date().toISOString()
          }
        });
      }
    }

    return ok(res);
  }catch(e){
    console.error('TBANK_NOTIFICATION_ERROR',e);
    // При внутренней ошибке не отвечаем OK, чтобы банк повторил уведомление.
    return res.status(500).type('text/plain').send('ERROR');
  }
};