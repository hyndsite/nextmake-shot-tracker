// src/lib/sync-hooks.js
import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import { syncAll } from "./sync"

export function useAutoSync(){
  const [status, setStatus] = useState("idle") // idle | syncing | ok | err
  useEffect(()=>{
    let timer
    async function run(){
      try{
        setStatus("syncing")
        await syncAll()
        setStatus("ok")
      }catch(e){
        setStatus("err")
        console.warn("sync error", e)
      }
    }
    function maybeSync(){ if(navigator.onLine) run() }
    maybeSync()
    window.addEventListener("online", maybeSync)
    // Supabase auth state → try sync
    const { data: sub } = supabase.auth.onAuthStateChange(() => maybeSync())
    // periodic
    timer = setInterval(maybeSync, 60_000)
    return ()=>{ window.removeEventListener("online", maybeSync); sub?.subscription?.unsubscribe?.(); clearInterval(timer) }
  },[])
  return status
}
