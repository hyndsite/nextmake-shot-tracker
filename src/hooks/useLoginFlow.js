import { useRef, useState } from "react"
import { hasActiveSession, sendMagicLink } from "../lib/auth"

export function useLoginFlow({ onSuccess } = {}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | sending | sent | err
  const [msg, setMsg] = useState("")
  const inputRef = useRef(null)

  async function sendLink(e) {
    e.preventDefault()
    setStatus("sending")
    setMsg("")

    try {
      await sendMagicLink(email)
      setStatus("sent")
      setMsg("Magic link sent. Check your email, then return here.")
      setEmail("")
      inputRef.current?.blur()
    } catch (error) {
      setStatus("err")
      setMsg(error.message)
    }
  }

  async function checkSession() {
    try {
      const hasSession = await hasActiveSession()

      if (hasSession) {
        onSuccess?.()
        return
      }

      setStatus("err")
      setMsg("No active session yet. Open the email link, then tap this again.")
    } catch (_error) {
      setStatus("err")
      setMsg("No active session yet. Open the email link, then tap this again.")
    }
  }

  return {
    email,
    msg,
    inputRef,
    sendLink,
    setEmail,
    status,
    checkSession,
  }
}
