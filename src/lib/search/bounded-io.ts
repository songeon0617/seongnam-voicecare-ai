import "server-only";
export async function abortable<T>(operation:Promise<T>,signal:AbortSignal):Promise<T>{
  if(signal.aborted)throw new Error("timeout");
  let cancel:()=>void=()=>{};
  const stopped=new Promise<never>((_resolve,reject)=>{cancel=()=>reject(new Error("timeout"));signal.addEventListener("abort",cancel,{once:true});});
  try{return await Promise.race([operation,stopped]);}finally{signal.removeEventListener("abort",cancel);}
}
export async function boundedResponseText(response:Response,signal:AbortSignal,maxBytes=300_000){
  const reader=response.body?.getReader();if(!reader)throw new Error("invalid_output");
  const decoder=new TextDecoder();let bytes=0,text="";
  try{
    while(true){const {done,value}=await abortable(reader.read(),signal);if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw new Error("invalid_output");text+=decoder.decode(value,{stream:true});}
    return text+decoder.decode();
  }finally{void reader.cancel().catch(()=>{});}
}
