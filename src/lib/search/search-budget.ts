import "server-only";
/** Deliberately local to one process. Reservations are not refunded after provider errors. */
export function createSearchBudget(now:()=>number=Date.now) {
  let day="",requests=0,reservedUsd=0,active=0,lastStart=-Infinity;
  return (configured:number): {allowed:false;reason:"budget_limited"|"rate_limited"}|{allowed:true;release:()=>void} => {
    const current=now(),today=new Date(current).toISOString().slice(0,10);
    if(day!==today&&active===0){day=today;requests=0;reservedUsd=0;}
    if(!Number.isFinite(configured)||configured<=0||requests>=20||reservedUsd+0.15>Math.min(configured,3))return {allowed:false,reason:"budget_limited"};
    if(active>=1||current-lastStart<2000)return {allowed:false,reason:"rate_limited"};
    requests++;reservedUsd+=0.15;active++;lastStart=current;
    let released=false;
    return {allowed:true,release(){if(!released){active--;released=true;}}};
  };
}
export const acquireSearchBudget=createSearchBudget();
