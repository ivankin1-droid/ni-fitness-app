const crypto=require('crypto');
const {requireSession,sb,json}=require('./_lib');

const PRICES={'690':69000,'1490':149000,'2990':299000};

function env(name){
  const v=process.env[name];
  if(!v)throw new Error(`Missing environment variable: ${name}`);
  return v.trim();
}
function token(payload){
  const values={};
  Object.entries(payload).forEach(([k,v])=>{
    if(k==='Token'||v===null||v===undefined||typeof v==='object')return;
    values[k]=v;
  });
  values.Password=env('TBANK_PASSWORD');
  const str=Object.keys(values).sort().map(k=>String(values[k])).join('');
  return crypto.createHash('sha256').update(str,'utf8').digest('hex');
}
function origin(req){
  const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
  return `${proto}://${req.headers.host}`;
}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req);
    const tariff=String(req.body?.tariff||'');
    const amount=PRICES[tariff];
    if(!amount)return json(res,400,{error:'Неизвестный тариф'});

    const orderId=`NI-${profile.telegram_id}-${tariff}-${Date.now().toString(36)}`;
    const base=origin(req);
    const payload={
      TerminalKey:env('TBANK_TERMINAL_KEY'),
      Amount:amount,
      OrderId:orderId,
      Description:`NI FITNESS подписка ${tariff} ₽ / 30 дней`,
      PayType:'O',
      NotificationURL:`${base}/api/tbank-notification`,
      SuccessURL:`${base}/payment-success.html`,
      FailURL:`${base}/payment-fail.html`
    };
    payload.Token=token(payload);

    const response=await fetch('https://securepay.tinkoff.ru/v2/Init',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>({}));

    if(!response.ok || !data.Success || !data.PaymentURL){
      console.error('TBANK_INIT_ERROR',data);
      return json(res,400,{error:data.Message||data.Details||`Т-Банк: ошибка ${data.ErrorCode||response.status}`});
    }

    await sb(`profiles?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}`,{
      method:'PATCH',
      prefer:'return=minimal',
      body:{
        last_payment_id:`pending:${String(data.PaymentId)}`,
        updated_at:new Date().toISOString()
      }
    });

    return json(res,200,{
      paymentUrl:data.PaymentURL,
      paymentId:String(data.PaymentId),
      orderId
    });
  }catch(e){
    console.error('TBANK_INIT_SERVER_ERROR',e);
    return json(res,400,{error:e.message||'Не удалось создать платёж'});
  }
};