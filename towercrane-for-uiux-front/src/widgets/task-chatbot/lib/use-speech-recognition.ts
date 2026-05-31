import { useState, useEffect, useRef } from 'react'

/**
 * Web Speech API(브라우저 내장 STT) 커스텀 훅.
 * 콜백을 ref로 유지해 렌더마다 SpeechRecognition 인스턴스가 재생성되는 것을 막는다.
 */
export function useSpeechRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'ko-KR'
    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      if (text) onResultRef.current(text)
    }
    recognitionRef.current = rec

    return () => rec.abort?.()
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) recognitionRef.current.start()
  }
  const stopListening = () => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop()
  }

  return {
    isListening,
    startListening,
    stopListening,
    isSupported: !!recognitionRef.current,
  }
}
